'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { ClickUpTask, ClickUpUser } from '@/types/clickup';
import { useState, useMemo, useEffect, useRef } from 'react';
import { getWeekNumber } from '@/lib/utils/timezone';

interface TimelineSchedule {
  id: string;
  clickupTaskId: string;
  assigneeId: string;
  dayIndex: number;
  scheduledDate: string;
}

interface ProjectDay {
  project: ClickUpTask;
  dayIndex: number;
  scheduledDate: Date;
  assigneeId: string;
}

async function fetchProjects(): Promise<ClickUpTask[]> {
  const response = await fetch('/api/projects');
  if (!response.ok) {
    throw new Error('Failed to fetch projects');
  }
  const data = await response.json();
  return data.projects || [];
}

async function fetchSchedules(projectIds: string[]): Promise<TimelineSchedule[]> {
  if (projectIds.length === 0) return [];
  const response = await fetch(`/api/timeline/schedule?${projectIds.map(id => `clickupTaskId=${id}`).join('&')}`);
  if (!response.ok) return [];
  const data = await response.json();
  return data.schedules || [];
}

export default function PlannerPage() {
  const queryClient = useQueryClient();
  const { data: projects, isLoading } = useQuery<ClickUpTask[]>({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  });

  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [showAddProjectModal, setShowAddProjectModal] = useState<{ assigneeId: string } | null>(null);
  const [draggedProject, setDraggedProject] = useState<{ project: ClickUpTask; assigneeId: string; startDayIndex: number } | null>(null);
  const [resizingProject, setResizingProject] = useState<{ project: ClickUpTask; assigneeId: string; isEnd: boolean; startX: number } | null>(null);
  const resizeRef = useRef<HTMLDivElement>(null);

  // Get time estimate helper
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

  // Calculate number of days for a project (8 hours per day)
  const getProjectDays = (project: ClickUpTask): number => {
    const hours = getTimeEstimate(project);
    if (!hours) return 1; // Default to 1 day if no estimate
    return Math.ceil(hours / 8); // Round up to nearest day
  };

  // Get unique assignees
  const assignees = useMemo(() => {
    if (!projects) return [];
    const assigneeMap = new Map<string, ClickUpUser>();
    projects.forEach(p => {
      p.assignees?.forEach(a => {
        assigneeMap.set(a.id, a);
      });
    });
    return Array.from(assigneeMap.values());
  }, [projects]);

  // Get week dates (Monday to Friday)
  const getWeekDates = (date: Date) => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(date);
    monday.setDate(date.getDate() - day + (day === 0 ? -6 : 1));
    const dates = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const weekDates = getWeekDates(new Date(selectedWeek));

  // Fetch schedules for all projects
  const projectIds = useMemo(() => projects?.map(p => p.id) || [], [projects]);
  const { data: schedules = [] } = useQuery<TimelineSchedule[]>({
    queryKey: ['timelineSchedules', projectIds.join(',')],
    queryFn: () => fetchSchedules(projectIds),
    enabled: projectIds.length > 0,
  });

  // Initialize schedules for projects that don't have them
  const initializeSchedulesMutation = useMutation({
    mutationFn: async (projectDays: Array<{ project: ClickUpTask; assigneeId: string; days: number }>) => {
      const schedulesToCreate: Array<{ clickupTaskId: string; assigneeId: string; dayIndex: number; scheduledDate: string }> = [];
      
      projectDays.forEach(({ project, assigneeId, days }) => {
        let startDate: Date;
        
        // If there's a due_date, work backwards from it
        if (project.due_date) {
          const dueDate = new Date(parseInt(project.due_date));
          // Calculate start date by working backwards from due date
          // Count only working days (skip weekends)
          startDate = new Date(dueDate);
          let workingDaysToSubtract = days - 1; // -1 because we include the due date day
          
          while (workingDaysToSubtract > 0) {
            startDate.setDate(startDate.getDate() - 1);
            // Skip weekends
            while (startDate.getDay() === 0 || startDate.getDay() === 6) {
              startDate.setDate(startDate.getDate() - 1);
            }
            workingDaysToSubtract--;
          }
        } else if (project.start_date) {
          startDate = new Date(parseInt(project.start_date));
        } else {
          startDate = new Date(); // Default to today if no start date
        }
        
        for (let i = 0; i < days; i++) {
          const scheduledDate = new Date(startDate);
          scheduledDate.setDate(startDate.getDate() + i);
          // Skip weekends
          while (scheduledDate.getDay() === 0 || scheduledDate.getDay() === 6) {
            scheduledDate.setDate(scheduledDate.getDate() + 1);
          }
          
          schedulesToCreate.push({
            clickupTaskId: project.id,
            assigneeId: String(assigneeId), // Ensure assigneeId is always a string
            dayIndex: i,
            scheduledDate: scheduledDate.toISOString(),
          });
        }
      });

      if (schedulesToCreate.length === 0) return { schedules: [] };

      const response = await fetch('/api/timeline/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedules: schedulesToCreate }),
      });
      if (!response.ok) throw new Error('Failed to initialize schedules');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timelineSchedules'] });
    },
  });

  // Build project days from schedules
  const projectDaysByAssignee = useMemo(() => {
    if (!projects || !schedules) return new Map<string, ProjectDay[]>();
    
    const daysMap = new Map<string, ProjectDay[]>();
    
    projects.forEach(project => {
      const days = getProjectDays(project);
      project.assignees?.forEach(assignee => {
        for (let i = 0; i < days; i++) {
          const schedule = schedules.find(
            s => s.clickupTaskId === project.id && s.dayIndex === i && s.assigneeId === assignee.id
          );
          
          if (schedule) {
            const day: ProjectDay = {
              project,
              dayIndex: i,
              scheduledDate: new Date(schedule.scheduledDate),
              assigneeId: assignee.id,
            };
            
            if (!daysMap.has(assignee.id)) {
              daysMap.set(assignee.id, []);
            }
            daysMap.get(assignee.id)!.push(day);
          }
        }
      });
    });

    // Sort days by scheduled date
    daysMap.forEach((days) => {
      days.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
    });

    return daysMap;
  }, [projects, schedules]);

  // Initialize schedules for projects without them
  useEffect(() => {
    if (!projects || schedules.length === 0) return;
    
    const projectsNeedingInit: Array<{ project: ClickUpTask; assigneeId: string; days: number }> = [];
    
    projects.forEach(project => {
      const days = getProjectDays(project);
      project.assignees?.forEach(assignee => {
        const hasSchedule = schedules.some(
          s => s.clickupTaskId === project.id && s.assigneeId === assignee.id
        );
        if (!hasSchedule && days > 0) {
          projectsNeedingInit.push({ project, assigneeId: assignee.id, days });
        }
      });
    });

    if (projectsNeedingInit.length > 0) {
      initializeSchedulesMutation.mutate(projectsNeedingInit);
    }
  }, [projects, schedules]);

  const updateScheduleMutation = useMutation({
    mutationFn: async ({ clickupTaskId, assigneeId, dayIndex, scheduledDate }: {
      clickupTaskId: string;
      assigneeId: string;
      dayIndex: number;
      scheduledDate: Date;
    }) => {
      const response = await fetch('/api/timeline/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clickupTaskId,
          assigneeId,
          dayIndex,
          scheduledDate: scheduledDate.toISOString(),
        }),
      });
      if (!response.ok) throw new Error('Failed to update schedule');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timelineSchedules'] });
    },
  });

  // Bulk update mutation
  const bulkUpdateScheduleMutation = useMutation({
    mutationFn: async ({ schedules: scheduleUpdates }: { schedules: Array<{ clickupTaskId: string; assigneeId: string; dayIndex: number; scheduledDate: string }> }) => {
      const response = await fetch('/api/timeline/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedules: scheduleUpdates }),
      });
      if (!response.ok) throw new Error('Failed to update schedules');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timelineSchedules'] });
    },
  });

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Get all days for a project for a specific assignee
  const getProjectDaysForAssignee = (project: ClickUpTask, assigneeId: string): ProjectDay[] => {
    const days = getProjectDays(project);
    const projectDays: ProjectDay[] = [];
    
    for (let i = 0; i < days; i++) {
      const schedule = schedules.find(
        s => s.clickupTaskId === project.id && s.dayIndex === i && s.assigneeId === assigneeId
      );
      
      if (schedule) {
        projectDays.push({
          project,
          dayIndex: i,
          scheduledDate: new Date(schedule.scheduledDate),
          assigneeId,
        });
      }
    }
    
    return projectDays.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  };

  // Handle drag start for entire project
  const handleProjectDragStart = (e: React.DragEvent, project: ClickUpTask, assigneeId: string) => {
    const projectDays = getProjectDaysForAssignee(project, assigneeId);
    if (projectDays.length === 0) return;
    
    const firstDay = projectDays[0];
    setDraggedProject({
      project,
      assigneeId,
      startDayIndex: firstDay.dayIndex,
    });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drop to move entire project
  const handleProjectDrop = (e: React.DragEvent, targetDate: Date, targetAssigneeId: string) => {
    e.preventDefault();
    if (!draggedProject) return;

    const projectDays = getProjectDaysForAssignee(draggedProject.project, draggedProject.assigneeId);
    if (projectDays.length === 0) return;

    // Calculate the offset from the first day
    const firstDayDate = projectDays[0].scheduledDate;
    const daysOffset = Math.floor((targetDate.getTime() - firstDayDate.getTime()) / (24 * 60 * 60 * 1000));
    
    // Skip weekends in the offset calculation
    let adjustedOffset = daysOffset;
    let currentDate = new Date(firstDayDate);
    for (let i = 0; i < Math.abs(daysOffset); i++) {
      currentDate.setDate(currentDate.getDate() + (daysOffset > 0 ? 1 : -1));
      if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
        adjustedOffset += daysOffset > 0 ? 1 : -1;
      }
    }

    // Update all days for this project
    const updates = projectDays.map(day => {
      const newDate = new Date(day.scheduledDate);
      newDate.setDate(newDate.getDate() + adjustedOffset);
      // Skip weekends
      while (newDate.getDay() === 0 || newDate.getDay() === 6) {
        newDate.setDate(newDate.getDate() + 1);
      }
      
      return {
        clickupTaskId: day.project.id,
        assigneeId: String(targetAssigneeId), // Ensure assigneeId is always a string
        dayIndex: day.dayIndex,
        scheduledDate: newDate,
      };
    });

    // Bulk update all schedules
    bulkUpdateScheduleMutation.mutate({ schedules: updates });
    setDraggedProject(null);
  };

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent, project: ClickUpTask, assigneeId: string, isEnd: boolean) => {
    e.stopPropagation();
    setResizingProject({
      project,
      assigneeId,
      isEnd,
      startX: e.clientX,
    });
  };

  // Handle resize mouse move
  useEffect(() => {
    if (!resizingProject) return;

    let pendingUpdate: NodeJS.Timeout | null = null;
    let lastAppliedDelta = 0;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingProject) return;
      
      const projectDays = getProjectDaysForAssignee(resizingProject.project, resizingProject.assigneeId);
      if (projectDays.length === 0) return;

      // Get the container element to calculate proper cell width
      const container = document.querySelector('[style*="gridTemplateColumns: \'200px repeat(5, 1fr)\'"]') as HTMLElement;
      const cellWidth = container ? (container.offsetWidth - 200) / 5 : 200;
      
      const deltaX = e.clientX - resizingProject.startX;
      const daysDelta = Math.round(deltaX / cellWidth);

      // Debounce updates to avoid too many API calls
      if (pendingUpdate) {
        clearTimeout(pendingUpdate);
      }

      pendingUpdate = setTimeout(() => {
        if (!resizingProject || Math.abs(daysDelta - lastAppliedDelta) < 1) return;
        lastAppliedDelta = daysDelta;

        const lastDay = projectDays[projectDays.length - 1];
        
        if (resizingProject.isEnd) {
          // Extending/contracting from the end
          const newDayCount = Math.max(1, projectDays.length + daysDelta);
          
          if (newDayCount === projectDays.length) return; // No change needed
          
          const updates: Array<{ clickupTaskId: string; assigneeId: string; dayIndex: number; scheduledDate: string }> = [];
          const toDelete: Array<{ clickupTaskId: string; assigneeId: string; dayIndex: number }> = [];
          
          if (newDayCount > projectDays.length) {
            // Extending: add new days after the last day
            for (let i = projectDays.length; i < newDayCount; i++) {
              const newDate = new Date(lastDay.scheduledDate);
              newDate.setDate(newDate.getDate() + (i - projectDays.length + 1));
              // Skip weekends
              while (newDate.getDay() === 0 || newDate.getDay() === 6) {
                newDate.setDate(newDate.getDate() + 1);
              }
              updates.push({
                clickupTaskId: resizingProject.project.id,
                assigneeId: String(resizingProject.assigneeId), // Ensure assigneeId is always a string
                dayIndex: i,
                scheduledDate: newDate.toISOString(),
              });
            }
          } else {
            // Contracting: remove days from the end
            for (let i = newDayCount; i < projectDays.length; i++) {
              toDelete.push({
                clickupTaskId: resizingProject.project.id,
                assigneeId: String(resizingProject.assigneeId), // Ensure assigneeId is always a string
                dayIndex: i,
              });
            }
          }
          
          // Apply updates
          if (updates.length > 0) {
            bulkUpdateScheduleMutation.mutate({ schedules: updates });
          }
          if (toDelete.length > 0) {
            // Delete removed days
            Promise.all(toDelete.map(d => 
              fetch(`/api/timeline/schedule?clickupTaskId=${d.clickupTaskId}&assigneeId=${d.assigneeId}&dayIndex=${d.dayIndex}`, {
                method: 'DELETE',
              })
            )).then(() => {
              queryClient.invalidateQueries({ queryKey: ['timelineSchedules'] });
            });
          }
        }
      }, 100); // Debounce for 100ms
    };

    const handleMouseUp = () => {
      if (pendingUpdate) {
        clearTimeout(pendingUpdate);
        pendingUpdate = null;
      }
      setResizingProject(null);
      lastAppliedDelta = 0;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      if (pendingUpdate) clearTimeout(pendingUpdate);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingProject, projects, schedules, queryClient]);

  const handleAddProject = (assigneeId: string) => {
    setShowAddProjectModal({ assigneeId });
  };

  const assignProjectMutation = useMutation({
    mutationFn: async ({ projectId, assigneeId }: { projectId: string; assigneeId: string }) => {
      // First, assign the project to the assignee in ClickUp
      const assignResponse = await fetch(`/api/projects/${projectId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: assigneeId }),
      });
      if (!assignResponse.ok) {
        const error = await assignResponse.json();
        throw new Error(error.error || 'Failed to assign project');
      }

      // Then initialize the schedule for this project
      const project = projects?.find(p => p.id === projectId);
      if (!project) throw new Error('Project not found');

      const days = getProjectDays(project);
      if (days === 0) return { success: true };

      const schedulesToCreate: Array<{ clickupTaskId: string; assigneeId: string; dayIndex: number; scheduledDate: string }> = [];
      
      let startDate: Date;
      // If there's a due_date, work backwards from it
      if (project.due_date) {
        const dueDate = new Date(parseInt(project.due_date));
        // Calculate start date by working backwards from due date
        // Count only working days (skip weekends)
        startDate = new Date(dueDate);
        let workingDaysToSubtract = days - 1; // -1 because we include the due date day
        
        while (workingDaysToSubtract > 0) {
          startDate.setDate(startDate.getDate() - 1);
          // Skip weekends
          while (startDate.getDay() === 0 || startDate.getDay() === 6) {
            startDate.setDate(startDate.getDate() - 1);
          }
          workingDaysToSubtract--;
        }
      } else if (project.start_date) {
        startDate = new Date(parseInt(project.start_date));
      } else {
        startDate = weekDates[0]; // Default to start of current week
      }

      for (let i = 0; i < days; i++) {
        const scheduledDate = new Date(startDate);
        scheduledDate.setDate(startDate.getDate() + i);
        // Skip weekends
        while (scheduledDate.getDay() === 0 || scheduledDate.getDay() === 6) {
          scheduledDate.setDate(scheduledDate.getDate() + 1);
        }
        
        schedulesToCreate.push({
          clickupTaskId: projectId,
          assigneeId: String(assigneeId), // Ensure assigneeId is always a string
          dayIndex: i,
          scheduledDate: scheduledDate.toISOString(),
        });
      }

      if (schedulesToCreate.length > 0) {
        const scheduleResponse = await fetch('/api/timeline/schedule', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schedules: schedulesToCreate }),
        });
        if (!scheduleResponse.ok) {
          const errorData = await scheduleResponse.json().catch(() => ({}));
          console.error('Schedule creation error:', errorData);
          throw new Error(errorData.error || `Failed to create schedule: ${scheduleResponse.statusText}`);
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['timelineSchedules'] });
      setShowAddProjectModal(null);
    },
  });

  // Check if a date is in the current week
  const isDateInWeek = (date: Date): boolean => {
    const weekStart = weekDates[0].getTime();
    const weekEnd = weekDates[4].getTime() + (24 * 60 * 60 * 1000);
    const dateTime = date.getTime();
    return dateTime >= weekStart && dateTime < weekEnd;
  };

  // Get which day of the week a date falls on (0-4 for Mon-Fri)
  const getDayOfWeek = (date: Date): number | null => {
    if (!isDateInWeek(date)) return null;
    const weekStart = weekDates[0].getTime();
    const dateTime = date.getTime();
    const dayIndex = Math.floor((dateTime - weekStart) / (24 * 60 * 60 * 1000));
    return dayIndex >= 0 && dayIndex < 5 ? dayIndex : null;
  };

  return (
    <ProtectedRoute>
      <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1>Timeline</h1>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              onClick={() => {
                const prevWeek = new Date(selectedWeek);
                prevWeek.setDate(prevWeek.getDate() - 7);
                setSelectedWeek(prevWeek);
              }}
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
              ← Previous
            </button>
            <span style={{ fontWeight: 600 }}>
              Week {getWeekNumber(weekDates[0])} - {weekDates[0].toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => {
                const nextWeek = new Date(selectedWeek);
                nextWeek.setDate(nextWeek.getDate() + 7);
                setSelectedWeek(nextWeek);
              }}
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
              Next →
            </button>
          </div>
        </div>

        {isLoading ? (
          <p>Loading timeline...</p>
        ) : (
          <div style={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '200px repeat(5, 1fr)',
              borderBottom: '2px solid #e5e7eb',
              backgroundColor: '#f9fafb',
            }}>
              <div style={{ padding: '1rem', fontWeight: 600, borderRight: '1px solid #e5e7eb' }}>
                Assignee
              </div>
              {weekDates.map((date, idx) => {
                const today = new Date();
                const isToday = date.toDateString() === today.toDateString();
                
                return (
                  <div
                    key={idx}
                    style={{
                      padding: '1rem',
                      textAlign: 'center',
                      fontWeight: 600,
                      borderRight: idx < 4 ? '1px solid #e5e7eb' : 'none',
                    }}
                  >
                    <div style={{ textDecoration: isToday ? 'underline' : 'none' }}>
                      {formatDate(date)}
                    </div>
                    {idx === 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                        Week {getWeekNumber(date)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Rows */}
            {assignees.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                No assignees found
              </div>
            ) : (
              assignees.map((assignee) => {
                const days = projectDaysByAssignee.get(assignee.id) || [];
                const daysInWeek = days.filter(d => isDateInWeek(d.scheduledDate));

                return (
                  <div
                    key={assignee.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '200px repeat(5, 1fr)',
                      borderBottom: '1px solid #e5e7eb',
                      minHeight: '120px',
                      position: 'relative',
                    }}
                  >
                    <div style={{
                      padding: '1rem',
                      borderRight: '1px solid #e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#f9fafb',
                    }}>
                      <span style={{ fontWeight: 600 }}>{assignee.username || assignee.email}</span>
                      <button
                        onClick={() => handleAddProject(assignee.id)}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          border: 'none',
                          backgroundColor: '#00B000',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '1.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 600,
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#008d00';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#00B000';
                        }}
                        title="Add project"
                      >
                        +
                      </button>
                    </div>
                    {/* Day columns container */}
                    <div style={{
                      gridColumn: '2 / -1',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      position: 'relative',
                    }}>
                      {weekDates.map((date, dateIdx) => (
                        <div
                          key={dateIdx}
                          style={{
                            padding: '0.5rem',
                            borderRight: dateIdx < 4 ? '1px solid #e5e7eb' : 'none',
                            minHeight: '120px',
                          }}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleProjectDrop(e, date, assignee.id)}
                        />
                      ))}
                      {/* Project blocks - grouped by project */}
                      {(() => {
                        // Group days by project
                        const projectsMap = new Map<string, ProjectDay[]>();
                        daysInWeek.forEach(day => {
                          const key = `${day.project.id}-${day.assigneeId}`;
                          if (!projectsMap.has(key)) {
                            projectsMap.set(key, []);
                          }
                          projectsMap.get(key)!.push(day);
                        });

                        const projectBlocks: Array<{ project: ClickUpTask; days: ProjectDay[]; top: number }> = [];
                        let currentTop = 5;
                        
                        projectsMap.forEach((projectDays, key) => {
                          if (projectDays.length === 0) return;
                          
                          // Sort days by scheduled date
                          projectDays.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
                          
                          const firstDay = projectDays[0];
                          const lastDay = projectDays[projectDays.length - 1];
                          
                          const firstDayOfWeek = getDayOfWeek(firstDay.scheduledDate);
                          const lastDayOfWeek = getDayOfWeek(lastDay.scheduledDate);
                          
                          if (firstDayOfWeek === null) return;
                          
                          const cellWidth = 100 / 5; // Each day is 20% of the week
                          const leftPercent = firstDayOfWeek * cellWidth;
                          const widthPercent = lastDayOfWeek !== null 
                            ? (lastDayOfWeek - firstDayOfWeek + 1) * cellWidth
                            : cellWidth;
                          
                          projectBlocks.push({
                            project: firstDay.project,
                            days: projectDays,
                            top: currentTop,
                          });
                          
                          currentTop += 35; // Space between projects
                        });

                        return projectBlocks.map((block, blockIdx) => {
                          const firstDay = block.days[0];
                          const lastDay = block.days[block.days.length - 1];
                          const firstDayOfWeek = getDayOfWeek(firstDay.scheduledDate);
                          const lastDayOfWeek = getDayOfWeek(lastDay.scheduledDate);
                          
                          if (firstDayOfWeek === null) return null;
                          
                          const cellWidth = 100 / 5;
                          const leftPercent = firstDayOfWeek * cellWidth;
                          const widthPercent = lastDayOfWeek !== null 
                            ? (lastDayOfWeek - firstDayOfWeek + 1) * cellWidth
                            : cellWidth;
                          
                          const isDragging = draggedProject?.project.id === block.project.id && 
                                           draggedProject?.assigneeId === firstDay.assigneeId;
                          
                          return (
                            <div
                              key={`${block.project.id}-${firstDay.assigneeId}`}
                              draggable
                              onDragStart={(e) => handleProjectDragStart(e, block.project, firstDay.assigneeId)}
                              style={{
                                position: 'absolute',
                                left: `${leftPercent}%`,
                                width: `${widthPercent}%`,
                                top: `${block.top}px`,
                                height: '30px',
                                padding: '0.25rem 0.5rem',
                                backgroundColor: isDragging ? '#88C8FF' : '#A8E1FF',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                cursor: 'grab',
                                border: '1px solid #2244FF',
                                zIndex: 10,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                boxSizing: 'border-box',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                opacity: isDragging ? 0.7 : 1,
                              }}
                              onMouseDown={(e) => {
                                e.currentTarget.style.cursor = 'grabbing';
                              }}
                              onMouseUp={(e) => {
                                e.currentTarget.style.cursor = 'grab';
                              }}
                              title={`${block.project.name} - ${block.days.length} day${block.days.length !== 1 ? 's' : ''}`}
                            >
                              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {block.project.name}
                              </span>
                              {/* Resize handles */}
                              <div
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  handleResizeStart(e, block.project, firstDay.assigneeId, true);
                                }}
                                style={{
                                  width: '8px',
                                  height: '100%',
                                  cursor: 'ew-resize',
                                  backgroundColor: 'rgba(34, 68, 255, 0.3)',
                                  borderRadius: '0 4px 4px 0',
                                  marginLeft: '0.25rem',
                                }}
                                title="Resize project"
                              />
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Add Project Modal */}
        {showAddProjectModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}>
            <div style={{
              backgroundColor: '#fff',
              padding: '2rem',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '90%',
            }}>
              <h2 style={{ marginBottom: '1rem' }}>Add Project to Assignee</h2>
              <p style={{ marginBottom: '1rem', color: '#666' }}>
                Select a project to assign to this person. The project will be scheduled starting from the current week.
              </p>
              {assignProjectMutation.isError && (
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: '#fee',
                  border: '1px solid #fcc',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  color: '#c33',
                  fontSize: '0.875rem',
                }}>
                  {assignProjectMutation.error instanceof Error 
                    ? assignProjectMutation.error.message 
                    : 'Failed to assign project'}
                </div>
              )}
              <div style={{ marginBottom: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
                {projects?.filter(p => !p.assignees?.some(a => a.id === showAddProjectModal.assigneeId)).length === 0 ? (
                  <p style={{ color: '#666', textAlign: 'center', padding: '1rem' }}>
                    All projects are already assigned to this person
                  </p>
                ) : (
                  projects?.filter(p => !p.assignees?.some(a => a.id === showAddProjectModal.assigneeId)).map(project => {
                    const days = getProjectDays(project);
                    return (
                      <button
                        key={project.id}
                        onClick={() => {
                          assignProjectMutation.mutate({
                            projectId: project.id,
                            assigneeId: showAddProjectModal.assigneeId,
                          });
                        }}
                        disabled={assignProjectMutation.isPending}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '0.75rem',
                          marginBottom: '0.5rem',
                          textAlign: 'left',
                          backgroundColor: assignProjectMutation.isPending ? '#e5e7eb' : '#f9fafb',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          cursor: assignProjectMutation.isPending ? 'wait' : 'pointer',
                          opacity: assignProjectMutation.isPending ? 0.6 : 1,
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{project.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#666' }}>
                          {days} day{days !== 1 ? 's' : ''} estimated
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
              <button
                onClick={() => {
                  setShowAddProjectModal(null);
                  assignProjectMutation.reset();
                }}
                disabled={assignProjectMutation.isPending}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: assignProjectMutation.isPending ? '#9ca3af' : '#FF4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: assignProjectMutation.isPending ? 'wait' : 'pointer',
                }}
              >
                {assignProjectMutation.isPending ? 'Assigning...' : 'Cancel'}
              </button>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
