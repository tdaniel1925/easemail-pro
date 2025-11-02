/**
 * New User Credentials Email Template
 * Sent when an admin creates a new user for their organization
 */

interface NewUserCredentialsData {
  recipientName: string;
  recipientEmail: string;
  organizationName: string;
  tempPassword: string;
  loginUrl: string;
  expiryDays: number;
  adminName?: string;
}

export function getNewUserCredentialsSubject(data: NewUserCredentialsData): string {
  return `Welcome to ${data.organizationName} - Your Account is Ready`;
}

export function getNewUserCredentialsTemplate(data: NewUserCredentialsData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${data.organizationName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa; color: #2d3748;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">
                Welcome to ${data.organizationName}!
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              
              <!-- Greeting -->
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a5568;">
                Hi <strong>${data.recipientName}</strong>,
              </p>

              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #4a5568;">
                Your account has been created by ${data.adminName || 'an administrator'}. You now have access to EaseMail for ${data.organizationName}.
              </p>

              <!-- Credentials Box -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f7fafc; border-radius: 6px; padding: 24px; margin-bottom: 30px;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #2d3748;">
                      🔐 Your Login Credentials
                    </h2>
                    
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 12px;">
                      <tr>
                        <td width="140" style="padding: 8px 0; font-weight: 600; font-size: 14px; color: #718096;">
                          Username:
                        </td>
                        <td style="padding: 8px 12px; background-color: #ffffff; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 14px; color: #2d3748;">
                          ${data.recipientEmail}
                        </td>
                      </tr>
                    </table>

                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="140" style="padding: 8px 0; font-weight: 600; font-size: 14px; color: #718096;">
                          Temporary Password:
                        </td>
                        <td style="padding: 8px 12px; background-color: #ffffff; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 14px; color: #2d3748; word-break: break-all;">
                          ${data.tempPassword}
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 16px 0 0; font-size: 13px; color: #718096;">
                      ⚠️ <strong>Important:</strong> You'll be prompted to change this password when you first log in.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin-bottom: 30px;">
                <tr>
                  <td style="font-size: 14px; line-height: 1.6; color: #78350f;">
                    <strong>🔒 Security Notice:</strong><br>
                    This temporary password will expire in <strong>${data.expiryDays} days</strong>. For your security, please copy the password carefully and do not share it with anyone.
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 30px;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${data.loginUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                      Log In Now
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Getting Started -->
              <h3 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #2d3748;">
                Getting Started
              </h3>
              
              <ol style="margin: 0 0 30px; padding-left: 24px; font-size: 15px; line-height: 1.8; color: #4a5568;">
                <li style="margin-bottom: 8px;">Click the "Log In Now" button above</li>
                <li style="margin-bottom: 8px;">Enter your username and temporary password</li>
                <li style="margin-bottom: 8px;">Create your new secure password</li>
                <li style="margin-bottom: 8px;">Complete your profile setup</li>
                <li style="margin-bottom: 8px;">Connect your email account to get started!</li>
              </ol>

              <!-- Help Section -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #edf2f7; border-radius: 6px; padding: 20px;">
                <tr>
                  <td>
                    <h4 style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #2d3748;">
                      Need Help?
                    </h4>
                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #4a5568;">
                      If you have any questions or need assistance, please contact your administrator${data.adminName ? ` (${data.adminName})` : ''} or reply to this email.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Manual Login Instructions -->
              <p style="margin: 30px 0 0; font-size: 13px; line-height: 1.6; color: #718096; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <strong>Having trouble with the button?</strong> Copy and paste this URL into your browser:<br>
                <a href="${data.loginUrl}" style="color: #667eea; text-decoration: none; word-break: break-all;">${data.loginUrl}</a>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; text-align: center; background-color: #f7fafc; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 8px; font-size: 14px; color: #718096;">
                <strong>EaseMail</strong> - The Future of Email Management
              </p>
              <p style="margin: 0; font-size: 12px; color: #a0aec0;">
                © ${new Date().getFullYear()} EaseMail. All rights reserved.
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

