'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClickUpTask } from '@/types/clickup';

interface SearchableSelectProps {
  value: string;
  options: ClickUpTask[];
  onChange: (value: string) => void;
  placeholder?: string;
}

function SearchableSelect({ value, options, onChange, placeholder = 'Select...' }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedProject = options.find(p => p.id === value);

  const filteredOptions = options.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '0.5rem',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '0.875rem',
          cursor: 'pointer',
          backgroundColor: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ color: value ? '#111' : '#9ca3af' }}>
          {selectedProject ? selectedProject.name : placeholder}
        </span>
        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>▼</span>
      </div>
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '0.25rem',
            backgroundColor: '#fff',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            zIndex: 1000,
            maxHeight: '300px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search projects..."
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: 'none',
              borderBottom: '1px solid #e5e7eb',
              fontSize: '0.875rem',
              outline: 'none',
            }}
            autoFocus
          />
          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.875rem', textAlign: 'center' }}>
                No projects found
              </div>
            ) : (
              filteredOptions.map((project) => (
                <div
                  key={project.id}
                  onClick={() => {
                    onChange(project.id);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  style={{
                    padding: '0.75rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    backgroundColor: value === project.id ? '#f3f4f6' : '#fff',
                    borderBottom: '1px solid #f3f4f6',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (value !== project.id) {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (value !== project.id) {
                      e.currentTarget.style.backgroundColor = '#fff';
                    }
                  }}
                >
                  {project.name}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface Timer {
  id: string;
  name: string;
  startTime: number;
  elapsed: number;
  isRunning: boolean;
  isPaused: boolean;
  projectId?: string;
  projectName?: string;
  description?: string;
}

async function fetchProjects(): Promise<ClickUpTask[]> {
  const response = await fetch('/api/projects');
  if (!response.ok) {
    throw new Error('Failed to fetch projects');
  }
  const data = await response.json();
  return data.projects || [];
}

export default function TimeTrackingPage() {
  const [timers, setTimers] = useState<Timer[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: projects } = useQuery<ClickUpTask[]>({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  });

  // Load timers from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('timers');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTimers(parsed.map((t: any) => ({
          ...t,
          isRunning: false, // Don't auto-resume on page load
          isPaused: true,
        })));
      } catch (e) {
        console.error('Failed to load timers:', e);
      }
    }
  }, []);

  // Save timers to localStorage
  useEffect(() => {
    if (timers.length > 0) {
      localStorage.setItem('timers', JSON.stringify(timers));
    }
  }, [timers]);

  // Update running timers
  useEffect(() => {
    if (timers.some(t => t.isRunning)) {
      intervalRef.current = setInterval(() => {
        setTimers(prev => prev.map(timer => {
          if (timer.isRunning) {
            return {
              ...timer,
              elapsed: Date.now() - timer.startTime,
            };
          }
          return timer;
        }));
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timers]);

  const createTimer = () => {
    const newTimer: Timer = {
      id: Date.now().toString(),
      name: '',
      startTime: Date.now(),
      elapsed: 0,
      isRunning: true,
      isPaused: false,
    };
    setTimers([...timers, newTimer]);
  };

  const startTimer = (id: string) => {
    setTimers(prev => prev.map(timer => {
      if (timer.id === id) {
        return {
          ...timer,
          isRunning: true,
          isPaused: false,
          startTime: Date.now() - timer.elapsed,
        };
      }
      return timer;
    }));
  };

  const pauseTimer = (id: string) => {
    setTimers(prev => prev.map(timer => {
      if (timer.id === id && timer.isRunning) {
        return {
          ...timer,
          isRunning: false,
          isPaused: true,
        };
      }
      return timer;
    }));
  };

  const deleteTimer = (id: string) => {
    setTimers(prev => prev.filter(t => t.id !== id));
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const updateTimer = (id: string, updates: Partial<Timer>) => {
    setTimers(prev => prev.map(timer => {
      if (timer.id === id) {
        return { ...timer, ...updates };
      }
      return timer;
    }));
  };

  const completeTimer = async (timer: Timer) => {
    if (!timer.projectId) {
      alert('Please assign a project before completing the timer');
      return;
    }

    // timer.elapsed is already in milliseconds (Date.now() - startTime)
    const durationMs = Math.floor(timer.elapsed);

    try {
      const response = await fetch(`/api/projects/${timer.projectId}/time`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          duration: durationMs, // Already in milliseconds
          description: timer.description || `Time tracked: ${timer.projectName || 'Project'}`,
          billable: true,
        }),
      });

      if (!response.ok) {
        let errorMessage = `Failed to save time entry: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error('API Error Response:', errorData);
        } catch (e) {
          const text = await response.text();
          console.error('API Error Response (text):', text);
          errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Remove timer after successful save
      setTimers(prev => prev.filter(t => t.id !== timer.id));
      alert('Time entry saved to ClickUp successfully!');
    } catch (error) {
      console.error('Error saving time entry:', error);
      alert(error instanceof Error ? error.message : 'Failed to save time entry');
    }
  };

  return (
    <ProtectedRoute>
      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1>Time Tracking</h1>
          <button
            onClick={createTimer}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#2244FF',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '1rem',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1a36cc';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#2244FF';
            }}
          >
            + New Timer
          </button>
        </div>

        {timers.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '2px dashed #e5e7eb',
          }}>
            <p style={{ fontSize: '1.125rem', color: '#6b7280', marginBottom: '1rem' }}>
              No active timers
            </p>
            <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>
              Click &quot;New Timer&quot; to start tracking your time
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            {timers.map((timer) => (
              <div
                key={timer.id}
                style={{
                  padding: '1.5rem',
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111', marginBottom: '0.5rem' }}>
                    {timer.projectName || 'No project selected'}
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: '#2244FF' }}>
                    {formatTime(timer.elapsed)}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                      Project
                    </label>
                    <SearchableSelect
                      value={timer.projectId || ''}
                      options={projects || []}
                      onChange={(projectId) => {
                        const project = projects?.find(p => p.id === projectId);
                        updateTimer(timer.id, {
                          projectId: projectId,
                          projectName: project?.name,
                        });
                      }}
                      placeholder="Search for a project..."
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                      Description (optional)
                    </label>
                    <input
                      type="text"
                      value={timer.description || ''}
                      onChange={(e) => updateTimer(timer.id, { description: e.target.value })}
                      placeholder="What did you work on?"
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {timer.isRunning ? (
                      <button
                        onClick={() => pauseTimer(timer.id)}
                        style={{
                          flex: 1,
                          padding: '0.5rem 1rem',
                          backgroundColor: '#FF3388',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#cc2970';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#FF3388';
                        }}
                      >
                        Pause
                      </button>
                    ) : (
                      <button
                        onClick={() => startTimer(timer.id)}
                        style={{
                          flex: 1,
                          padding: '0.5rem 1rem',
                          backgroundColor: '#00B000',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#008d00';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#00B000';
                        }}
                      >
                        Start
                      </button>
                    )}
                    <button
                      onClick={() => deleteTimer(timer.id)}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#FF4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#cc3636';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FF4444';
                      }}
                    >
                      Delete
                    </button>
                  </div>
                  <button
                    onClick={() => completeTimer(timer)}
                    disabled={!timer.projectId || timer.isRunning}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      backgroundColor: timer.projectId && !timer.isRunning ? '#2244FF' : '#9ca3af',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: timer.projectId && !timer.isRunning ? 'pointer' : 'not-allowed',
                      fontWeight: 600,
                      transition: 'background-color 0.2s',
                      fontSize: '0.875rem',
                    }}
                    onMouseEnter={(e) => {
                      if (timer.projectId && !timer.isRunning) {
                        e.currentTarget.style.backgroundColor = '#1a36cc';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (timer.projectId && !timer.isRunning) {
                        e.currentTarget.style.backgroundColor = '#2244FF';
                      }
                    }}
                  >
                    Complete & Send to ClickUp
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

