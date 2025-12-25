'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClickUpTask } from '@/types/clickup';
import { useState, useMemo } from 'react';
import Link from 'next/link';

async function fetchProjects(): Promise<ClickUpTask[]> {
  const response = await fetch('/api/projects');
  if (!response.ok) {
    throw new Error('Failed to fetch projects');
  }
  const data = await response.json();
  return data.projects || [];
}

export default function FinancialPage() {
  const queryClient = useQueryClient();
  const { data: projects, isLoading, error } = useQuery<ClickUpTask[]>({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  });

  const [selectedTab, setSelectedTab] = useState<'overview' | 'invoiced' | 'to-be-invoiced'>('overview');
  const [editingField, setEditingField] = useState<{ projectId: string; fieldId: string; fieldName: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const updateFieldMutation = useMutation({
    mutationFn: async ({ projectId, fieldId, value }: { projectId: string; fieldId: string; value: number }) => {
      const response = await fetch(`/api/projects/${projectId}/field`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldId, value }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to update field: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEditingField(null);
    },
    onError: (error: Error) => {
      alert(`Error updating field: ${error.message}`);
    },
  });

  // Calculate financial data
  const financialData = useMemo(() => {
    if (!projects) return { total: 0, invoiced: 0, toBeInvoiced: 0, projects: [], allProjects: [] };

    let total = 0;
    let invoiced = 0;
    let toBeInvoiced = 0;
    const projectData: Array<{
      project: ClickUpTask;
      total: number;
      invoiced: number;
      toBeInvoiced: number;
      invoicedPercent: number;
      projectTotalFieldId?: string;
      invoicedPercentFieldId?: string;
      hasProjectTotal: boolean;
    }> = [];

    projects.forEach(project => {
      const projectTotalField = project.custom_fields?.find(f => 
        f.name.toLowerCase().includes('project total')
      );
      const invoicedPercentField = project.custom_fields?.find(f => 
        f.name.toLowerCase().includes('% invoiced') || 
        (f.name.toLowerCase().includes('invoiced') && f.name.toLowerCase().includes('%'))
      );

      const projectTotal = projectTotalField?.value !== undefined && projectTotalField?.value !== null
        ? (typeof projectTotalField.value === 'number' ? projectTotalField.value : parseFloat(projectTotalField.value.toString()) || 0)
        : null;
      
      // Include all projects, but only calculate financials for those with Project Total
      if (projectTotal === null) {
        projectData.push({
          project,
          total: 0,
          invoiced: 0,
          toBeInvoiced: 0,
          invoicedPercent: 0,
          projectTotalFieldId: projectTotalField?.id, // Include field ID even if value is null so it can be edited
          invoicedPercentFieldId: invoicedPercentField?.id,
          hasProjectTotal: false,
        });
        return;
      }

      const invoicedPercent = invoicedPercentField?.value !== undefined && invoicedPercentField?.value !== null
        ? (typeof invoicedPercentField.value === 'number' ? invoicedPercentField.value : parseFloat(invoicedPercentField.value.toString()) || 0)
        : 0;

      const invoicedAmount = (projectTotal * invoicedPercent) / 100;
      const toBeInvoicedAmount = projectTotal - invoicedAmount;

      total += projectTotal;
      invoiced += invoicedAmount;
      toBeInvoiced += toBeInvoicedAmount;

      projectData.push({
        project,
        total: projectTotal,
        invoiced: invoicedAmount,
        toBeInvoiced: toBeInvoicedAmount,
        invoicedPercent,
        projectTotalFieldId: projectTotalField?.id,
        invoicedPercentFieldId: invoicedPercentField?.id,
        hasProjectTotal: true,
      });
    });

    return { total, invoiced, toBeInvoiced, projects: projectData, allProjects: projects };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    if (selectedTab === 'invoiced') {
      return financialData.projects.filter(p => p.invoicedPercent > 0);
    }
    if (selectedTab === 'to-be-invoiced') {
      return financialData.projects.filter(p => p.toBeInvoiced > 0);
    }
    return financialData.projects;
  }, [financialData.projects, selectedTab]);

  // Calculate runway (outgoings: 16.6k per week)
  const weeklyOutgoings = 16600;
  const runwayWeeks = financialData.toBeInvoiced > 0 
    ? Math.floor(financialData.toBeInvoiced / weeklyOutgoings)
    : 0;
  const runwayDays = financialData.toBeInvoiced > 0
    ? Math.floor((financialData.toBeInvoiced % weeklyOutgoings) / (weeklyOutgoings / 7))
    : 0;

  const handleEdit = (projectId: string, fieldId: string, fieldName: string, currentValue: number) => {
    setEditingField({ projectId, fieldId, fieldName });
    setEditValue(currentValue.toString());
  };

  const handleSave = () => {
    if (!editingField) return;
    const numValue = parseFloat(editValue);
    if (isNaN(numValue)) {
      alert('Please enter a valid number');
      return;
    }
    // For percentage fields, ensure value is between 0 and 100
    const finalValue = editingField.fieldName.includes('%') || editingField.fieldName.includes('Percent')
      ? Math.max(0, Math.min(100, numValue))
      : numValue;
    
    updateFieldMutation.mutate({
      projectId: editingField.projectId,
      fieldId: editingField.fieldId,
      value: finalValue,
    });
  };

  const handleCancel = () => {
    setEditingField(null);
    setEditValue('');
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading financial data...</div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div style={{ padding: '2rem' }}>
          <p>Error loading financial data: {error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <h1>Financial Overview</h1>

        {/* Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1.5rem',
          marginTop: '2rem',
          marginBottom: '2rem',
        }}>
          <div style={{
            padding: '1.5rem',
            backgroundColor: '#fff',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
          }}>
            <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>Total Project Value</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#111' }}>
              ${financialData.total.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{
            padding: '1.5rem',
            backgroundColor: '#A8E1FF',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
          }}>
            <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>Total Invoiced</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#111' }}>
              ${financialData.invoiced.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
              {financialData.total > 0 ? ((financialData.invoiced / financialData.total) * 100).toFixed(1) : 0}% of total
            </div>
          </div>
          <div style={{
            padding: '1.5rem',
            backgroundColor: financialData.toBeInvoiced > 0 ? '#FF4444' : '#00B000',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
          }}>
            <div style={{ fontSize: '0.875rem', color: '#fff', marginBottom: '0.5rem' }}>To Be Invoiced</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#fff' }}>
              ${financialData.toBeInvoiced.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#fff', marginTop: '0.5rem' }}>
              {financialData.total > 0 ? ((financialData.toBeInvoiced / financialData.total) * 100).toFixed(1) : 0}% of total
            </div>
          </div>
          <div style={{
            padding: '1.5rem',
            backgroundColor: runwayWeeks < 4 ? '#FF4444' : runwayWeeks < 8 ? '#FF3388' : '#00B000',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
          }}>
            <div style={{ fontSize: '0.875rem', color: '#fff', marginBottom: '0.5rem' }}>Runway</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#fff' }}>
              {runwayWeeks > 0 ? `${runwayWeeks}w ${runwayDays}d` : '0w'}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#fff', marginTop: '0.5rem' }}>
              @ $16.6k/week
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '2rem',
          borderBottom: '2px solid #e5e7eb',
        }}>
          {[
            { id: 'overview', label: 'All Projects' },
            { id: 'invoiced', label: 'Invoiced' },
            { id: 'to-be-invoiced', label: 'To Be Invoiced' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: selectedTab === tab.id ? '#2244FF' : 'transparent',
                color: selectedTab === tab.id ? 'white' : '#666',
                border: 'none',
                borderBottom: selectedTab === tab.id ? '2px solid #2244FF' : '2px solid transparent',
                cursor: 'pointer',
                fontWeight: selectedTab === tab.id ? 600 : 400,
                fontSize: '0.875rem',
                transition: 'all 0.2s',
                marginBottom: '-2px',
              }}
            >
              {tab.label} ({tab.id === 'overview' ? financialData.allProjects.length : filteredProjects.length})
            </button>
          ))}
        </div>

        {/* Projects Table */}
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
                <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Total</th>
                <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>% Invoiced</th>
                <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Invoiced</th>
                <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>To Be Invoiced</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                    No projects found
                  </td>
                </tr>
              ) : (
                filteredProjects.map(({ project, total, invoiced, toBeInvoiced, invoicedPercent, projectTotalFieldId, invoicedPercentFieldId }) => {
                  const isEditingTotal = editingField?.projectId === project.id && editingField?.fieldId === projectTotalFieldId;
                  const isEditingPercent = editingField?.projectId === project.id && editingField?.fieldId === invoicedPercentFieldId;
                  
                  return (
                    <tr
                      key={project.id}
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
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>
                        {isEditingTotal ? (
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSave();
                                if (e.key === 'Escape') handleCancel();
                              }}
                              style={{
                                width: '120px',
                                padding: '0.25rem 0.5rem',
                                border: '1px solid #2244FF',
                                borderRadius: '4px',
                                fontSize: '0.875rem',
                              }}
                              autoFocus
                            />
                            <button
                              onClick={handleSave}
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
                              onClick={handleCancel}
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
                          projectTotalFieldId ? (
                            <span
                              onClick={() => handleEdit(project.id, projectTotalFieldId, 'Project Total', total)}
                              style={{
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                textDecorationStyle: 'dotted',
                              }}
                              title="Click to edit"
                            >
                              ${total.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span style={{ color: '#999', fontStyle: 'italic' }}>
                              No field
                            </span>
                          )
                        )}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        {isEditingPercent ? (
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSave();
                                if (e.key === 'Escape') handleCancel();
                              }}
                              style={{
                                width: '80px',
                                padding: '0.25rem 0.5rem',
                                border: '1px solid #2244FF',
                                borderRadius: '4px',
                                fontSize: '0.875rem',
                              }}
                              autoFocus
                            />
                            <span style={{ fontSize: '0.875rem' }}>%</span>
                            <button
                              onClick={handleSave}
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
                              onClick={handleCancel}
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
                            onClick={() => invoicedPercentFieldId && handleEdit(project.id, invoicedPercentFieldId, '% Invoiced', invoicedPercent)}
                            style={{
                              cursor: 'pointer',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              backgroundColor: invoicedPercent >= 100 ? '#00B000' : invoicedPercent >= 50 ? '#FF3388' : '#FF4444',
                              color: '#fff',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              textDecoration: 'underline',
                              textDecorationStyle: 'dotted',
                            }}
                            title="Click to edit"
                          >
                            {invoicedPercent.toFixed(1)}%
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', color: '#666' }}>
                        ${invoiced.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: toBeInvoiced > 0 ? '#FF4444' : '#00B000' }}>
                        ${toBeInvoiced.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredProjects.length > 0 && (
              <tfoot>
                <tr style={{ backgroundColor: '#f9fafb', borderTop: '2px solid #e5e7eb', fontWeight: 700 }}>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>Total</td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700 }}>
                    ${filteredProjects.reduce((sum, p) => sum + p.total, 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>-</td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700 }}>
                    ${filteredProjects.reduce((sum, p) => sum + p.invoiced, 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700 }}>
                    ${filteredProjects.reduce((sum, p) => sum + p.toBeInvoiced, 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </ProtectedRoute>
  );
}

