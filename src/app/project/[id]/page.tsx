'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClickUpTask, ClickUpComment, ClickUpUser, ClickUpStatus } from '@/types/clickup';
import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';

async function fetchProject(id: string): Promise<ClickUpTask> {
  const response = await fetch(`/api/projects/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch project');
  }
  const data = await response.json();
  return data.project;
}

async function fetchComments(id: string): Promise<ClickUpComment[]> {
  const response = await fetch(`/api/projects/${id}/comments`);
  if (!response.ok) {
    throw new Error('Failed to fetch comments');
  }
  const data = await response.json();
  return data.comments || [];
}

interface ChecklistItem {
  id: string;
  clickupTaskId: string;
  checklistType: string;
  itemIndex: number;
  itemText: string;
  isChecked: boolean;
  checkedAt: string | null;
}

async function fetchChecklist(id: string): Promise<ChecklistItem[]> {
  const response = await fetch(`/api/projects/${id}/checklist`);
  if (!response.ok) {
    throw new Error('Failed to fetch checklist');
  }
  const data = await response.json();
  return data.checklist || [];
}

async function fetchUsers(): Promise<ClickUpUser[]> {
  const response = await fetch(`/api/users`);
  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }
  const data = await response.json();
  return data.users || [];
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const queryClient = useQueryClient();

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editAssignees, setEditAssignees] = useState<string[]>([]);
  const [commentText, setCommentText] = useState('');
  const [activeChecklistTab, setActiveChecklistTab] = useState<'pre-launch' | 'post-launch'>('pre-launch');

  const { data: project, isLoading, error } = useQuery<ClickUpTask>({
    queryKey: ['project', projectId],
    queryFn: () => fetchProject(projectId),
  });

  const { data: comments } = useQuery<ClickUpComment[]>({
    queryKey: ['comments', projectId],
    queryFn: () => fetchComments(projectId),
  });

  const { data: checklistItems = [], isLoading: isLoadingChecklist, error: checklistError } = useQuery<ChecklistItem[]>({
    queryKey: ['checklist', projectId],
    queryFn: () => fetchChecklist(projectId),
    retry: 2,
  });

  const { data: users = [] } = useQuery<ClickUpUser[]>({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  // Get available statuses from projects list
  const { data: projects } = useQuery<ClickUpTask[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data = await response.json();
      return data.projects || [];
    },
  });

  const availableStatuses = useMemo(() => {
    if (!projects) return [];
    const statuses = new Map<string, ClickUpStatus>();
    projects.forEach(p => {
      if (p.status) {
        statuses.set(p.status.status, p.status);
      }
    });
    return Array.from(statuses.values());
  }, [projects]);

  // Get available milestone values and create color mapping
  const availableMilestones = useMemo(() => {
    if (!projects) return [];
    const milestones = new Set<string>();
    projects.forEach(p => {
      const milestoneField = p.custom_fields?.find(f => 
        f.name.toLowerCase().includes('milestone')
      );
      if (milestoneField?.value) {
        milestones.add(milestoneField.value.toString());
      }
    });
    return Array.from(milestones).sort();
  }, [projects]);

  // Color mapping for milestones
  const getMilestoneColor = (milestone: string | null): string => {
    if (!milestone) return '#f3f4f6';
    
    // Create a consistent color based on milestone value
    const colors = [
      '#2244FF', // Blue
      '#00B000', // Green
      '#FF3388', // Pink
      '#FF4444', // Red
      '#FF8800', // Orange
      '#8800FF', // Purple
      '#00CCCC', // Cyan
      '#FFCC00', // Yellow
    ];
    
    const index = availableMilestones.indexOf(milestone);
    return colors[index % colors.length] || '#2244FF';
  };

  const updateChecklistMutation = useMutation({
    mutationFn: async ({ checklistType, itemIndex, isChecked }: { checklistType: string; itemIndex: number; isChecked: boolean }) => {
      const response = await fetch(`/api/projects/${projectId}/checklist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checklistType, itemIndex, isChecked }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update checklist');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist', projectId] });
    },
  });

  const completeChecklistMutation = useMutation({
    mutationFn: async (checklistType: string) => {
      const response = await fetch(`/api/projects/${projectId}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checklistType }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to complete checklist');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist', projectId] });
      queryClient.invalidateQueries({ queryKey: ['comments', projectId] });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: any }) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to update project');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEditingField(null);
    },
  });

  const updateFieldMutation = useMutation({
    mutationFn: async ({ fieldId, value }: { fieldId: string; value: string | number }) => {
      const response = await fetch(`/api/projects/${projectId}/field`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldId, value }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to update field');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEditingField(null);
    },
  });

  const updateDatesMutation = useMutation({
    mutationFn: async ({ startDate, dueDate }: { startDate?: number; dueDate?: number }) => {
      const response = await fetch(`/api/projects/${projectId}/dates`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, dueDate }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to update dates');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEditingField(null);
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (comment: string) => {
      const response = await fetch(`/api/projects/${projectId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      });
      if (!response.ok) throw new Error('Failed to add comment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', projectId] });
      setCommentText('');
    },
  });

  const handleEdit = (field: string, currentValue: any) => {
    setEditingField(field);
    if (field === 'assignees') {
      setEditAssignees(Array.isArray(currentValue) ? currentValue.map((a: ClickUpUser) => a.id) : []);
    } else {
      setEditValue(currentValue || '');
    }
  };

  const handleSave = (field: string) => {
    if (field === 'assignees') {
      updateProjectMutation.mutate({ field: 'assignees', value: editAssignees });
    } else if (field === 'start_date' || field === 'due_date') {
      const startDate = field === 'start_date' ? new Date(editValue).getTime() : project?.start_date ? parseInt(project.start_date) : undefined;
      const dueDate = field === 'due_date' ? new Date(editValue).getTime() : project?.due_date ? parseInt(project.due_date) : undefined;
      updateDatesMutation.mutate({ startDate, dueDate });
    } else {
      updateProjectMutation.mutate({ field, value: editValue });
    }
  };

  const handleSaveField = (fieldId: string, value: string | number) => {
    // Ensure proper type conversion
    let finalValue: string | number = value;
    
    // If it's a number string, convert to number
    if (typeof value === 'string' && !isNaN(parseFloat(value)) && value.trim() !== '') {
      finalValue = parseFloat(value);
    }
    
    updateFieldMutation.mutate({ fieldId, value: finalValue });
  };

  const handleAddComment = () => {
    if (commentText.trim()) {
      addCommentMutation.mutate(commentText);
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading project...</div>
      </ProtectedRoute>
    );
  }

  if (error || !project) {
    return (
      <ProtectedRoute>
        <div style={{ padding: '2rem' }}>
          <p>Error loading project: {error instanceof Error ? error.message : 'Unknown error'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#2244FF',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </ProtectedRoute>
    );
  }

  const latestComment = comments && comments.length > 0 ? comments[comments.length - 1] : null;

  return (
    <ProtectedRoute>
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <button
            onClick={() => router.back()}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'transparent',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            ← Back
          </button>
          <button
            onClick={() => router.push(`/email?projectId=${projectId}`)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#2244FF',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            📧 Send Email
          </button>
        </div>

        <div style={{
          backgroundColor: '#fff',
          padding: '2rem',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          marginBottom: '2rem',
        }}>
          {/* Project Name */}
          <div style={{ marginBottom: '1rem' }}>
            {editingField === 'name' ? (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  style={{
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    flex: 1,
                    fontSize: '1.5rem',
                    fontWeight: 600,
                  }}
                />
                <button
                  onClick={() => handleSave('name')}
                  disabled={updateProjectMutation.isPending}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#00B000',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingField(null)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#FF4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h1 style={{ color: '#2244FF', margin: 0 }}>{project.name}</h1>
                <button
                  onClick={() => handleEdit('name', project.name)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: 'transparent',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                  }}
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* Status and Milestone - Front and Centre */}
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            marginBottom: '2rem',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}>
            {/* Status */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              backgroundColor: project.status?.color || '#e5e7eb',
              borderRadius: '8px',
              minWidth: '200px',
            }}>
              <span style={{ 
                fontSize: '0.875rem', 
                fontWeight: 600, 
                color: '#fff',
                textShadow: '0 1px 2px rgba(0,0,0,0.1)',
              }}>
                Status:
              </span>
              {editingField === 'status' ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1 }}>
                  <select
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      border: '1px solid #fff',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      color: '#111',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      flex: 1,
                    }}
                  >
                    {availableStatuses.map(status => (
                      <option key={status.status} value={status.status}>
                        {status.status}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleSave('status')}
                    disabled={updateProjectMutation.isPending}
                    style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#00B000',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                    }}
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => setEditingField(null)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#FF4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                    }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <span 
                  onClick={() => handleEdit('status', project.status?.status || '')}
                  style={{ 
                    fontSize: '1rem', 
                    fontWeight: 700, 
                    color: '#fff',
                    textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    textDecorationStyle: 'dotted',
                  }}
                  title="Click to edit"
                >
                  {project.status?.status || 'No Status'}
                </span>
              )}
            </div>

            {/* Milestone */}
            {(() => {
              const milestoneField = project.custom_fields?.find(f => 
                f.name.toLowerCase().includes('milestone')
              );
              const milestoneValue = milestoneField?.value?.toString() || null;
              const milestoneColor = getMilestoneColor(milestoneValue);
              
              return (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  backgroundColor: milestoneColor,
                  borderRadius: '8px',
                  minWidth: '200px',
                  flex: 1,
                }}>
                  <span style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: 600, 
                    color: '#fff',
                    textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  }}>
                    Milestone:
                  </span>
                  {editingField === `milestone_${milestoneField?.id}` ? (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1 }}>
                      <select
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          border: '1px solid #fff',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(255,255,255,0.9)',
                          color: '#111',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          flex: 1,
                        }}
                      >
                        <option value="">No Milestone</option>
                        {availableMilestones.map(milestone => (
                          <option key={milestone} value={milestone}>
                            {milestone}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          if (milestoneField) {
                            handleSaveField(milestoneField.id, editValue || '');
                          }
                        }}
                        disabled={updateFieldMutation.isPending}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#00B000',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                        }}
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setEditingField(null)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#FF4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <span 
                      onClick={() => {
                        if (milestoneField) {
                          handleEdit(`milestone_${milestoneField.id}`, milestoneValue || '');
                        }
                      }}
                      style={{ 
                        fontSize: '1rem', 
                        fontWeight: 700, 
                        color: '#fff',
                        textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        textDecorationStyle: 'dotted',
                      }}
                      title="Click to edit"
                    >
                      {milestoneValue || 'No Milestone'}
                    </span>
                  )}
                </div>
              );
            })()}
          </div>

          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {/* Description */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                Description
              </label>
              {editingField === 'description' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    style={{
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      minHeight: '100px',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleSave('description')}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#00B000',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingField(null)}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#FF4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <p style={{ flex: 1, color: '#666' }}>{project.description || 'No description'}</p>
                  <button
                    onClick={() => handleEdit('description', project.description)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: 'transparent',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                    }}
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            {/* Assignees */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                Assignees
              </label>
              {editingField === 'assignees' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <select
                    multiple
                    value={editAssignees}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setEditAssignees(selected);
                    }}
                    style={{
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      minHeight: '150px',
                    }}
                  >
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.username || user.email}
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>
                    Hold Ctrl/Cmd to select multiple
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleSave('assignees')}
                      disabled={updateProjectMutation.isPending}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#00B000',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingField(null)}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#FF4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {project.assignees && project.assignees.length > 0 ? (
                    project.assignees.map((assignee) => (
                      <span
                        key={assignee.id}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#f3f4f6',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                        }}
                      >
                        {assignee.username || assignee.email}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: '#666' }}>No assignees</span>
                  )}
                  <button
                    onClick={() => handleEdit('assignees', project.assignees)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: 'transparent',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                    }}
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            {/* Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                  Start Date
                </label>
                {editingField === 'start_date' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input
                      type="date"
                      value={editValue && !isNaN(parseInt(editValue)) ? new Date(parseInt(editValue)).toISOString().split('T')[0] : ''}
                      onChange={(e) => setEditValue(e.target.value ? new Date(e.target.value).getTime().toString() : '')}
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleSave('start_date')}
                        disabled={updateDatesMutation.isPending}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#00B000',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingField(null)}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#FF4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <p style={{ margin: 0 }}>
                      {project.start_date ? new Date(parseInt(project.start_date)).toLocaleDateString() : <span style={{ color: '#666' }}>No start date</span>}
                    </p>
                    <button
                      onClick={() => handleEdit('start_date', project.start_date)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: 'transparent',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                      }}
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                  Due Date
                </label>
                {editingField === 'due_date' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input
                      type="date"
                      value={editValue && !isNaN(parseInt(editValue)) ? new Date(parseInt(editValue)).toISOString().split('T')[0] : ''}
                      onChange={(e) => setEditValue(e.target.value ? new Date(e.target.value).getTime().toString() : '')}
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleSave('due_date')}
                        disabled={updateDatesMutation.isPending}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#00B000',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingField(null)}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#FF4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <p style={{ margin: 0 }}>
                      {project.due_date ? new Date(parseInt(project.due_date)).toLocaleDateString() : <span style={{ color: '#666' }}>No due date</span>}
                    </p>
                    <button
                      onClick={() => handleEdit('due_date', project.due_date)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: 'transparent',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                      }}
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Milestones */}
            {(() => {
              const projectTotalField = project.custom_fields?.find(f => 
                f.name.toLowerCase().includes('project total')
              );
              const invoicedPercentField = project.custom_fields?.find(f => 
                f.name.toLowerCase().includes('% invoiced') || 
                f.name.toLowerCase().includes('invoiced')
              );

              const projectTotal = projectTotalField?.value 
                ? (typeof projectTotalField.value === 'number' ? projectTotalField.value : parseFloat(projectTotalField.value.toString()) || 0)
                : null;
              const invoicedPercent = invoicedPercentField?.value
                ? (typeof invoicedPercentField.value === 'number' ? invoicedPercentField.value : parseFloat(invoicedPercentField.value.toString()) || 0)
                : 0;

              const invoicedAmount = projectTotal ? (projectTotal * invoicedPercent) / 100 : 0;
              const remainingAmount = projectTotal ? projectTotal - invoicedAmount : 0;

              if (projectTotal !== null) {
                return (
                  <div style={{
                    padding: '1.5rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    marginTop: '1rem',
                  }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#374151' }}>
                      Payment Milestones
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>Project Total</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111' }}>
                          ${projectTotal.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>% Invoiced</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2244FF' }}>
                          {invoicedPercent.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(2, 1fr)', 
                      gap: '1rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid #e5e7eb',
                    }}>
                      <div style={{
                        padding: '1rem',
                        backgroundColor: '#FFCAEB',
                        borderRadius: '6px',
                      }}>
                        <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>Invoiced</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111' }}>
                          ${invoicedAmount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div style={{
                        padding: '1rem',
                        backgroundColor: invoicedPercent < 100 ? '#FF4444' : '#00B000',
                        borderRadius: '6px',
                      }}>
                        <div style={{ fontSize: '0.875rem', color: '#fff', marginBottom: '0.25rem' }}>
                          {invoicedPercent < 100 ? 'Remaining to Invoice' : 'Fully Invoiced'}
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                          ${remainingAmount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Custom Fields */}
            {project.custom_fields && project.custom_fields.length > 0 && (() => {
              // Sort custom fields: non-N/A values first
              const sortedFields = [...project.custom_fields].sort((a, b) => {
                const aValue = a.value?.toString().toLowerCase() || '';
                const bValue = b.value?.toString().toLowerCase() || '';
                const aHasValue = aValue !== '' && aValue !== 'n/a' && aValue !== 'null' && aValue !== 'undefined';
                const bHasValue = bValue !== '' && bValue !== 'n/a' && bValue !== 'null' && bValue !== 'undefined';
                if (aHasValue && !bHasValue) return -1;
                if (!aHasValue && bHasValue) return 1;
                return 0;
              });

              return (
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                    Custom Fields
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                    {sortedFields.map((field) => {
                    const fieldKey = `field_${field.id}`;
                    const isEditing = editingField === fieldKey;
                    const currentValue = field.value?.toString() || '';
                    
                    return (
                      <div key={field.id} style={{
                        padding: '1rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb',
                      }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: '#666' }}>
                          {field.name}
                        </label>
                        {isEditing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {field.type === 'number' || field.type === 'currency' ? (
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                style={{
                                  padding: '0.5rem',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '0.875rem',
                                }}
                              />
                            ) : field.type === 'date' ? (
                              <input
                                type="date"
                                value={editValue ? new Date(parseInt(editValue)).toISOString().split('T')[0] : ''}
                                onChange={(e) => setEditValue(e.target.value ? new Date(e.target.value).getTime().toString() : '')}
                                style={{
                                  padding: '0.5rem',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '0.875rem',
                                }}
                              />
                            ) : (
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                style={{
                                  padding: '0.5rem',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '0.875rem',
                                }}
                              />
                            )}
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => {
                                  let finalValue: string | number;
                                  
                                  if (field.type === 'number' || field.type === 'currency') {
                                    finalValue = parseFloat(editValue) || 0;
                                  } else if (field.type === 'date') {
                                    // Date fields need to be sent as milliseconds timestamp (number)
                                    finalValue = editValue ? parseInt(editValue) : 0;
                                  } else {
                                    finalValue = editValue;
                                  }
                                  
                                  handleSaveField(field.id, finalValue);
                                }}
                                disabled={updateFieldMutation.isPending}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  backgroundColor: '#00B000',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem',
                                }}
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingField(null)}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  backgroundColor: '#FF4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem',
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.875rem', color: '#111', flex: 1 }}>
                              {field.value !== null && field.value !== undefined 
                                ? (field.type === 'date' && typeof field.value === 'string' 
                                  ? new Date(parseInt(field.value)).toLocaleDateString()
                                  : field.value.toString())
                                : 'N/A'}
                            </span>
                            <button
                              onClick={() => handleEdit(fieldKey, currentValue)}
                              style={{
                                padding: '0.25rem 0.5rem',
                                backgroundColor: 'transparent',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                              }}
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  </div>
                </div>
              );
            })()}

            {/* QA Checklists */}
            <div style={{
              padding: '1.5rem',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              marginTop: '1rem',
            }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem', color: '#374151' }}>
                QA Checklists
              </h3>
              
              {/* Tabs */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid #e5e7eb' }}>
                <button
                  onClick={() => setActiveChecklistTab('pre-launch')}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: activeChecklistTab === 'pre-launch' ? '#2244FF' : 'transparent',
                    color: activeChecklistTab === 'pre-launch' ? '#fff' : '#666',
                    border: 'none',
                    borderBottom: activeChecklistTab === 'pre-launch' ? '2px solid #2244FF' : '2px solid transparent',
                    borderRadius: '6px 6px 0 0',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    marginBottom: '-2px',
                  }}
                >
                  Pre Launch QA
                </button>
                <button
                  onClick={() => setActiveChecklistTab('post-launch')}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: activeChecklistTab === 'post-launch' ? '#2244FF' : 'transparent',
                    color: activeChecklistTab === 'post-launch' ? '#fff' : '#666',
                    border: 'none',
                    borderBottom: activeChecklistTab === 'post-launch' ? '2px solid #2244FF' : '2px solid transparent',
                    borderRadius: '6px 6px 0 0',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    marginBottom: '-2px',
                  }}
                >
                  Post Launch QA
                </button>
              </div>

              {/* Checklist Content */}
              <div>
                {isLoadingChecklist ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                    Loading checklist...
                  </div>
                ) : checklistError ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#FF4444' }}>
                    Error loading checklist: {checklistError instanceof Error ? checklistError.message : 'Unknown error'}
                  </div>
                ) : (
                  <>
                    {checklistItems.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                        No checklist items found. They should initialize automatically when you view this page.
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                          {checklistItems
                            .filter(item => item.checklistType === activeChecklistTab)
                            .sort((a, b) => a.itemIndex - b.itemIndex)
                            .map((item) => (
                              <label
                                key={item.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: '0.75rem',
                                  padding: '0.75rem',
                                  backgroundColor: '#fff',
                                  borderRadius: '6px',
                                  border: '1px solid #e5e7eb',
                                  cursor: 'pointer',
                                  transition: 'background-color 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#f9fafb';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = '#fff';
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={item.isChecked}
                                  onChange={(e) => {
                                    updateChecklistMutation.mutate({
                                      checklistType: activeChecklistTab,
                                      itemIndex: item.itemIndex,
                                      isChecked: e.target.checked,
                                    });
                                  }}
                                  disabled={updateChecklistMutation.isPending}
                                  style={{
                                    width: '20px',
                                    height: '20px',
                                    cursor: updateChecklistMutation.isPending ? 'wait' : 'pointer',
                                    marginTop: '2px',
                                  }}
                                />
                                <span style={{
                                  flex: 1,
                                  fontSize: '0.875rem',
                                  color: item.isChecked ? '#666' : '#111',
                                  textDecoration: item.isChecked ? 'line-through' : 'none',
                                }}>
                                  {item.itemText}
                                </span>
                              </label>
                            ))}
                        </div>
                        
                        {/* Show message if no items for this tab */}
                        {checklistItems.filter(item => item.checklistType === activeChecklistTab).length === 0 && checklistItems.length > 0 && (
                          <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                            No items found for {activeChecklistTab === 'pre-launch' ? 'Pre Launch QA' : 'Post Launch QA'} checklist.
                          </div>
                        )}

                        {/* Complete Button - only show when all items are checked */}
                        {checklistItems
                          .filter(item => item.checklistType === activeChecklistTab)
                          .every(item => item.isChecked) && 
                          checklistItems.filter(item => item.checklistType === activeChecklistTab).length > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                            <button
                              onClick={() => completeChecklistMutation.mutate(activeChecklistTab)}
                              disabled={completeChecklistMutation.isPending}
                              style={{
                                padding: '0.75rem 2rem',
                                backgroundColor: '#00B000',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                cursor: completeChecklistMutation.isPending ? 'wait' : 'pointer',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                              }}
                            >
                              {completeChecklistMutation.isPending ? 'Completing...' : '✅ Mark as Complete'}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Latest Comment */}
            {latestComment && (
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                  Latest Comment
                </label>
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                }}>
                  <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
                    {latestComment.user.username || latestComment.user.email} • {new Date(parseInt(latestComment.date)).toLocaleDateString()}
                  </div>
                  <p>{latestComment.comment_text}</p>
                </div>
              </div>
            )}

            {/* Add Comment */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                Add Comment
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddComment();
                    }
                  }}
                />
                <button
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || addCommentMutation.isPending}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: commentText.trim() ? '#2244FF' : '#9ca3af',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: commentText.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  {addCommentMutation.isPending ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>

            {/* All Comments */}
            {comments && comments.length > 0 && (
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                  All Comments ({comments.length})
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      style={{
                        padding: '1rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb',
                      }}
                    >
                      <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
                        {comment.user.username || comment.user.email} • {new Date(parseInt(comment.date)).toLocaleDateString()}
                      </div>
                      <p>{comment.comment_text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

