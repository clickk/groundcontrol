'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { ClickUpTask, ClickUpComment } from '@/types/clickup';

interface ProjectCardProps {
  project: ClickUpTask;
  summary?: { latestComment: ClickUpComment | null; totalTime: number };
}

export function ProjectCard({ project, summary }: ProjectCardProps) {
  const queryClient = useQueryClient();
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [addingComment, setAddingComment] = useState(false);

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

  const [isFlashing, setIsFlashing] = useState(false);

  // Find Time Estimate custom field
  const getTimeEstimate = (project: ClickUpTask): number | null => {
    if (!project.custom_fields) return null;
    // Try multiple field name patterns
    const estimateField = project.custom_fields.find(f => {
      const name = f.name.toLowerCase();
      return name.includes('time estimate') || 
             name.includes('estimate') ||
             name.includes('timeest') ||
             (f.type === 'time_estimate' || f.type === 'number');
    });
    if (estimateField) {
      // Handle different value types
      if (typeof estimateField.value === 'number') {
        return estimateField.value;
      }
      if (typeof estimateField.value === 'string') {
        const parsed = parseFloat(estimateField.value);
        if (!isNaN(parsed)) return parsed;
      }
      // Check if value is in type_config (some ClickUp fields store values differently)
      if (estimateField.type_config && typeof estimateField.type_config.value === 'number') {
        return estimateField.type_config.value;
      }
    }
    return null;
  };

  const timeEstimate = getTimeEstimate(project);
  const trackedTime = summary?.totalTime || 0;
  
  // Calculate percentage
  const percentage = timeEstimate ? (trackedTime / timeEstimate) * 100 : null;
  
  // Determine status and color
  const getStatus = (): { color: string; isFlashing: boolean } => {
    if (!percentage) return { color: '#9ca3af', isFlashing: false };
    if (percentage < 80) return { color: '#00B000', isFlashing: false };
    if (percentage <= 100) return { color: '#FF3388', isFlashing: false }; // Orange
    if (percentage < 150) return { color: '#FF4444', isFlashing: false }; // Red
    return { color: '#FF4444', isFlashing: true }; // Flashing red
  };

  const status = getStatus();

  // Handle flashing animation
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

  // Calculate circle progress
  const circleSize = 60;
  const strokeWidth = 6;
  const radius = (circleSize - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = percentage ? Math.min(percentage, 150) / 150 : 0; // Cap at 150% for display
  const strokeDashoffset = circumference - (progress * circumference);

  return (
    <div style={{ position: 'relative' }}>
      <Link
        href={`/project/${project.id}`}
        style={{
          display: 'block',
          padding: '1.5rem',
          border: '1px solid #ddd',
          borderRadius: '8px',
          textDecoration: 'none',
          color: 'inherit',
          backgroundColor: '#fff',
          transition: 'box-shadow 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#2244FF' }}>
          {project.name}
        </h3>
        <div style={{ marginBottom: '0.5rem' }}>
          <span
            style={{
              display: 'inline-block',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              backgroundColor: project.status?.color || '#ccc',
              color: '#fff',
              fontSize: '0.875rem',
            }}
          >
            {project.status?.status || 'No status'}
          </span>
        </div>
        {project.assignees && project.assignees.length > 0 && (
          <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
            <strong>Assignees:</strong>{' '}
            {project.assignees.map((a) => a.username || a.email).join(', ')}
          </div>
        )}
        {project.due_date && (
          <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
            <strong>Due:</strong> {new Date(parseInt(project.due_date)).toLocaleDateString()}
          </div>
        )}
        {project.start_date && (
          <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
            <strong>Start:</strong> {new Date(parseInt(project.start_date)).toLocaleDateString()}
          </div>
        )}
        
        {/* Last Modified */}
        {project.date_updated && (
          <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
            <strong>Last Modified:</strong> {new Date(parseInt(project.date_updated)).toLocaleDateString()}
          </div>
        )}
        
        {/* Time Estimate vs Tracked Time - Circular Progress */}
        <div style={{ 
            marginTop: '1rem', 
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '0.75rem',
            backgroundColor: '#f9fafb',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
          }}>
            {/* Circular Progress */}
            <div style={{ position: 'relative', width: circleSize, height: circleSize }}>
              <svg width={circleSize} height={circleSize} style={{ transform: 'rotate(-90deg)' }}>
                {/* Background circle */}
                <circle
                  cx={circleSize / 2}
                  cy={circleSize / 2}
                  r={radius}
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth={strokeWidth}
                />
                {/* Progress circle */}
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
              {/* Center text */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#374151',
              }}>
                {percentage !== null ? `${percentage.toFixed(0)}%` : 'N/A'}
              </div>
            </div>
            
            {/* Time details */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: '#374151' }}>
                Time Estimate vs Tracked
              </div>
              <div style={{ fontSize: '0.875rem', color: '#666' }}>
                <strong>Tracked:</strong> {trackedTime.toFixed(1)}h
              </div>
              {timeEstimate !== null ? (
                <div style={{ fontSize: '0.875rem', color: '#666' }}>
                  <strong>Estimate:</strong> {timeEstimate}h
                </div>
              ) : (
                <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                  <strong>Estimate:</strong> Not set
                </div>
              )}
            </div>
          </div>

        {/* Latest Project Note */}
        {latestComment && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.75rem',
            backgroundColor: '#FFCAEB',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
          }}>
            <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>
              Latest Project Note
            </div>
            <div style={{ fontSize: '0.875rem', color: '#111', fontWeight: 500 }}>
              {latestComment.comment_text.length > 100 
                ? latestComment.comment_text.substring(0, 100) + '...'
                : latestComment.comment_text}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
              {latestComment.user.username || latestComment.user.email} • {new Date(parseInt(latestComment.date)).toLocaleDateString()}
            </div>
          </div>
        )}
      </Link>
      
      {/* Quick Comment Button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowCommentInput(!showCommentInput);
        }}
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          backgroundColor: '#2244FF',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          fontSize: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          zIndex: 10,
        }}
        title="Add project note"
      >
        💬
      </button>
      
      {/* Project Note Input */}
      {showCommentInput && (
        <div
          style={{
            position: 'absolute',
            top: '3rem',
            right: '1rem',
            left: '1rem',
            backgroundColor: '#fff',
            border: '2px solid #2244FF',
            borderRadius: '8px',
            padding: '1rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 20,
          }}
          onClick={(e) => e.stopPropagation()}
        >
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
      )}
    </div>
  );
}

