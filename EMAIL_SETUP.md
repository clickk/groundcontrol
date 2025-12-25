# Email System Setup

## Overview
The email system allows you to send templated emails to clients using SendGrid. Emails can be sent from the email page or directly from project pages.

## Setup Instructions

### 1. Environment Variables
Add the following to your `.env` file:

```env
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=help@clickk.com.au
SENDGRID_FROM_NAME=Clickk
```

### 2. Database Setup
The database schema has been updated with email template models. Run:

```bash
npx prisma db push
npx prisma generate
```

### 3. Seed Email Templates
Run the seed script to populate default email templates:

```bash
npx ts-node scripts/seed-email-templates.ts
```

This will create the following templates:
- Onboarding Checklist
- Preparing for Kick off meeting
- Post Kick-off Meeting
- Ready for Revision
- Ready for Go Live
- Ready for A record to IT
- Congratulations on Launch

## Features

### Email Templates
- Each template has a name, subject, and default body
- Templates can have multiple sections that can be included/excluded
- Sections can be edited using a WYSIWYG editor
- Sections are ordered and can be customized per email

### Sending Emails
1. Navigate to `/email` or click "Send Email" from a project page
2. Select a template from the dropdown
3. Fill in recipient email and name
4. Edit subject if needed
5. Check/uncheck sections to include/exclude them
6. Edit section content using the WYSIWYG editor
7. Preview the final email
8. Click "Send Email"

### Reply-To Functionality
- Emails are sent with the staff member's email as the reply-to address
- This ensures clients can reply directly to the staff member who sent the email

### Email Tracking
- All sent emails are saved to the database
- Each email record includes:
  - Template used
  - Project ID (if sent from a project)
  - Recipient information
  - Final email body
  - Included sections
  - SendGrid message ID

## API Endpoints

### GET /api/email/templates
Fetch all email templates

### POST /api/email/templates
Create a new email template

### GET /api/email/templates/[id]
Get a specific template

### PUT /api/email/templates/[id]
Update a template

### DELETE /api/email/templates/[id]
Delete a template

### POST /api/email/send
Send an email
- Requires authentication
- Body: `{ templateId, projectId, toEmail, toName, subject, htmlBody, includedSections, replyToEmail }`

## Customization

### Adding New Templates
You can add new templates via the API or by modifying the seed script and re-running it.

### Editing Templates
Templates can be edited through the API or directly in the database. The UI for template management can be added later if needed.

## Notes
- The WYSIWYG editor uses React Quill
- Email bodies are sent as HTML
- The system automatically sets the reply-to address to the sender's email
- All emails are logged in the database for tracking

