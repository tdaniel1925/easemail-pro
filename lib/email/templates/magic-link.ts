interface MagicLinkData {
  userName: string;
  userEmail: string;
  magicUrl: string;
}

export function getMagicLinkTemplate(data: MagicLinkData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0;">
  <title>Sign In to EaseMail</title>
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
              <h2 style="margin: 0 0 16px; color: #1A1D23; font-size: 24px; font-weight: 700;">Your Sign-In Link 🔐</h2>
              
              <p style="margin: 0 0 24px; color: #5C616B; font-size: 16px; line-height: 1.6;">
                Click the button below to securely sign in to your EaseMail account:
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <a href="${data.magicUrl}" 
                       style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #4C6B9A 0%, #3A5276 100%); color: #FFFFFF; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(76, 107, 154, 0.25);">
                      Sign In to EaseMail
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 32px 0 0; color: #5C616B; font-size: 14px; line-height: 1.6;">
                Or copy this link:
              </p>
              
              <div style="margin: 12px 0 0; padding: 16px; background-color: #F5F6F8; border-radius: 6px; border: 1px solid #E1E4E8;">
                <a href="${data.magicUrl}" style="color: #4C6B9A; text-decoration: none; word-break: break-all; font-size: 13px;">${data.magicUrl}</a>
              </div>

              <p style="margin: 32px 0 0; color: #5C616B; font-size: 14px; line-height: 1.6;">
                ⏱️ This link expires in 1 hour
              </p>
            </td>
          </tr>

          <!-- Security Note -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <div style="padding: 16px; background-color: #EFF7FF; border-left: 3px solid #4C6B9A; border-radius: 6px;">
                <p style="margin: 0; color: #1A1D23; font-size: 14px; font-weight: 600;">🔒 Security Tip</p>
                <p style="margin: 8px 0 0; color: #5C616B; font-size: 13px; line-height: 1.5;">
                  If you didn't request this sign-in link, please ignore this email. Never share this link with anyone.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; border-top: 1px solid #E1E4E8; text-align: center;">
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

export function getMagicLinkSubject(): string {
  return 'Sign in to EaseMail';
}

