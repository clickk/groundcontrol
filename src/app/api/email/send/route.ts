import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SendGridService } from '@/lib/email/sendgrid-service';
import { authService } from '@/lib/auth/auth-service';
import { ClickUpClient } from '@/lib/api/clickup-client';

const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN || '';
const CLICKUP_LIST_ID = process.env.CLICKUP_LIST_ID || '';
const CLICKUP_TEAM_ID = process.env.CLICKUP_TEAM_ID || '';

export async function POST(request: NextRequest) {
  try {
    // Get user from token
    const authHeader = request.headers.get('authorization');
    let user = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      user = await authService.verifyToken(token);
    } else {
      // Try cookie
      const token = request.cookies.get('token')?.value;
      if (token) {
        user = await authService.verifyToken(token);
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      templateId,
      projectId,
      toEmail,
      toName,
      subject,
      htmlBody,
      includedSections,
      replyToEmail,
    } = body;

    if (!toEmail || !subject || !htmlBody) {
      return NextResponse.json(
        { error: 'toEmail, subject, and htmlBody are required' },
        { status: 400 }
      );
    }

    // Get template name if templateId is provided
    let templateName = null;
    if (templateId) {
      const template = await prisma.emailTemplate.findUnique({
        where: { id: templateId },
        select: { name: true },
      });
      templateName = template?.name || null;
    }

    // Send email via SendGrid
    const sendResult = await SendGridService.sendEmail({
      to: toEmail,
      toName,
      subject,
      htmlBody,
      replyTo: replyToEmail || user.email,
    });

    // Save sent email record
    const sentEmail = await prisma.sentEmail.create({
      data: {
        templateId: templateId || null,
        projectId: projectId || null,
        fromUserId: user.id,
        toEmail,
        toName: toName || null,
        subject,
        body: htmlBody,
        includedSections: JSON.stringify(includedSections || []),
        replyToEmail: replyToEmail || user.email,
        sendgridMessageId: sendResult.messageId,
      },
    });

    // Add comment to ClickUp task if projectId is provided
    if (projectId && CLICKUP_API_TOKEN && CLICKUP_LIST_ID && CLICKUP_TEAM_ID) {
      try {
        const client = new ClickUpClient(CLICKUP_API_TOKEN, CLICKUP_LIST_ID, CLICKUP_TEAM_ID);
        
        // Format the comment with email details
        const recipientName = toName ? `${toName} (${toEmail})` : toEmail;
        const templateInfo = templateName ? `Template: ${templateName}\n` : '';
        
        const commentText = `📧 Email Sent\n\n${templateInfo}To: ${recipientName}\nSubject: ${subject}\nSent by: ${user.name} (${user.email})\n\nReply-to: ${replyToEmail || user.email}`;
        
        await client.addProjectNote(projectId, commentText);
      } catch (clickupError) {
        // Log error but don't fail the email send if ClickUp comment fails
        console.error('Error adding ClickUp comment:', clickupError);
      }
    }

    return NextResponse.json({ success: true, sentEmail });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    );
  }
}

