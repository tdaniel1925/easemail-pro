/**
 * Password Reset Credentials Email Template
 * Sent when an admin resets a user's password and generates new credentials
 */

interface PasswordResetCredentialsData {
  recipientName: string;
  recipientEmail: string;
  organizationName: string;
  tempPassword: string;
  loginUrl: string;
  expiryDays: number;
  adminName?: string;
}

export function getPasswordResetCredentialsSubject(data: PasswordResetCredentialsData): string {
  return `Password Reset - New Credentials for ${data.organizationName}`;
}

export function getPasswordResetCredentialsTemplate(data: PasswordResetCredentialsData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset - ${data.organizationName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa; color: #2d3748;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 8px 8px 0 0;">
              <div style="display: inline-block; width: 64px; height: 64px; background: rgba(255, 255, 255, 0.2); border-radius: 50%; margin-bottom: 16px; line-height: 64px; font-size: 32px;">
                🔑
              </div>
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">
                Password Reset
              </h1>
              <p style="margin: 8px 0 0; font-size: 16px; color: rgba(255, 255, 255, 0.95);">
                New credentials generated
              </p>
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
                Your password has been reset by ${data.adminName || 'an administrator'} and a new temporary password has been generated for your EaseMail account.
              </p>

              <!-- Alert Box -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin-bottom: 30px;">
                <tr>
                  <td style="font-size: 14px; line-height: 1.6; color: #78350f;">
                    <strong>🔒 Security Notice:</strong> This password reset was initiated by an administrator. If you did not request this reset, please contact your administrator immediately.
                  </td>
                </tr>
              </table>

              <!-- Credentials Box -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f7fafc; border-radius: 6px; padding: 24px; margin-bottom: 30px; border: 2px solid #e2e8f0;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #2d3748;">
                      🔐 Your New Login Credentials
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
                          New Password:
                        </td>
                        <td style="padding: 8px 12px; background-color: #ffffff; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 14px; color: #2d3748; word-break: break-all; border: 2px solid #f59e0b;">
                          ${data.tempPassword}
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 16px 0 0; font-size: 13px; color: #718096;">
                      ⚠️ <strong>Important:</strong> You'll be required to change this password when you log in.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Expiry Notice -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 4px; margin-bottom: 30px;">
                <tr>
                  <td style="font-size: 14px; line-height: 1.6; color: #7f1d1d;">
                    <strong>⏰ Password Expiry:</strong><br>
                    This temporary password will expire in <strong>${data.expiryDays} days</strong>. Please log in and change your password before then.
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 30px;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${data.loginUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(245, 158, 11, 0.3);">
                      Log In & Change Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Instructions -->
              <h3 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #2d3748;">
                Next Steps
              </h3>
              
              <ol style="margin: 0 0 30px; padding-left: 24px; font-size: 15px; line-height: 1.8; color: #4a5568;">
                <li style="margin-bottom: 8px;">Click the "Log In & Change Password" button above</li>
                <li style="margin-bottom: 8px;">Enter your username and the temporary password shown above</li>
                <li style="margin-bottom: 8px;">You'll be prompted to create a new, secure password</li>
                <li style="margin-bottom: 8px;">Choose a strong password you haven't used before</li>
                <li style="margin-bottom: 8px;">Save your new password securely</li>
              </ol>

              <!-- Help Section -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #edf2f7; border-radius: 6px; padding: 20px;">
                <tr>
                  <td>
                    <h4 style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #2d3748;">
                      Need Help?
                    </h4>
                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #4a5568;">
                      If you have any questions about this password reset or need assistance logging in, please contact your administrator${data.adminName ? ` (${data.adminName})` : ''} or reply to this email.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Manual Login Instructions -->
              <p style="margin: 30px 0 0; font-size: 13px; line-height: 1.6; color: #718096; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <strong>Having trouble with the button?</strong> Copy and paste this URL into your browser:<br>
                <a href="${data.loginUrl}" style="color: #f59e0b; text-decoration: none; word-break: break-all;">${data.loginUrl}</a>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; text-align: center; background-color: #f7fafc; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 8px; font-size: 14px; color: #718096;">
                <strong>EaseMail</strong> - Secure Email Management
              </p>
              <p style="margin: 0; font-size: 12px; color: #a0aec0;">
                This is an automated security notification from ${data.organizationName}
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; color: #a0aec0;">
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

