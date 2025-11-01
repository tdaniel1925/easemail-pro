interface SignupConfirmationData {
  userName: string;
  userEmail: string;
  confirmationUrl: string;
}

export function getSignupConfirmationTemplate(data: SignupConfirmationData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
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
              <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.95); font-size: 14px; font-weight: 500;">The Future of Email Management</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; color: #1A1D23; font-size: 24px; font-weight: 700; line-height: 1.3;">Welcome to EaseMail! 🎉</h2>
              
              <p style="margin: 0 0 24px; color: #5C616B; font-size: 16px; line-height: 1.6;">
                Thanks for signing up! We're excited to help you manage your emails smarter. Just one more step to get started.
              </p>

              <p style="margin: 0 0 32px; color: #5C616B; font-size: 16px; line-height: 1.6;">
                Click the button below to verify your email address and activate your account:
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <a href="${data.confirmationUrl}" 
                       style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #4C6B9A 0%, #3A5276 100%); color: #FFFFFF; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(76, 107, 154, 0.25);">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 32px 0 0; color: #5C616B; font-size: 14px; line-height: 1.6;">
                Or copy and paste this link into your browser:
              </p>
              
              <div style="margin: 12px 0 0; padding: 16px; background-color: #F5F6F8; border-radius: 6px; border: 1px solid #E1E4E8;">
                <a href="${data.confirmationUrl}" style="color: #4C6B9A; text-decoration: none; word-break: break-all; font-size: 13px;">${data.confirmationUrl}</a>
              </div>

              <p style="margin: 32px 0 0; color: #5C616B; font-size: 14px; line-height: 1.6;">
                This link will expire in 24 hours for security reasons.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; border-top: 1px solid #E1E4E8; text-align: center;">
              <p style="margin: 0 0 8px; color: #5C616B; font-size: 12px; line-height: 1.5;">
                If you didn't create an EaseMail account, you can safely ignore this email.
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

export function getSignupConfirmationSubject(): string {
  return 'Verify your EaseMail account';
}

