interface TeamInviteData {
  organizationName: string;
  inviterName: string;
  inviterEmail: string;
  recipientEmail: string;
  role: 'admin' | 'member';
  inviteLink: string;
  expiryDate: string;
}

export function getTeamInviteTemplate(data: TeamInviteData): string {
  const roleDescription = data.role === 'admin' 
    ? 'Can manage team members and settings' 
    : 'Can use team features';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Join ${data.organizationName} on EaseMail</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F5F6F8;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F5F6F8;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);">
          
          <!-- Header with Brand -->
          <tr>
            <td style="background: linear-gradient(135deg, #5B7DA8 0%, #4C6B9A 100%); padding: 40px 40px 30px; text-align: center;">
              <div style="display: inline-block; width: 56px; height: 56px; background: rgba(255, 255, 255, 0.2); border-radius: 12px; margin-bottom: 16px; line-height: 56px; font-size: 28px;">
                👥
              </div>
              <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">EaseMail</h1>
              <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.95); font-size: 14px; font-weight: 500;">Team Collaboration</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <!-- Greeting -->
              <h2 style="margin: 0 0 16px; color: #1A1D23; font-size: 24px; font-weight: 700; line-height: 1.3;">You've Been Invited! 🎉</h2>
              
              <p style="margin: 0 0 24px; color: #5C616B; font-size: 16px; line-height: 1.6;">
                <strong style="color: #1A1D23;">${data.inviterName}</strong> has invited you to join their team on EaseMail.
              </p>

              <!-- Organization Info Box -->
              <div style="margin: 0 0 32px; padding: 24px; background: linear-gradient(135deg, #EFF7FF 0%, #E8F3FF 100%); border-radius: 8px; border: 1px solid #D0E7FF;">
                <table width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding-bottom: 12px;">
                      <p style="margin: 0; color: #5C616B; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Team</p>
                      <p style="margin: 4px 0 0; color: #1A1D23; font-size: 20px; font-weight: 700;">${data.organizationName}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top: 12px; border-top: 1px solid #D0E7FF;">
                      <p style="margin: 0; color: #5C616B; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Your Role</p>
                      <p style="margin: 4px 0 0; color: #4C6B9A; font-size: 16px; font-weight: 700; text-transform: capitalize;">
                        ${data.role}
                        <span style="font-size: 14px; font-weight: 400; color: #5C616B; margin-left: 8px;">• ${roleDescription}</span>
                      </p>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- What You'll Get -->
              <div style="margin: 0 0 32px;">
                <p style="margin: 0 0 16px; color: #1A1D23; font-size: 15px; font-weight: 600;">As a team member, you'll be able to:</p>
                <table width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding: 8px 0;">
                      <table cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="width: 24px; vertical-align: top; padding-top: 2px;">
                            <div style="width: 18px; height: 18px; background: #E8F3FF; border-radius: 4px; text-align: center; line-height: 18px; color: #4C6B9A; font-size: 12px;">✓</div>
                          </td>
                          <td style="padding-left: 12px;">
                            <p style="margin: 0; color: #5C616B; font-size: 14px; line-height: 1.5;">Access shared email accounts and collaborate with your team</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <table cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="width: 24px; vertical-align: top; padding-top: 2px;">
                            <div style="width: 18px; height: 18px; background: #E8F3FF; border-radius: 4px; text-align: center; line-height: 18px; color: #4C6B9A; font-size: 12px;">✓</div>
                          </td>
                          <td style="padding-left: 12px;">
                            <p style="margin: 0; color: #5C616B; font-size: 14px; line-height: 1.5;">Use AI-powered features to manage emails smarter</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <table cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="width: 24px; vertical-align: top; padding-top: 2px;">
                            <div style="width: 18px; height: 18px; background: #E8F3FF; border-radius: 4px; text-align: center; line-height: 18px; color: #4C6B9A; font-size: 12px;">✓</div>
                          </td>
                          <td style="padding-left: 12px;">
                            <p style="margin: 0; color: #5C616B; font-size: 14px; line-height: 1.5;">Automate workflows and boost team productivity</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding: 8px 0 32px;">
                    <a href="${data.inviteLink}" 
                       style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #4C6B9A 0%, #3A5276 100%); color: #FFFFFF; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(76, 107, 154, 0.25); transition: all 0.3s;">
                      Accept Invitation & Join Team
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Alternative Link -->
              <p style="margin: 0 0 8px; color: #5C616B; font-size: 14px; text-align: center;">
                Or copy and paste this link into your browser:
              </p>
              
              <div style="margin: 0 0 32px; padding: 16px; background-color: #F5F6F8; border-radius: 6px; border: 1px solid #E1E4E8;">
                <a href="${data.inviteLink}" style="color: #4C6B9A; text-decoration: none; word-break: break-all; font-size: 13px; line-height: 1.6;">${data.inviteLink}</a>
              </div>

              <!-- Expiry Notice -->
              <div style="padding: 16px; background-color: #FFF9E6; border-left: 3px solid #F59E0B; border-radius: 6px;">
                <table cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="width: 24px; vertical-align: top; padding-right: 12px; font-size: 18px;">⏱️</td>
                    <td>
                      <p style="margin: 0; color: #1A1D23; font-size: 14px; font-weight: 600;">Invitation expires in 7 days</p>
                      <p style="margin: 4px 0 0; color: #5C616B; font-size: 13px; line-height: 1.5;">
                        Accept the invitation before <strong>${data.expiryDate}</strong> to join the team.
                      </p>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="border-top: 1px solid #E1E4E8;"></div>
            </td>
          </tr>

          <!-- Additional Info -->
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 16px; color: #1A1D23; font-size: 15px; font-weight: 600;">What happens next?</p>
              <ol style="margin: 0; padding-left: 20px; color: #5C616B; font-size: 14px; line-height: 1.8;">
                <li style="margin-bottom: 8px;">Click the button above to accept the invitation</li>
                <li style="margin-bottom: 8px;">Create your account or sign in if you already have one</li>
                <li style="margin-bottom: 8px;">Start collaborating with ${data.organizationName} immediately</li>
              </ol>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; border-top: 1px solid #E1E4E8; background-color: #FAFBFC;">
              <table width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <p style="margin: 0; color: #5C616B; font-size: 13px; line-height: 1.6;">
                      If you don't want to join this team or didn't expect this invitation,<br/>
                      you can safely ignore this email.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 16px; border-top: 1px solid #E1E4E8;">
                    <p style="margin: 0 0 8px; color: #5C616B; font-size: 12px;">
                      Questions? Contact <strong>${data.inviterName}</strong> at 
                      <a href="mailto:${data.inviterEmail}" style="color: #4C6B9A; text-decoration: none;">${data.inviterEmail}</a>
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
        
        <!-- Footer Text -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="margin-top: 24px;">
          <tr>
            <td align="center" style="padding: 0 20px;">
              <p style="margin: 0; color: #9BA1A9; font-size: 12px; line-height: 1.6;">
                This email was sent to <strong style="color: #5C616B;">${data.recipientEmail}</strong> because 
                <strong style="color: #5C616B;">${data.inviterName}</strong> invited you to join their team on EaseMail.
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

export function getTeamInviteSubject(data: TeamInviteData): string {
  return `${data.inviterName} invited you to join ${data.organizationName} on EaseMail`;
}

