import {
    ClickUpApiResponse,
    ClickUpComment,
    ClickUpList,
    ClickUpTask,
    ClickUpTimeEntry,
    ClickUpUser,
} from '@/types/clickup';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { CacheManager } from './cache-manager';
import { RateLimiter } from './rate-limiter';

const CLICKUP_API_BASE = 'https://api.clickup.com/api/v2';

export class ClickUpClient {
  private apiToken: string;
  private rateLimiter: RateLimiter;
  private cache: CacheManager;
  private axiosInstance: AxiosInstance;
  private listId: string;
  private teamId: string;

  constructor(
    apiToken: string,
    listId: string,
    teamId: string
  ) {
    this.apiToken = apiToken;
    this.listId = listId;
    this.teamId = teamId;
    this.rateLimiter = new RateLimiter(90, 60000);
    this.cache = new CacheManager();

    this.axiosInstance = axios.create({
      baseURL: CLICKUP_API_BASE,
      headers: {
        Authorization: apiToken,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  private async makeRequest<T>(
    method: 'get' | 'post' | 'put' | 'delete',
    endpoint: string,
    data?: any,
    useCache: boolean = false,
    cacheKey?: string,
    cacheTtl: number = 600000
  ): Promise<T> {
    await this.rateLimiter.waitIfNeeded();

    if (useCache && cacheKey && method === 'get') {
      const cached = this.cache.get<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const response = await this.axiosInstance.request<T>({
        method,
        url: endpoint,
        data,
      });

      if (useCache && cacheKey && method === 'get' && response.data) {
        this.cache.set(cacheKey, response.data, cacheTtl);
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ err: string; error: string }>;
        if (axiosError.response?.status === 429) {
          await new Promise((resolve) => setTimeout(resolve, 60000));
          return this.makeRequest(method, endpoint, data, useCache, cacheKey, cacheTtl);
        }
        // Preserve the original AxiosError so status codes can be checked
        // Attach status code to error for easier handling downstream
        const errorMessage = axiosError.response?.data?.err ||
          axiosError.response?.data?.error ||
          axiosError.message;
        const enhancedError = new Error(errorMessage) as Error & { status?: number; response?: any };
        enhancedError.status = axiosError.response?.status;
        enhancedError.response = axiosError.response;
        throw enhancedError;
      }
      throw error;
    }
  }

  async getProjects(archived: boolean = false): Promise<ClickUpTask[]> {
    const cacheKey = `projects:${this.listId}:${archived}`;
    const response = await this.makeRequest<ClickUpApiResponse<ClickUpTask>>(
      'get',
      `/list/${this.listId}/task`,
      undefined,
      true,
      cacheKey,
      120000
    );

    return response.tasks || [];
  }

  async getProject(taskId: string): Promise<ClickUpTask> {
    const cacheKey = `project:${taskId}`;
    const response = await this.makeRequest<ClickUpTask>(
      'get',
      `/task/${taskId}`,
      undefined,
      true,
      cacheKey,
      300000
    );

    // ClickUp API returns task directly
    if (response && 'id' in response && 'name' in response) {
      return response;
    }

    throw new Error('Project not found');
  }

  async updateProjectStatus(taskId: string, status: string): Promise<void> {
    await this.makeRequest(
      'put',
      `/task/${taskId}`,
      { status },
      false
    );

    this.cache.invalidatePattern(`project:${taskId}*`);
    this.cache.invalidatePattern('projects:*');
  }

  async assignProjectToUser(taskId: string, userId: string): Promise<void> {
    // ClickUp API: PUT /task/{task_id} with assignees array
    // Format can be either array of IDs or array of objects with id
    // Let's try array of IDs first (simpler format)
    await this.makeRequest(
      'put',
      `/task/${taskId}`,
      { assignees: [userId] },
      false
    );

    this.cache.invalidatePattern(`project:${taskId}*`);
    this.cache.invalidatePattern('projects:*');
  }

  async updateProjectDates(
    taskId: string,
    startDate?: number,
    dueDate?: number
  ): Promise<void> {
    const updates: any = {};
    if (startDate !== undefined) updates.start_date = startDate;
    if (dueDate !== undefined) updates.due_date = dueDate;

    await this.makeRequest(
      'put',
      `/task/${taskId}`,
      updates,
      false
    );

    this.cache.invalidatePattern(`project:${taskId}*`);
    this.cache.invalidatePattern('projects:*');
  }

  async updateProjectField(
    taskId: string,
    fieldId: string,
    value: string | number | null
  ): Promise<void> {
    try {
      // ClickUp API expects the value in a specific format
      // For date fields, it expects milliseconds timestamp
      // For other fields, pass the value as-is
      // Handle null values (for clearing fields)
      if (value === null) {
        // For null values, we might need to send an empty string or handle differently
        // depending on ClickUp's API requirements
        value = '';
      }
      let payloadValue: any = value;
      
      // If value is a string that looks like a timestamp (long number), convert to number
      if (typeof value === 'string' && !isNaN(parseInt(value)) && value.length > 10) {
        payloadValue = parseInt(value);
      }
      
      // Ensure numbers are actually numbers, not strings
      if (typeof value === 'string' && !isNaN(parseFloat(value)) && value.trim() !== '') {
        const parsed = parseFloat(value);
        // Only convert if it's a valid number (not NaN)
        if (!isNaN(parsed)) {
          payloadValue = parsed;
        }
      }

      // ClickUp API endpoint format: POST /task/{task_id}/field/{field_id}
      // According to ClickUp API docs, custom fields are updated using POST, not PUT
      const endpoint = `/task/${taskId}/field/${fieldId}`;
      const payload = { value: payloadValue };

      console.log('Updating ClickUp field:', {
        endpoint,
        fullUrl: `${CLICKUP_API_BASE}${endpoint}`,
        payload,
        originalValue: value,
        valueType: typeof value,
        taskId,
        fieldId,
      });

      try {
        const response = await this.makeRequest(
          'post',
          endpoint,
          payload,
          false
        );

        console.log('ClickUp field update successful:', { taskId, fieldId, payload });
        this.cache.invalidatePattern(`project:${taskId}*`);
        this.cache.invalidatePattern('projects:*');
      } catch (apiError) {
        // Check for 404 - either from AxiosError or enhanced error with status property
        const statusCode = (apiError as any)?.status || 
                          (axios.isAxiosError(apiError) ? apiError.response?.status : null) ||
                          (apiError instanceof Error && apiError.message.includes('404') ? 404 : null);
        
        if (statusCode === 404) {
          // Try fetching the task to verify field exists and check its structure
          const task = await this.getProject(taskId);
          const field = task.custom_fields?.find(f => f.id === fieldId);
          
          if (!field) {
            throw new Error(`Custom field with ID ${fieldId} not found on task ${taskId}`);
          }
          
          // Log the full field structure to debug
          console.error('Field exists but update failed (404):', {
            fieldId,
            fieldName: field.name,
            fieldType: field.type,
            currentValue: field.value,
            fullField: JSON.stringify(field, null, 2),
            allFieldIds: task.custom_fields?.map(f => ({ id: f.id, name: f.name, type: f.type })),
          });
          
          // Some ClickUp custom fields might not be editable via API
          // Or might require a different endpoint format
          throw new Error(`Failed to update field "${field.name}" (${field.type}): This field type may not be editable via API, or the field ID format may be incorrect. Status: 404 Not Found`);
        }
        throw apiError;
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ err: string; error: string; ECODE?: string }>;
        console.error('Error updating ClickUp field (Axios Error):', {
          taskId,
          fieldId,
          value,
          valueType: typeof value,
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data,
          url: axiosError.config?.url,
          method: axiosError.config?.method,
          fullUrl: axiosError.config?.url ? `${CLICKUP_API_BASE}${axiosError.config.url}` : undefined,
        });
        
        // Throw a more descriptive error
        const errorMessage = axiosError.response?.data?.err || 
                            axiosError.response?.data?.error || 
                            axiosError.message ||
                            `Failed to update field: ${axiosError.response?.status} ${axiosError.response?.statusText}`;
        throw new Error(errorMessage);
      }
      
      console.error('Error updating ClickUp field:', {
        taskId,
        fieldId,
        value,
        valueType: typeof value,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  async updateProjectName(taskId: string, name: string): Promise<void> {
    await this.makeRequest(
      'put',
      `/task/${taskId}`,
      { name },
      false
    );

    this.cache.invalidatePattern(`project:${taskId}*`);
    this.cache.invalidatePattern('projects:*');
  }

  async updateProjectDescription(taskId: string, description: string): Promise<void> {
    await this.makeRequest(
      'put',
      `/task/${taskId}`,
      { description },
      false
    );

    this.cache.invalidatePattern(`project:${taskId}*`);
    this.cache.invalidatePattern('projects:*');
  }

  async updateProjectAssignees(taskId: string, assigneeIds: string[]): Promise<void> {
    await this.makeRequest(
      'put',
      `/task/${taskId}`,
      { assignees: assigneeIds },
      false
    );

    this.cache.invalidatePattern(`project:${taskId}*`);
    this.cache.invalidatePattern('projects:*');
  }

  async addProjectNote(taskId: string, comment: string): Promise<ClickUpComment> {
    const response = await this.makeRequest<ClickUpApiResponse<ClickUpComment>>(
      'post',
      `/task/${taskId}/comment`,
      { comment_text: comment },
      false
    );

    this.cache.invalidatePattern(`project:${taskId}*`);
    this.cache.invalidatePattern('projects:*');

    if (!response.data) {
      throw new Error('Failed to create comment');
    }

    return response.data;
  }

  async getProjectNotes(taskId: string): Promise<ClickUpComment[]> {
    const cacheKey = `notes:${taskId}`;
    const response = await this.makeRequest<ClickUpApiResponse<ClickUpComment>>(
      'get',
      `/task/${taskId}/comment`,
      undefined,
      true,
      cacheKey,
      300000
    );

    return Array.isArray(response.data) ? response.data : [];
  }

  async getTimeEntries(taskId: string): Promise<ClickUpTimeEntry[]> {
    const cacheKey = `time:${taskId}`;
    const response = await this.makeRequest<{ data: ClickUpTimeEntry[] }>(
      'get',
      `/task/${taskId}/time`,
      undefined,
      true,
      cacheKey,
      300000
    );

    return response.data || [];
  }

  async createTimeEntry(
    taskId: string,
    duration: number,
    description?: string,
    start?: number,
    billable?: boolean
  ): Promise<ClickUpTimeEntry> {
    // ClickUp API format: POST /team/{team_id}/time_entries
    // Payload should include: tid (task ID), duration (in ms), description, start (optional), billable (optional)
    const payload: any = {
      tid: taskId, // task ID
      duration: duration, // duration in milliseconds
      description: description || '',
    };

    // Only include start if provided (ClickUp will use current time if not provided)
    if (start) {
      payload.start = start;
    }
    
    // Only include billable if explicitly set (some APIs have issues with billable field)
    if (billable !== undefined) {
      payload.billable = billable;
    }

    try {
      const response = await this.makeRequest<{ data: ClickUpTimeEntry }>(
        'post',
        `/team/${this.teamId}/time_entries`,
        payload,
        false
      );

      this.cache.invalidatePattern(`time:${taskId}*`);
      this.cache.invalidatePattern(`project:${taskId}*`);

      if (!response.data) {
        throw new Error('Failed to create time entry: No data returned');
      }

      return response.data;
    } catch (error) {
      // Log the full error for debugging
      console.error('ClickUp API error creating time entry:', {
        error,
        taskId,
        duration,
        payload,
        teamId: this.teamId,
      });
      if (error instanceof Error) {
        throw new Error(`ClickUp API error: ${error.message}`);
      }
      throw error;
    }
  }

  async getUsers(): Promise<ClickUpUser[]> {
    const cacheKey = `users:${this.teamId}`;
    try {
      // ClickUp API endpoint: GET /team/{team_id}/member
      // Returns: { members: [{ user: {...}, ... }] }
      const response = await this.makeRequest<{ members?: Array<{ user: ClickUpUser }>; users?: ClickUpUser[] }>(
        'get',
        `/team/${this.teamId}/member`,
        undefined,
        true,
        cacheKey,
        3600000
      );

      // Handle different response formats
      if (response.members && Array.isArray(response.members)) {
        return response.members.map(m => m.user).filter(Boolean);
      }
      
      if (response.users && Array.isArray(response.users)) {
        return response.users;
      }

      return [];
    } catch (error) {
      console.error('Error fetching users from /team/{team_id}/member:', error);
      
      // Fallback: try getting users from projects (extract unique assignees)
      try {
        const projects = await this.getProjects(false);
        const userMap = new Map<string, ClickUpUser>();
        projects.forEach(project => {
          project.assignees?.forEach(assignee => {
            if (!userMap.has(assignee.id)) {
              userMap.set(assignee.id, assignee);
            }
          });
        });
        return Array.from(userMap.values());
      } catch (fallbackError) {
        console.error('Error fetching users from projects fallback:', fallbackError);
        // Return empty array if users can't be fetched
        // This allows the app to continue working without user selection
        return [];
      }
    }
  }

  async getUser(userId: string): Promise<ClickUpUser> {
    const response = await this.makeRequest<{ user: ClickUpUser }>(
      'get',
      `/user/${userId}`,
      undefined,
      true,
      `user:${userId}`,
      3600000
    );

    if (!response.user) {
      throw new Error('User not found');
    }

    return response.user;
  }

  async getList(): Promise<ClickUpList> {
    const cacheKey = `list:${this.listId}`;
    const response = await this.makeRequest<ClickUpList>(
      'get',
      `/list/${this.listId}`,
      undefined,
      true,
      cacheKey,
      3600000
    );

    return response;
  }

  async createChecklist(taskId: string, name: string): Promise<{ id: string; name: string }> {
    try {
      const response = await this.makeRequest<{ checklist: { id: string; name: string } }>(
        'post',
        `/task/${taskId}/checklist`,
        { name },
        false
      );

      this.cache.invalidatePattern(`project:${taskId}*`);
      return response.checklist;
    } catch (error) {
      console.error('Error creating checklist in ClickUp:', {
        taskId,
        name,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  async addChecklistItem(taskId: string, checklistId: string, name: string): Promise<{ id: string; name: string }> {
    try {
      const response = await this.makeRequest<{ checklist_item: { id: string; name: string } }>(
        'post',
        `/task/${taskId}/checklist/${checklistId}/item`,
        { name },
        false
      );

      this.cache.invalidatePattern(`project:${taskId}*`);
      return response.checklist_item;
    } catch (error) {
      console.error('Error adding checklist item in ClickUp:', {
        taskId,
        checklistId,
        name,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  async updateChecklistItem(taskId: string, checklistId: string, itemId: string, checked: boolean): Promise<void> {
    try {
      await this.makeRequest(
        'put',
        `/task/${taskId}/checklist/${checklistId}/item/${itemId}`,
        { resolved: checked },
        false
      );

      this.cache.invalidatePattern(`project:${taskId}*`);
    } catch (error) {
      console.error('Error updating checklist item in ClickUp:', {
        taskId,
        checklistId,
        itemId,
        checked,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  async getTaskChecklists(taskId: string): Promise<Array<{ id: string; name: string; items?: Array<{ id: string; name: string }> }>> {
    try {
      const task = await this.getProject(taskId);
      // ClickUp API returns checklists as part of the task object
      // The structure may vary, so we'll need to check the actual response
      return (task as any).checklists || [];
    } catch (error) {
      console.error('Error fetching task checklists:', {
        taskId,
        error: error instanceof Error ? error.message : error,
      });
      return [];
    }
  }

  invalidateCache(pattern?: string): void {
    if (pattern) {
      this.cache.invalidatePattern(pattern);
    } else {
      this.cache.clear();
    }
  }
}

