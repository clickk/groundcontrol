'use client';

// Mark as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ClickUpTask } from '@/types/clickup';

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  defaultBody: string;
  sections: EmailTemplateSection[];
}

interface EmailTemplateSection {
  id: string;
  sectionKey: string;
  label: string;
  content: string;
  isDefault: boolean;
  orderIndex: number;
}

async function fetchTemplates(): Promise<EmailTemplate[]> {
  const response = await fetch('/api/email/templates');
  if (!response.ok) throw new Error('Failed to fetch templates');
  const data = await response.json();
  return data.templates || [];
}

async function fetchProject(id: string): Promise<ClickUpTask> {
  const response = await fetch(`/api/projects/${id}`);
  if (!response.ok) throw new Error('Failed to fetch project');
  const data = await response.json();
  return data.project;
}

async function fetchCurrentUser(): Promise<{ name: string; email: string } | null> {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    const response = await fetch('/api/auth/verify', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (!response.ok) return null;
    const data = await response.json();
    return { name: data.user.name, email: data.user.email };
  } catch {
    return null;
  }
}

function EmailPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ['emailTemplates'],
    queryFn: fetchTemplates,
  });

  const { data: project } = useQuery<ClickUpTask>({
    queryKey: ['project', projectId],
    queryFn: () => fetchProject(projectId!),
    enabled: !!projectId,
  });

  const { data: currentUser } = useQuery<{ name: string; email: string } | null>({
    queryKey: ['currentUser'],
    queryFn: fetchCurrentUser,
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [toEmail, setToEmail] = useState('');
  const [toName, setToName] = useState('');
  const [subject, setSubject] = useState('');
  const [finalBody, setFinalBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  const selectedTemplate = useMemo(() => {
    return templates.find(t => t.id === selectedTemplateId);
  }, [templates, selectedTemplateId]);

  // Replace template variables in text (handles both HTML and plain text)
  const replaceTemplateVariables = (text: string): string => {
    let result = text;
    
    // Replace {projectName} with actual project name
    if (project?.name) {
      result = result.replace(/\{projectName\}/g, project.name);
      result = result.replace(/\[PROJECT NAME\]/gi, project.name);
      result = result.replace(/INSERT CLIENT NAME/gi, project.name);
    }
    
    // Replace [Your Name] with actual user name
    if (currentUser?.name) {
      result = result.replace(/\[Your Name\]/g, currentUser.name);
      result = result.replace(/\[YOUR NAME\]/g, currentUser.name);
    }
    
    // Replace other common placeholders
    const today = new Date().toLocaleDateString('en-AU', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    result = result.replace(/INSERT DATE/gi, today);
    
    result = result.replace(/INSERT LIVE URL/gi, project?.name ? `https://${project.name.toLowerCase().replace(/\s+/g, '')}.com.au` : '[LIVE URL]');
    
    result = result.replace(/INSERT A RECORD/gi, '[A RECORD IP]');
    
    result = result.replace(/\[DEV SITE LINK\]/gi, '[Development Site Link]');
    
    return result;
  };

  // Initialize when template is selected
  useEffect(() => {
    if (selectedTemplate) {
      // Replace template variables in subject
      const templateSubject = replaceTemplateVariables(selectedTemplate.subject);
      setSubject(templateSubject);
      
      // Initialize selected sections based on isDefault
      const defaultSections = new Set(
        selectedTemplate.sections
          .filter(s => s.isDefault)
          .map(s => s.sectionKey)
      );
      setSelectedSections(defaultSections);

      // Initialize edited content with default content (with variables replaced)
      const content: Record<string, string> = {};
      selectedTemplate.sections.forEach(section => {
        content[section.sectionKey] = replaceTemplateVariables(section.content);
      });
      setEditedContent(content);
    }
  }, [selectedTemplate, project, currentUser]);

  // Update email body when template, sections, or content changes
  useEffect(() => {
    if (selectedTemplate) {
      const includedSections = selectedTemplate.sections
        .filter(s => selectedSections.has(s.sectionKey))
        .sort((a, b) => a.orderIndex - b.orderIndex);

      // Start with greeting
      let body = '<p>Hi,</p>';
      
      // Add default body if it exists (convert newlines to paragraphs)
      if (selectedTemplate.defaultBody) {
        const defaultBodyHtml = selectedTemplate.defaultBody
          .split('\n\n')
          .filter(p => p.trim())
          .map(p => `<p>${p.trim().replace(/\n/g, '<br>')}</p>`)
          .join('');
        body += defaultBodyHtml;
      }
      
      // Add selected sections
      includedSections.forEach(section => {
        let sectionContent = editedContent[section.sectionKey] || section.content;
        // Replace template variables in section content
        sectionContent = replaceTemplateVariables(sectionContent);
        // If content is already HTML (from WYSIWYG), use it directly
        // Otherwise, convert plain text to HTML
        const htmlContent = sectionContent.includes('<') 
          ? sectionContent 
          : `<p>${sectionContent.replace(/\n/g, '<br>')}</p>`;
        body += htmlContent;
      });

      body += '<p>Thank you,</p><p>[Your Name]</p>';

      // Replace template variables
      body = replaceTemplateVariables(body);

      setFinalBody(body);
    }
  }, [selectedTemplate, selectedSections, editedContent, project, currentUser]);

  const handleSectionToggle = (sectionKey: string) => {
    const newSelected = new Set(selectedSections);
    if (newSelected.has(sectionKey)) {
      newSelected.delete(sectionKey);
    } else {
      newSelected.add(sectionKey);
    }
    setSelectedSections(newSelected);
  };

  const handleContentEdit = (sectionKey: string, content: string) => {
    setEditedContent(prev => ({ ...prev, [sectionKey]: content }));
  };

  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          projectId: projectId || null,
          toEmail,
          toName: toName || null,
          subject,
          htmlBody: finalBody,
          includedSections: Array.from(selectedSections),
          replyToEmail: null, // Will use sender's email from session
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send email');
      }

      return response.json();
    },
    onSuccess: () => {
      alert('Email sent successfully!');
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      // Reset form
      setSelectedTemplateId('');
      setToEmail('');
      setToName('');
      setSubject('');
      setFinalBody('');
      setSelectedSections(new Set());
      setEditedContent({});
    },
    onError: (error: Error) => {
      alert(`Error sending email: ${error.message}`);
    },
  });

  const handleSend = () => {
    if (!toEmail || !subject || !finalBody) {
      alert('Please fill in all required fields');
      return;
    }
    sendEmailMutation.mutate();
  };

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>Loading email templates...</div>
    );
  }

  return (
      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1>Send Email</h1>
          {projectId && (
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
              ← Back to Project
            </button>
          )}
        </div>

        <div style={{
          backgroundColor: '#fff',
          padding: '2rem',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
        }}>
          {/* Template Selection */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
              Select Email Template
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '1rem',
              }}
            >
              <option value="">-- Select a template --</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          {selectedTemplate && (
            <>
              {/* Recipient Information */}
              <div style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                    To Email *
                  </label>
                  <input
                    type="email"
                    value={toEmail}
                    onChange={(e) => setToEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                    To Name (optional)
                  </label>
                  <input
                    type="text"
                    value={toName}
                    onChange={(e) => setToName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                    }}
                  />
                </div>
              </div>

              {/* Subject */}
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                  Subject *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                  }}
                  required
                />
              </div>

              {/* Template Sections */}
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', color: '#374151' }}>
                  Include Sections (check to include, uncheck to exclude)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {selectedTemplate.sections
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map(section => (
                      <div
                        key={section.id}
                        style={{
                          padding: '1rem',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          backgroundColor: selectedSections.has(section.sectionKey) ? '#f9fafb' : '#fff',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <input
                            type="checkbox"
                            checked={selectedSections.has(section.sectionKey)}
                            onChange={() => handleSectionToggle(section.sectionKey)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <label style={{ fontWeight: 600, cursor: 'pointer', flex: 1 }}>
                            {section.label}
                          </label>
                        </div>
                        {selectedSections.has(section.sectionKey) && (
                          <div style={{ marginTop: '0.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: '#666' }}>
                              Edit Content:
                            </label>
                            <ReactQuill
                              theme="snow"
                              value={editedContent[section.sectionKey] || section.content}
                              onChange={(content) => handleContentEdit(section.sectionKey, content)}
                              style={{
                                backgroundColor: '#fff',
                                minHeight: '150px',
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* Preview */}
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                  Email Preview
                </label>
                <div
                  style={{
                    padding: '1rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    backgroundColor: '#f9fafb',
                    minHeight: '200px',
                    fontFamily: 'system-ui, sans-serif',
                    lineHeight: '1.6',
                  }}
                  dangerouslySetInnerHTML={{ __html: finalBody }}
                />
              </div>

              {/* Send Button */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setSelectedTemplateId('');
                    setToEmail('');
                    setToName('');
                    setSubject('');
                    setFinalBody('');
                    setSelectedSections(new Set());
                    setEditedContent({});
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#e5e7eb',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Reset
                </button>
                <button
                  onClick={handleSend}
                  disabled={sendEmailMutation.isPending || !toEmail || !subject || !finalBody}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: sendEmailMutation.isPending ? '#9ca3af' : '#2244FF',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: sendEmailMutation.isPending ? 'wait' : 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {sendEmailMutation.isPending ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
  );
}

export default function EmailPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
        <EmailPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}

