'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ClickUpTask, ClickUpUser, ClickUpStatus, ClickUpComment } from '@/types/clickup';
import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';

async function fetchProjects(): Promise<ClickUpTask[]> {
  const response = await fetch('/api/projects');
  if (!response.ok) {
    throw new Error('Failed to fetch projects');
  }
  const data = await response.json();
  return data.projects || [];
}

// Table row component for projects
function ProjectTableRow({ 
  project, 
  summary, 
  availableStatuses,
  availableMilestones,
  getMilestoneColor,
}: { 
  project: ClickUpTask; 
  summary?: { latestComment: ClickUpComment | null; totalTime: number };
  availableStatuses: ClickUpStatus[];
  availableMilestones: string[];
  getMilestoneColor: (milestone: string | null) => string;
}) {
  const queryClient = useQueryClient();
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isEditingDueDate, setIsEditingDueDate] = useState(false);
  const [dueDateValue, setDueDateValue] = useState(
    project.due_date ? new Date(parseInt(project.due_date)).toISOString().split('T')[0] : ''
  );
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingDate, setUpdatingDate] = useState(false);
  const [updatingMilestone, setUpdatingMilestone] = useState(false);

  const handleAddComment = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!commentText.trim()) return;
    
    setAddingComment(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: commentText }),
      });
      if (response.ok) {
        setCommentText('');
        setShowCommentInput(false);
        queryClient.invalidateQueries({ queryKey: ['projectSummaries'] });
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setAddingComment(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === project.status?.status) return;
    
    setUpdatingStatus(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['projects'] });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDueDateChange = async (newDate: string) => {
    const dateTimestamp = newDate ? new Date(newDate).getTime() : undefined;
    
    setUpdatingDate(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/dates`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dueDate: dateTimestamp,
          startDate: project.start_date ? parseInt(project.start_date) : undefined,
        }),
      });
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        setIsEditingDueDate(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update due date');
      }
    } catch (error) {
      console.error('Failed to update due date:', error);
      alert('Failed to update due date');
    } finally {
      setUpdatingDate(false);
    }
  };

  const handleMilestoneChange = async (newMilestone: string) => {
    const milestoneField = project.custom_fields?.find(f => 
      f.name.toLowerCase().includes('milestone')
    );
    if (!milestoneField) return;
    
    setUpdatingMilestone(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/field`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fieldId: milestoneField.id, 
          value: newMilestone || '' 
        }),
      });
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['projects'] });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update milestone');
      }
    } catch (error) {
      console.error('Failed to update milestone:', error);
      alert('Failed to update milestone');
    } finally {
      setUpdatingMilestone(false);
    }
  };

  // Find Time Estimate custom field
  const getTimeEstimate = (project: ClickUpTask): number | null => {
    if (!project.custom_fields) return null;
    const estimateField = project.custom_fields.find(f => {
      const name = f.name.toLowerCase();
      return name.includes('time estimate') || 
             name.includes('estimate') ||
             name.includes('timeest') ||
             (f.type === 'time_estimate' || f.type === 'number');
    });
    if (estimateField) {
      if (typeof estimateField.value === 'number') {
        return estimateField.value;
      }
      if (typeof estimateField.value === 'string') {
        const parsed = parseFloat(estimateField.value);
        if (!isNaN(parsed)) return parsed;
      }
      if (estimateField.type_config && typeof estimateField.type_config.value === 'number') {
        return estimateField.type_config.value;
      }
    }
    return null;
  };

  const timeEstimate = getTimeEstimate(project);
  const trackedTime = summary?.totalTime || 0;
  const percentage = timeEstimate ? (trackedTime / timeEstimate) * 100 : null;
  
  const getStatus = (): { color: string; isFlashing: boolean } => {
    if (!percentage) return { color: '#9ca3af', isFlashing: false };
    if (percentage < 80) return { color: '#00B000', isFlashing: false };
    if (percentage <= 100) return { color: '#FF3388', isFlashing: false };
    if (percentage < 150) return { color: '#FF4444', isFlashing: false };
    return { color: '#FF4444', isFlashing: true };
  };

  const status = getStatus();

  useEffect(() => {
    if (status.isFlashing) {
      const interval = setInterval(() => {
        setIsFlashing(prev => !prev);
      }, 500);
      return () => clearInterval(interval);
    } else {
      setIsFlashing(false);
    }
  }, [status.isFlashing]);

  const latestComment = summary?.latestComment;
  const circleSize = 40;
  const strokeWidth = 4;
  const radius = (circleSize - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = percentage ? Math.min(percentage, 150) / 150 : 0;
  const strokeDashoffset = circumference - (progress * circumference);

  return (
    <>
      <tr
        style={{
          borderBottom: '1px solid #e5e7eb',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f9fafb';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <td style={{ padding: '1rem' }}>
          <Link
            href={`/project/${project.id}`}
            style={{
              color: '#2244FF',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            {project.name}
          </Link>
        </td>
        <td style={{ padding: '1rem' }}>
          <select
            value={project.status?.status || ''}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={updatingStatus}
            onClick={(e) => e.stopPropagation()}
            style={{
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              backgroundColor: project.status?.color || '#ccc',
              color: '#fff',
              fontSize: '0.875rem',
              border: 'none',
              cursor: updatingStatus ? 'wait' : 'pointer',
              fontWeight: 500,
              minWidth: '140px',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='white' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.5rem center',
              paddingRight: '2rem',
            }}
          >
            {availableStatuses.map(status => (
              <option 
                key={status.status} 
                value={status.status}
                style={{ backgroundColor: '#fff', color: '#111' }}
              >
                {status.status}
              </option>
            ))}
            {!project.status && (
              <option value="" style={{ backgroundColor: '#fff', color: '#111' }}>
                No status
              </option>
            )}
          </select>
        </td>
        <td style={{ padding: '1rem' }}>
          {(() => {
            const milestoneField = project.custom_fields?.find(f => 
              f.name.toLowerCase().includes('milestone')
            );
            const milestoneValue = milestoneField?.value?.toString() || null;
            const milestoneColor = getMilestoneColor(milestoneValue);
            
            return (
              <select
                value={milestoneValue || ''}
                onChange={(e) => handleMilestoneChange(e.target.value)}
                disabled={updatingMilestone}
                onClick={(e) => e.stopPropagation()}
                style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  backgroundColor: milestoneColor,
                  color: '#fff',
                  fontSize: '0.875rem',
                  border: 'none',
                  cursor: updatingMilestone ? 'wait' : 'pointer',
                  fontWeight: 500,
                  minWidth: '140px',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='white' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.5rem center',
                  paddingRight: '2rem',
                }}
              >
                <option value="" style={{ backgroundColor: '#fff', color: '#111' }}>
                  No Milestone
                </option>
                {availableMilestones.map(milestone => (
                  <option 
                    key={milestone} 
                    value={milestone}
                    style={{ backgroundColor: '#fff', color: '#111' }}
                  >
                    {milestone}
                  </option>
                ))}
              </select>
            );
          })()}
        </td>
        <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#666' }}>
          {isEditingDueDate ? (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="date"
                value={dueDateValue}
                onChange={(e) => setDueDateValue(e.target.value)}
                onBlur={() => {
                  if (dueDateValue !== (project.due_date ? new Date(parseInt(project.due_date)).toISOString().split('T')[0] : '')) {
                    handleDueDateChange(dueDateValue);
                  } else {
                    setIsEditingDueDate(false);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleDueDateChange(dueDateValue);
                  }
                  if (e.key === 'Escape') {
                    setIsEditingDueDate(false);
                    setDueDateValue(project.due_date ? new Date(parseInt(project.due_date)).toISOString().split('T')[0] : '');
                  }
                }}
                disabled={updatingDate}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                style={{
                  padding: '0.25rem 0.5rem',
                  border: '1px solid #2244FF',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                }}
              />
              <button
                onClick={() => {
                  setIsEditingDueDate(false);
                  setDueDateValue(project.due_date ? new Date(parseInt(project.due_date)).toISOString().split('T')[0] : '');
                }}
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
              onClick={() => setIsEditingDueDate(true)}
              style={{
                cursor: 'pointer',
                textDecoration: 'underline',
                textDecorationStyle: 'dotted',
              }}
              title="Click to edit"
            >
              {project.due_date ? new Date(parseInt(project.due_date)).toLocaleDateString() : '-'}
            </span>
          )}
        </td>
        <td style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ position: 'relative', width: circleSize, height: circleSize }}>
              <svg width={circleSize} height={circleSize} style={{ transform: 'rotate(-90deg)' }}>
                <circle
                  cx={circleSize / 2}
                  cy={circleSize / 2}
                  r={radius}
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth={strokeWidth}
                />
                <circle
                  cx={circleSize / 2}
                  cy={circleSize / 2}
                  r={radius}
                  fill="none"
                  stroke={status.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{
                    transition: 'stroke-dashoffset 0.3s ease',
                    opacity: isFlashing ? 0.3 : 1,
                    animation: status.isFlashing ? 'flash 1s infinite' : 'none',
                  }}
                />
              </svg>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                fontSize: '0.7rem',
                fontWeight: 600,
                color: '#374151',
              }}>
                {percentage !== null ? `${percentage.toFixed(0)}%` : 'N/A'}
              </div>
            </div>
            <div style={{ fontSize: '0.875rem', color: '#666' }}>
              {trackedTime.toFixed(1)}h / {timeEstimate !== null ? `${timeEstimate}h` : 'N/A'}
            </div>
          </div>
        </td>
        <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#666', maxWidth: '300px' }}>
          {latestComment ? (
            <div>
              <div style={{ marginBottom: '0.25rem' }}>
                {latestComment.comment_text.length > 80 
                  ? latestComment.comment_text.substring(0, 80) + '...'
                  : latestComment.comment_text}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                {latestComment.user.username || latestComment.user.email} • {new Date(parseInt(latestComment.date)).toLocaleDateString()}
              </div>
            </div>
          ) : (
            <span style={{ color: '#9ca3af' }}>No notes</span>
          )}
        </td>
        <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#666' }}>
          {project.date_updated ? new Date(parseInt(project.date_updated)).toLocaleDateString() : '-'}
        </td>
        <td style={{ padding: '1rem', textAlign: 'center', position: 'relative' }}>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowCommentInput(!showCommentInput);
            }}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#2244FF',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Add project note"
          >
            💬
          </button>
        </td>
      </tr>
      {showCommentInput && (
        <tr>
          <td colSpan={7} style={{ padding: '1rem', backgroundColor: '#f9fafb' }}>
            <div style={{
              backgroundColor: '#fff',
              border: '2px solid #2244FF',
              borderRadius: '8px',
              padding: '1rem',
            }}>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a project note..."
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  minHeight: '60px',
                  marginBottom: '0.5rem',
                }}
              />
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowCommentInput(false);
                    setCommentText('');
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#FF4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || addingComment}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: commentText.trim() ? '#00B000' : '#9ca3af',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: commentText.trim() ? 'pointer' : 'not-allowed',
                    fontSize: '0.875rem',
                  }}
                >
                  {addingComment ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { data: projects, isLoading, error } = useQuery<ClickUpTask[]>({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  });

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    assignee: '',
    hasDueDate: '',
    customField: '',
  });

  const [selectedAssigneeTab, setSelectedAssigneeTab] = useState<string>('all');

  // Extract unique values for filters
  const uniqueStatuses = useMemo(() => {
    if (!projects) return [];
    const statuses = new Map<string, ClickUpStatus>();
    projects.forEach(p => {
      if (p.status) {
        statuses.set(p.status.status, p.status);
      }
    });
    return Array.from(statuses.values());
  }, [projects]);

  const uniqueAssignees = useMemo(() => {
    if (!projects) return [];
    const assignees = new Map<string, ClickUpUser>();
    projects.forEach(p => {
      p.assignees?.forEach(a => {
        assignees.set(a.id, a);
      });
    });
    return Array.from(assignees.values());
  }, [projects]);

  const uniqueCustomFields = useMemo(() => {
    if (!projects) return [];
    const fields = new Map<string, { id: string; name: string }>();
    projects.forEach(p => {
      p.custom_fields?.forEach(f => {
        fields.set(f.id, { id: f.id, name: f.name });
      });
    });
    return Array.from(fields.values());
  }, [projects]);

  // Get available milestone values
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

  // Filter projects
  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    return projects.filter(project => {
      // Search filter
      if (filters.search && !project.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      // Status filter
      if (filters.status && project.status?.status !== filters.status) {
        return false;
      }
      // Assignee filter
      if (filters.assignee && !project.assignees?.some(a => a.id === filters.assignee)) {
        return false;
      }
      // Due date filter
      if (filters.hasDueDate === 'yes' && !project.due_date) {
        return false;
      }
      if (filters.hasDueDate === 'no' && project.due_date) {
        return false;
      }
      // Custom field filter
      if (filters.customField) {
        const hasField = project.custom_fields?.some(f => f.id === filters.customField);
        if (!hasField) return false;
      }
      return true;
    });
  }, [projects, filters]);

  // Group projects by assignee
  const projectsByAssignee = useMemo(() => {
    if (!filteredProjects) return new Map<string, { assignee: ClickUpUser; projects: ClickUpTask[] }>();
    
    const grouped = new Map<string, { assignee: ClickUpUser; projects: ClickUpTask[] }>();
    
    // Add "Unassigned" group
    const unassignedProjects = filteredProjects.filter(p => !p.assignees || p.assignees.length === 0);
    if (unassignedProjects.length > 0) {
      // Sort unassigned projects by due date, then by name
      unassignedProjects.sort((a, b) => {
        if (a.due_date && b.due_date) {
          return parseInt(a.due_date) - parseInt(b.due_date);
        }
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        return a.name.localeCompare(b.name);
      });
      grouped.set('unassigned', {
        assignee: { id: 'unassigned', username: 'Unassigned', email: '' },
        projects: unassignedProjects,
      });
    }

    // Group by assignee
    filteredProjects.forEach(project => {
      if (project.assignees && project.assignees.length > 0) {
        project.assignees.forEach(assignee => {
          if (!grouped.has(assignee.id)) {
            grouped.set(assignee.id, {
              assignee,
              projects: [],
            });
          }
          grouped.get(assignee.id)!.projects.push(project);
        });
      }
    });

    // Sort projects within each group by due date, then by name
    grouped.forEach((group) => {
      group.projects.sort((a, b) => {
        if (a.due_date && b.due_date) {
          return parseInt(a.due_date) - parseInt(b.due_date);
        }
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        return a.name.localeCompare(b.name);
      });
    });

    return grouped;
  }, [filteredProjects]);

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const assigneeTabs = useMemo(() => {
    const tabs: Array<{ id: string; label: string; count: number }> = [
      { id: 'all', label: 'All Projects', count: filteredProjects.length },
    ];
    
    projectsByAssignee.forEach(({ assignee, projects }) => {
      tabs.push({
        id: assignee.id,
        label: assignee.username || assignee.email || 'Unassigned',
        count: projects.length,
      });
    });

    return tabs;
  }, [projectsByAssignee, filteredProjects.length]);

  const displayedProjects = useMemo(() => {
    if (selectedAssigneeTab === 'all') {
      return filteredProjects;
    }
    return projectsByAssignee.get(selectedAssigneeTab)?.projects || [];
  }, [selectedAssigneeTab, projectsByAssignee, filteredProjects]);

  // Fetch project summaries (comments and time)
  const { data: projectSummaries } = useQuery<Record<string, { latestComment: ClickUpComment | null; totalTime: number }>>({
    queryKey: ['projectSummaries', displayedProjects.map(p => p.id).join(',')],
    queryFn: async () => {
      if (displayedProjects.length === 0) return {};
      const response = await fetch('/api/projects/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectIds: displayedProjects.map(p => p.id) }),
      });
      if (!response.ok) return {};
      const data = await response.json();
      return data.summaries || {};
    },
    enabled: displayedProjects.length > 0,
  });

  return (
    <ProtectedRoute>
      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <h1>Global Dashboard</h1>
        
        {isLoading && <p>Loading projects...</p>}
        
        {error && (
          <div style={{ 
            padding: '1rem', 
            backgroundColor: '#fee', 
            border: '1px solid #fcc',
            borderRadius: '4px',
            marginBottom: '1rem'
          }}>
            <strong>Error:</strong> {error instanceof Error ? error.message : 'Failed to load projects'}
          </div>
        )}

        {projects && projects.length > 0 && (
          <>
            {/* Filters */}
            <div style={{
              backgroundColor: '#fff',
              padding: '1.5rem',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              marginBottom: '2rem',
            }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>Filters</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
              }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                    Search
                  </label>
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={filters.search}
                    onChange={(e) => updateFilter('search', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => updateFilter('status', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                    }}
                  >
                    <option value="">All Statuses</option>
                    {uniqueStatuses.map(status => (
                      <option key={status.status} value={status.status}>
                        {status.status}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                    Assignee
                  </label>
                  <select
                    value={filters.assignee}
                    onChange={(e) => updateFilter('assignee', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                    }}
                  >
                    <option value="">All Assignees</option>
                    {uniqueAssignees.map(assignee => (
                      <option key={assignee.id} value={assignee.id}>
                        {assignee.username || assignee.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                    Has Due Date
                  </label>
                  <select
                    value={filters.hasDueDate}
                    onChange={(e) => updateFilter('hasDueDate', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                    }}
                  >
                    <option value="">All</option>
                    <option value="yes">Has Due Date</option>
                    <option value="no">No Due Date</option>
                  </select>
                </div>
                {uniqueCustomFields.length > 0 && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                      Custom Field
                    </label>
                    <select
                      value={filters.customField}
                      onChange={(e) => updateFilter('customField', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                      }}
                    >
                      <option value="">All Fields</option>
                      {uniqueCustomFields.map(field => (
                        <option key={field.id} value={field.id}>
                          {field.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              {(filters.search || filters.status || filters.assignee || filters.hasDueDate || filters.customField) && (
                <button
                  onClick={() => setFilters({ search: '', status: '', assignee: '', hasDueDate: '', customField: '' })}
                  style={{
                    marginTop: '1rem',
                    padding: '0.5rem 1rem',
                    backgroundColor: '#FF4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Assignee Tabs */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              marginBottom: '2rem',
              borderBottom: '2px solid #e5e7eb',
              overflowX: 'auto',
            }}>
              {assigneeTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedAssigneeTab(tab.id)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: selectedAssigneeTab === tab.id ? '#2244FF' : 'transparent',
                    color: selectedAssigneeTab === tab.id ? 'white' : '#666',
                    border: 'none',
                    borderBottom: selectedAssigneeTab === tab.id ? '2px solid #2244FF' : '2px solid transparent',
                    cursor: 'pointer',
                    fontWeight: selectedAssigneeTab === tab.id ? 600 : 400,
                    fontSize: '0.875rem',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                    marginBottom: '-2px',
                  }}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {/* Projects Table - Grouped by Assignee */}
            <div>
              {displayedProjects.length === 0 ? (
                <p style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                  No projects found.
                </p>
              ) : selectedAssigneeTab === 'all' ? (
                // Show grouped by assignee when "All Projects" is selected
                Array.from(projectsByAssignee.entries()).map(([assigneeId, { assignee, projects }]) => (
                  <div key={assigneeId} style={{ marginBottom: '3rem' }}>
                    <h2 style={{ 
                      fontSize: '1.25rem', 
                      fontWeight: 600, 
                      marginBottom: '1rem',
                      paddingBottom: '0.5rem',
                      borderBottom: '2px solid #2244FF',
                      color: '#2244FF',
                    }}>
                      {assignee.username || assignee.email || 'Unassigned'} ({projects.length})
                    </h2>
                    <div style={{
                      backgroundColor: '#fff',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      overflow: 'hidden',
                    }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                            <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Project</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Status</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Milestone</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Due Date</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Time Progress</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Latest Note</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Last Modified</th>
                            <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {projects.map((project) => {
                            const summary = projectSummaries?.[project.id];
                            return (
                              <ProjectTableRow 
                                key={project.id} 
                                project={project} 
                                summary={summary}
                                availableStatuses={uniqueStatuses}
                                availableMilestones={availableMilestones}
                                getMilestoneColor={getMilestoneColor}
                              />
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              ) : (
                // Show single table when specific assignee is selected
                <div style={{
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  overflow: 'hidden',
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Project</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Status</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Due Date</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Time Progress</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Latest Note</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Last Modified</th>
                        <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedProjects.map((project) => {
                        const summary = projectSummaries?.[project.id];
                        return (
                          <ProjectTableRow 
                            key={project.id} 
                            project={project} 
                            summary={summary}
                            availableStatuses={uniqueStatuses}
                          />
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
