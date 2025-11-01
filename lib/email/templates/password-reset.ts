interface PasswordResetData {
  recipientName: string;
  resetLink: string;
  expiryHours: number;
}

export function getPasswordResetTemplate(data: PasswordResetData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F5F6F8;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F5F6F8;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4C6B9A 0%, #3A5276 100%); padding: 40px 40px 30px; text-align: center;">
              <div style="display: inline-block; width: 48px; height: 48px; background: rgba(255, 255, 255, 0.2); border-radius: 12px; margin-bottom: 16px;"></div>
              <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">EaseMail</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; color: #1A1D23; font-size: 24px; font-weight: 700;">Reset Your Password 🔑</h2>
              
              <p style="margin: 0 0 24px; color: #5C616B; font-size: 16px; line-height: 1.6;">
                Hello ${data.recipientName},<br><br>
                We received a request to reset your password. Click the button below to create a new password:
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <a href="${data.resetLink}" 
                       style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #4C6B9A 0%, #3A5276 100%); color: #FFFFFF; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(76, 107, 154, 0.25);">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 32px 0 0; color: #5C616B; font-size: 14px; line-height: 1.6;">
                Or copy this link:
              </p>
              
              <div style="margin: 12px 0 0; padding: 16px; background-color: #F5F6F8; border-radius: 6px; border: 1px solid #E1E4E8;">
                <a href="${data.resetLink}" style="color: #4C6B9A; text-decoration: none; word-break: break-all; font-size: 13px;">${data.resetLink}</a>
              </div>

              <p style="margin: 32px 0 0; color: #5C616B; font-size: 14px; line-height: 1.6;">
                ⏱️ This link expires in ${data.expiryHours} hour${data.expiryHours !== 1 ? 's' : ''}
              </p>
            </td>
          </tr>

          <!-- Security Warning -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <div style="padding: 16px; background-color: #FFF4E5; border-left: 3px solid #F59E0B; border-radius: 6px;">
                <p style="margin: 0; color: #1A1D23; font-size: 14px; font-weight: 600;">⚠️ Security Alert</p>
                <p style="margin: 8px 0 0; color: #5C616B; font-size: 13px; line-height: 1.5;">
                  If you didn't request a password reset, please ignore this email. Your password will remain unchanged. Consider securing your account if you didn't make this request.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; border-top: 1px solid #E1E4E8; text-align: center;">
              <p style="margin: 0 0 8px; color: #5C616B; font-size: 12px;">
                Need help? Contact our support team
              </p>
              <p style="margin: 0; color: #9BA1A9; font-size: 12px;">
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

export function getPasswordResetSubject(data: PasswordResetData): string {
  return 'Reset your EaseMail password';
}

