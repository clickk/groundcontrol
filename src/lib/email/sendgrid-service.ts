import sgMail from '@sendgrid/mail';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'help@clickk.com.au';
const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'Clickk';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export interface SendEmailParams {
  to: string;
  toName?: string;
  subject: string;
  htmlBody: string;
  replyTo?: string; // Staff member's email for replies
  fromEmail?: string;
  fromName?: string;
}

export class SendGridService {
  static async sendEmail(params: SendEmailParams): Promise<{ messageId: string }> {
    if (!SENDGRID_API_KEY) {
      throw new Error('SendGrid API key is not configured');
    }

    const msg = {
      to: params.toName ? { email: params.to, name: params.toName } : params.to,
      from: {
        email: params.fromEmail || FROM_EMAIL,
        name: params.fromName || FROM_NAME,
      },
      replyTo: params.replyTo || params.fromEmail || FROM_EMAIL,
      subject: params.subject,
      html: params.htmlBody,
    };

    try {
      const [response] = await sgMail.send(msg);
      return { messageId: response.headers['x-message-id'] || '' };
    } catch (error: any) {
      console.error('SendGrid error:', error);
      if (error.response) {
        console.error('SendGrid error details:', error.response.body);
        throw new Error(`SendGrid error: ${JSON.stringify(error.response.body)}`);
      }
      throw error;
    }
  }
}

