export interface ClickUpTask {
  id: string;
  name: string;
  status: ClickUpStatus;
  assignees: ClickUpUser[];
  custom_fields: ClickUpCustomField[];
  date_created: string;
  date_updated: string;
  due_date?: string;
  start_date?: string;
  description?: string;
  url: string;
}

export interface ClickUpUser {
  id: string;
  username: string;
  email: string;
  profilePicture?: string;
}

export interface ClickUpCustomField {
  id: string;
  name: string;
  value?: string | number | string[];
  type: string;
  type_config?: Record<string, any>;
}

export interface ClickUpStatus {
  status: string;
  color: string;
  type: string;
  orderindex: number;
}

export interface ClickUpList {
  id: string;
  name: string;
  orderindex: number;
  status?: ClickUpStatus;
  priority?: any;
  assignee?: ClickUpUser;
  task_count?: number;
  due_date?: string;
  start_date?: string;
  folder?: any;
  space?: any;
  archived: boolean;
  statuses?: ClickUpStatus[];
}

export interface ClickUpTimeEntry {
  id: string;
  task: {
    id: string;
    name: string;
  };
  wid: string;
  user: ClickUpUser;
  billable: boolean;
  start: string;
  end: string;
  duration: string;
  description: string;
  tags: any[];
  source: string;
  at: string;
  task_location?: any;
  task_tags?: any[];
  task_url?: string;
}

export interface ClickUpComment {
  id: string;
  comment: Array<{
    text: string;
  }>;
  comment_text: string;
  user: ClickUpUser;
  resolved: boolean;
  assignee?: ClickUpUser;
  assigned_by?: ClickUpUser;
  reactions: any[];
  date: string;
}

export interface ClickUpApiResponse<T> {
  data?: T;
  tasks?: T[];
  err?: string;
  error?: string;
}

