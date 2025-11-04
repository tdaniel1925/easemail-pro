import crypto from 'crypto';

interface InvitationEmailData {
  recipientName: string;
  recipientEmail: string;
  invitationUrl: string;
  organizationName?: string;
  inviterName: string;
  expiryDays?: number;
}

export function getInvitationEmailSubject(data: InvitationEmailData): string {
  if (data.organizationName) {
    return `You've been invited to join ${data.organizationName} on EaseMail`;
  }
  return `You've been invited to join EaseMail`;
}

export function getInvitationEmailTemplate(data: InvitationEmailData): string {
  const expiryText = data.expiryDays ? `This invitation will expire in ${data.expiryDays} days.` : '';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to Join EaseMail</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
          
          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
                You're Invited!
              </h1>
              <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                Join EaseMail and start managing your emails better
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi <strong>${data.recipientName}</strong>,
              </p>
              
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                <strong>${data.inviterName}</strong> has invited you to join${data.organizationName ? ` <strong>${data.organizationName}</strong> on` : ''} EaseMail — the AI-powered email management platform that helps you work smarter, not harder.
              </p>

              <!-- Features Grid -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td style="padding: 15px; background-color: #f3f4f6; border-radius: 8px; width: 48%; vertical-align: top;">
                    <div style="color: #667eea; font-size: 24px; margin-bottom: 8px;">⚡</div>
                    <h3 style="margin: 0 0 5px 0; color: #111827; font-size: 14px; font-weight: 600;">AI-Powered Writing</h3>
                    <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">Draft emails faster with AI assistance</p>
                  </td>
                  <td style="width: 4%;"></td>
                  <td style="padding: 15px; background-color: #f3f4f6; border-radius: 8px; width: 48%; vertical-align: top;">
                    <div style="color: #667eea; font-size: 24px; margin-bottom: 8px;">📧</div>
                    <h3 style="margin: 0 0 5px 0; color: #111827; font-size: 14px; font-weight: 600;">Unified Inbox</h3>
                    <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">Manage multiple accounts in one place</p>
                  </td>
                </tr>
                <tr><td colspan="3" style="height: 10px;"></td></tr>
                <tr>
                  <td style="padding: 15px; background-color: #f3f4f6; border-radius: 8px; width: 48%; vertical-align: top;">
                    <div style="color: #667eea; font-size: 24px; margin-bottom: 8px;">🎯</div>
                    <h3 style="margin: 0 0 5px 0; color: #111827; font-size: 14px; font-weight: 600;">Smart Threading</h3>
                    <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">Never lose track of conversations</p>
                  </td>
                  <td style="width: 4%;"></td>
                  <td style="padding: 15px; background-color: #f3f4f6; border-radius: 8px; width: 48%; vertical-align: top;">
                    <div style="color: #667eea; font-size: 24px; margin-bottom: 8px;">📱</div>
                    <h3 style="margin: 0 0 5px 0; color: #111827; font-size: 14px; font-weight: 600;">SMS Integration</h3>
                    <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">Email and SMS from one platform</p>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                To get started, click the button below to create your account and set your password:
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${data.invitationUrl}" 
                       style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.4);">
                      Accept Invitation & Create Account
                    </a>
                  </td>
                </tr>
              </table>

              ${expiryText ? `
              <p style="margin: 20px 0 0 0; color: #9ca3af; font-size: 14px; text-align: center;">
                ⏰ ${expiryText}
              </p>
              ` : ''}

              <!-- Divider -->
              <div style="margin: 30px 0; height: 1px; background-color: #e5e7eb;"></div>

              <!-- Alternative Link -->
              <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 10px 0 0 0; word-break: break-all;">
                <a href="${data.invitationUrl}" style="color: #667eea; text-decoration: underline; font-size: 13px;">
                  ${data.invitationUrl}
                </a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px;">
                This invitation was sent by ${data.inviterName}
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
              <p style="margin: 15px 0 0 0; color: #9ca3af; font-size: 12px;">
                © 2025 EaseMail. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate a secure random invitation token
 */
export function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate invitation expiry date (default 7 days)
 */
export function generateInvitationExpiry(days: number = 7): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  return expiry;
}

