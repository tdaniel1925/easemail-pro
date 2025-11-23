/**
 * RSVP Change Notification Email Template
 * Sent to organizer when attendee changes their RSVP status
 *
 * NOTE: Uses fixed relaxed color scheme (soft blues/grays) independent of user theme
 */

interface RSVPChangeNotificationData {
  eventTitle: string;
  eventStartTime: Date;
  eventLocation?: string;
  attendeeEmail: string;
  attendeeName?: string;
  oldStatus: 'pending' | 'accepted' | 'declined' | 'maybe';
  newStatus: 'pending' | 'accepted' | 'declined' | 'maybe';
  organizerName: string;
  eventDetailsUrl?: string;
}

/**
 * Map status to display text
 */
function getStatusDisplay(status: string): { text: string; emoji: string; color: string } {
  switch (status) {
    case 'accepted':
      return { text: 'Accepted', emoji: '✅', color: '#10B981' };
    case 'declined':
      return { text: 'Declined', emoji: '❌', color: '#EF4444' };
    case 'maybe':
    case 'tentative':
      return { text: 'Tentative', emoji: '❓', color: '#F59E0B' };
    default:
      return { text: 'Pending', emoji: '⏳', color: '#6B7280' };
  }
}

export function getRSVPChangeNotificationTemplate(data: RSVPChangeNotificationData): string {
  const oldStatusDisplay = getStatusDisplay(data.oldStatus);
  const newStatusDisplay = getStatusDisplay(data.newStatus);

  const formatDate = (date: Date): string => {
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RSVP Changed - ${data.eventTitle}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F5F6F8;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F5F6F8;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #8B9DC3 0%, #6B7FA0 100%); padding: 40px 40px 30px; text-align: center;">
              <div style="display: inline-block; width: 56px; height: 56px; background: rgba(255, 255, 255, 0.2); border-radius: 12px; margin-bottom: 16px; line-height: 56px; font-size: 28px;">
                🔄
              </div>
              <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">RSVP Status Changed</h1>
              <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.95); font-size: 14px; font-weight: 500;">An attendee updated their response</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 24px; color: #1A1D23; font-size: 20px; font-weight: 700; line-height: 1.3;">
                Hi ${data.organizerName},
              </h2>

              <p style="margin: 0 0 24px; color: #5C616B; font-size: 16px; line-height: 1.6;">
                <strong style="color: #1A1D23;">${data.attendeeName || data.attendeeEmail}</strong> changed their RSVP for your event.
              </p>

              <!-- Status Change Box -->
              <div style="margin: 0 0 32px; padding: 24px; background: #F9FAFB; border-radius: 8px; border: 1px solid #E5E7EB;">
                <table width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" style="padding-bottom: 16px;">
                      <div style="display: inline-flex; align-items: center; gap: 16px;">
                        <!-- Old Status -->
                        <div style="text-align: center;">
                          <div style="font-size: 32px; margin-bottom: 8px;">${oldStatusDisplay.emoji}</div>
                          <div style="padding: 6px 12px; background: ${oldStatusDisplay.color}20; border-radius: 6px; border: 1px solid ${oldStatusDisplay.color}40;">
                            <span style="color: ${oldStatusDisplay.color}; font-size: 13px; font-weight: 600;">${oldStatusDisplay.text}</span>
                          </div>
                        </div>

                        <!-- Arrow -->
                        <div style="font-size: 24px; color: #9CA3AF;">→</div>

                        <!-- New Status -->
                        <div style="text-align: center;">
                          <div style="font-size: 32px; margin-bottom: 8px;">${newStatusDisplay.emoji}</div>
                          <div style="padding: 6px 12px; background: ${newStatusDisplay.color}20; border-radius: 6px; border: 1px solid ${newStatusDisplay.color}40;">
                            <span style="color: ${newStatusDisplay.color}; font-size: 13px; font-weight: 600;">${newStatusDisplay.text}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Event Details Box -->
              <div style="margin: 0 0 32px; padding: 24px; background: linear-gradient(135deg, #EFF7FF 0%, #E8F3FF 100%); border-radius: 8px; border: 1px solid #D0E7FF;">
                <table width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding-bottom: 16px;">
                      <p style="margin: 0; color: #5C616B; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Event</p>
                      <p style="margin: 4px 0 0; color: #1A1D23; font-size: 20px; font-weight: 700; line-height: 1.3;">${data.eventTitle}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 16px 0; border-top: 1px solid #D0E7FF;">
                      <table width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="width: 32px; vertical-align: top; padding-top: 2px;">
                            <div style="width: 24px; height: 24px; background: #E8F3FF; border-radius: 6px; text-align: center; line-height: 24px; color: #4C6B9A; font-size: 14px;">📅</div>
                          </td>
                          <td style="padding-left: 12px;">
                            <p style="margin: 0; color: #5C616B; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Date & Time</p>
                            <p style="margin: 4px 0 0; color: #1A1D23; font-size: 16px; font-weight: 600;">${formatDate(data.eventStartTime)}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  ${data.eventLocation ? `
                  <tr>
                    <td style="padding: 16px 0; border-top: 1px solid #D0E7FF;">
                      <table width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="width: 32px; vertical-align: top; padding-top: 2px;">
                            <div style="width: 24px; height: 24px; background: #E8F3FF; border-radius: 6px; text-align: center; line-height: 24px; color: #4C6B9A; font-size: 14px;">📍</div>
                          </td>
                          <td style="padding-left: 12px;">
                            <p style="margin: 0; color: #5C616B; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Location</p>
                            <p style="margin: 4px 0 0; color: #1A1D23; font-size: 16px; font-weight: 600;">${data.eventLocation}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 16px 0; border-top: 1px solid #D0E7FF;">
                      <table width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="width: 32px; vertical-align: top; padding-top: 2px;">
                            <div style="width: 24px; height: 24px; background: #E8F3FF; border-radius: 6px; text-align: center; line-height: 24px; color: #4C6B9A; font-size: 14px;">👤</div>
                          </td>
                          <td style="padding-left: 12px;">
                            <p style="margin: 0; color: #5C616B; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Attendee</p>
                            <p style="margin: 4px 0 0; color: #1A1D23; font-size: 16px; font-weight: 600;">${data.attendeeName || data.attendeeEmail}</p>
                            ${data.attendeeName ? `<p style="margin: 2px 0 0; color: #5C616B; font-size: 14px;">${data.attendeeEmail}</p>` : ''}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </div>

              ${data.eventDetailsUrl ? `
              <!-- View Event Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${data.eventDetailsUrl}"
                   style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #6B7FA0 0%, #5B6F90 100%); color: #FFFFFF; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 2px 8px rgba(107, 127, 160, 0.25);">
                  View Event Details
                </a>
              </div>
              ` : ''}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; border-top: 1px solid #E1E4E8; background-color: #FAFBFC;">
              <table width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0; color: #5C616B; font-size: 13px; line-height: 1.6;">
                      This notification was sent because you are the organizer of this event.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 16px; border-top: 1px solid #E1E4E8;">
                    <p style="margin: 0; color: #9BA1A9; font-size: 12px;">
                      © 2025 EaseMail. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
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

export function getRSVPChangeNotificationSubject(data: Pick<RSVPChangeNotificationData, 'eventTitle' | 'attendeeEmail' | 'newStatus'>): string {
  const statusEmoji = getStatusDisplay(data.newStatus).emoji;
  const statusText = getStatusDisplay(data.newStatus).text;
  return `${statusEmoji} ${data.attendeeEmail} ${statusText.toLowerCase()} your invitation: ${data.eventTitle}`;
}
