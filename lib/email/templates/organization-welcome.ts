interface OrganizationWelcomeData {
  ownerName: string;
  ownerEmail: string;
  organizationName: string;
  organizationSlug: string;
  loginUrl: string;
  dashboardUrl: string;
  supportEmail?: string;
}

export function getOrganizationWelcomeTemplate(data: OrganizationWelcomeData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to EaseMail for Teams!</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F5F6F8;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F5F6F8;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #5B7DA8 0%, #4C6B9A 100%); padding: 40px 40px 30px; text-align: center;">
              <div style="display: inline-block; width: 56px; height: 56px; background: rgba(255, 255, 255, 0.2); border-radius: 12px; margin-bottom: 16px; line-height: 56px; font-size: 32px;">
                🚀
              </div>
              <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">EaseMail for Teams</h1>
              <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.95); font-size: 14px; font-weight: 500;">Your Team Workspace is Ready</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; color: #1A1D23; font-size: 24px; font-weight: 700; line-height: 1.3;">Welcome, ${data.ownerName}! 🎉</h2>

              <p style="margin: 0 0 24px; color: #5C616B; font-size: 16px; line-height: 1.6;">
                Your team organization <strong style="color: #1A1D23;">${data.organizationName}</strong> has been successfully created on EaseMail!
              </p>

              <!-- Organization Info Box -->
              <div style="margin: 0 0 32px; padding: 24px; background: linear-gradient(135deg, #EFF7FF 0%, #E8F3FF 100%); border-radius: 8px; border: 1px solid #D0E7FF;">
                <table width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding-bottom: 12px;">
                      <p style="margin: 0; color: #5C616B; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Organization</p>
                      <p style="margin: 4px 0 0; color: #1A1D23; font-size: 20px; font-weight: 700;">${data.organizationName}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top: 12px; border-top: 1px solid #D0E7FF;">
                      <p style="margin: 0; color: #5C616B; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Your Role</p>
                      <p style="margin: 4px 0 0; color: #4C6B9A; font-size: 16px; font-weight: 700;">
                        Organization Owner
                        <span style="font-size: 14px; font-weight: 400; color: #5C616B; margin-left: 8px;">• Full access to all features</span>
                      </p>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Next Steps -->
              <div style="margin: 0 0 32px;">
                <h3 style="margin: 0 0 16px; color: #1A1D23; font-size: 18px; font-weight: 700;">🎯 Next Steps</h3>

                <table width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding: 12px 0;">
                      <table cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td style="width: 32px; vertical-align: top; padding-top: 2px;">
                            <div style="width: 24px; height: 24px; background: #4C6B9A; border-radius: 50%; text-align: center; line-height: 24px; color: #FFFFFF; font-size: 12px; font-weight: 700;">1</div>
                          </td>
                          <td style="padding-left: 12px;">
                            <p style="margin: 0 0 4px; color: #1A1D23; font-size: 15px; font-weight: 600;">Verify Your Email</p>
                            <p style="margin: 0; color: #5C616B; font-size: 14px; line-height: 1.5;">Check your inbox for a verification email and confirm your account</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding: 12px 0;">
                      <table cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td style="width: 32px; vertical-align: top; padding-top: 2px;">
                            <div style="width: 24px; height: 24px; background: #4C6B9A; border-radius: 50%; text-align: center; line-height: 24px; color: #FFFFFF; font-size: 12px; font-weight: 700;">2</div>
                          </td>
                          <td style="padding-left: 12px;">
                            <p style="margin: 0 0 4px; color: #1A1D23; font-size: 15px; font-weight: 600;">Complete Organization Setup</p>
                            <p style="margin: 0; color: #5C616B; font-size: 14px; line-height: 1.5;">Configure your organization settings and preferences</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding: 12px 0;">
                      <table cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td style="width: 32px; vertical-align: top; padding-top: 2px;">
                            <div style="width: 24px; height: 24px; background: #4C6B9A; border-radius: 50%; text-align: center; line-height: 24px; color: #FFFFFF; font-size: 12px; font-weight: 700;">3</div>
                          </td>
                          <td style="padding-left: 12px;">
                            <p style="margin: 0 0 4px; color: #1A1D23; font-size: 15px; font-weight: 600;">Invite Team Members</p>
                            <p style="margin: 0; color: #5C616B; font-size: 14px; line-height: 1.5;">Add your team members and start collaborating</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding: 12px 0;">
                      <table cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td style="width: 32px; vertical-align: top; padding-top: 2px;">
                            <div style="width: 24px; height: 24px; background: #4C6B9A; border-radius: 50%; text-align: center; line-height: 24px; color: #FFFFFF; font-size: 12px; font-weight: 700;">4</div>
                          </td>
                          <td style="padding-left: 12px;">
                            <p style="margin: 0 0 4px; color: #1A1D23; font-size: 15px; font-weight: 600;">Connect Email Accounts</p>
                            <p style="margin: 0; color: #5C616B; font-size: 14px; line-height: 1.5;">Link your email accounts to start managing them with AI</p>
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
                    <a href="${data.dashboardUrl}"
                       style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #4C6B9A 0%, #3A5276 100%); color: #FFFFFF; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(76, 107, 154, 0.25);">
                      Access Your Dashboard
                    </a>
                  </td>
                </tr>
              </table>

              <!-- What's Included -->
              <div style="margin: 0 0 32px; padding: 24px; background-color: #F5F6F8; border-radius: 8px;">
                <h3 style="margin: 0 0 16px; color: #1A1D23; font-size: 16px; font-weight: 700;">✨ What's Included in Your Team Plan</h3>

                <table width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding: 6px 0;">
                      <table cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="width: 20px; vertical-align: top; padding-top: 2px;">
                            <div style="width: 16px; height: 16px; background: #4C6B9A; border-radius: 4px; text-align: center; line-height: 16px; color: #FFFFFF; font-size: 10px;">✓</div>
                          </td>
                          <td style="padding-left: 10px;">
                            <p style="margin: 0; color: #5C616B; font-size: 14px; line-height: 1.5;">Up to 5 team members</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0;">
                      <table cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="width: 20px; vertical-align: top; padding-top: 2px;">
                            <div style="width: 16px; height: 16px; background: #4C6B9A; border-radius: 4px; text-align: center; line-height: 16px; color: #FFFFFF; font-size: 10px;">✓</div>
                          </td>
                          <td style="padding-left: 10px;">
                            <p style="margin: 0; color: #5C616B; font-size: 14px; line-height: 1.5;">AI-powered email writing & replies</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0;">
                      <table cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="width: 20px; vertical-align: top; padding-top: 2px;">
                            <div style="width: 16px; height: 16px; background: #4C6B9A; border-radius: 4px; text-align: center; line-height: 16px; color: #FFFFFF; font-size: 10px;">✓</div>
                          </td>
                          <td style="padding-left: 10px;">
                            <p style="margin: 0; color: #5C616B; font-size: 14px; line-height: 1.5;">Shared email accounts & collaboration</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0;">
                      <table cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="width: 20px; vertical-align: top; padding-top: 2px;">
                            <div style="width: 16px; height: 16px; background: #4C6B9A; border-radius: 4px; text-align: center; line-height: 16px; color: #FFFFFF; font-size: 10px;">✓</div>
                          </td>
                          <td style="padding-left: 10px;">
                            <p style="margin: 0; color: #5C616B; font-size: 14px; line-height: 1.5;">Team analytics & insights</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0;">
                      <table cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="width: 20px; vertical-align: top; padding-top: 2px;">
                            <div style="width: 16px; height: 16px; background: #4C6B9A; border-radius: 4px; text-align: center; line-height: 16px; color: #FFFFFF; font-size: 10px;">✓</div>
                          </td>
                          <td style="padding-left: 10px;">
                            <p style="margin: 0; color: #5C616B; font-size: 14px; line-height: 1.5;">Priority support</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0;">
                      <table cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="width: 20px; vertical-align: top; padding-top: 2px;">
                            <div style="width: 16px; height: 16px; background: #4C6B9A; border-radius: 4px; text-align: center; line-height: 16px; color: #FFFFFF; font-size: 10px;">✓</div>
                          </td>
                          <td style="padding-left: 10px;">
                            <p style="margin: 0; color: #5C616B; font-size: 14px; line-height: 1.5;">14-day free trial (no credit card required)</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Support Section -->
              <div style="margin: 0; padding: 20px; background-color: #F5F6F8; border-radius: 8px; border-left: 4px solid #4C6B9A;">
                <p style="margin: 0 0 8px; color: #1A1D23; font-size: 14px; font-weight: 600;">Need help getting started?</p>
                <p style="margin: 0; color: #5C616B; font-size: 14px; line-height: 1.5;">
                  Our team is here to help! Reply to this email or contact us at
                  <a href="mailto:${data.supportEmail || 'support@easemail.app'}" style="color: #4C6B9A; text-decoration: none; font-weight: 600;">${data.supportEmail || 'support@easemail.app'}</a>
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; border-top: 1px solid #E1E4E8; text-align: center;">
              <p style="margin: 0 0 8px; color: #5C616B; font-size: 12px; line-height: 1.5;">
                This email was sent to ${data.ownerEmail} as the owner of ${data.organizationName}
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

export function getOrganizationWelcomeSubject(organizationName: string): string {
  return `Welcome to EaseMail! Your team "${organizationName}" is ready 🎉`;
}
