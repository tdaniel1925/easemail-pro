interface CalendarInvitationData {
  eventTitle: string;
  eventDescription?: string;
  eventLocation?: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  organizerName: string;
  organizerEmail: string;
  attendeeEmail: string;
  attendeeName?: string;
  rsvpAcceptLink: string;
  rsvpDeclineLink: string;
  rsvpTentativeLink: string;
  timezone?: string;
  customMessage?: string;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Escape text but preserve line breaks
 */
function escapeText(text: string): string {
  return escapeHtml(text).replace(/\n/g, '<br>');
}

export function getCalendarInvitationTemplate(data: CalendarInvitationData): string {
  const formatDate = (date: Date, allDay: boolean, timezone?: string): string => {
    if (allDay) {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
    
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone || 'UTC',
    };
    
    return date.toLocaleString('en-US', options);
  };

  const formatTime = (date: Date, timezone?: string): string => {
    const options: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone || 'UTC',
    };
    return date.toLocaleTimeString('en-US', options);
  };

  const startDateFormatted = formatDate(data.startDate, data.allDay, data.timezone);
  const endDateFormatted = data.allDay 
    ? formatDate(data.endDate, data.allDay, data.timezone)
    : formatDate(data.endDate, false, data.timezone);
  const timeRange = data.allDay 
    ? 'All Day'
    : `${formatTime(data.startDate, data.timezone)} - ${formatTime(data.endDate, data.timezone)}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation: ${data.eventTitle}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F5F6F8;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F5F6F8;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);">
          
          <!-- Header with Calendar Icon -->
          <tr>
            <td style="background: linear-gradient(135deg, #5B7DA8 0%, #4C6B9A 100%); padding: 40px 40px 30px; text-align: center;">
              <div style="display: inline-block; width: 56px; height: 56px; background: rgba(255, 255, 255, 0.2); border-radius: 12px; margin-bottom: 16px; line-height: 56px; font-size: 28px;">
                📅
              </div>
              <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Calendar Invitation</h1>
              <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.95); font-size: 14px; font-weight: 500;">You've been invited to an event</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <!-- Greeting -->
              <h2 style="margin: 0 0 24px; color: #1A1D23; font-size: 24px; font-weight: 700; line-height: 1.3;">
                ${data.attendeeName ? `Hi ${data.attendeeName},` : 'Hi there,'}
              </h2>
              
              <p style="margin: 0 0 24px; color: #5C616B; font-size: 16px; line-height: 1.6;">
                <strong style="color: #1A1D23;">${data.organizerName}</strong> has invited you to an event.
              </p>

              <!-- Event Details Box -->
              <div style="margin: 0 0 32px; padding: 24px; background: linear-gradient(135deg, #EFF7FF 0%, #E8F3FF 100%); border-radius: 8px; border: 1px solid #D0E7FF;">
                <table width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding-bottom: 16px;">
                      <p style="margin: 0; color: #5C616B; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Event</p>
                      <p style="margin: 4px 0 0; color: #1A1D23; font-size: 22px; font-weight: 700; line-height: 1.3;">${data.eventTitle}</p>
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
                            <p style="margin: 4px 0 0; color: #1A1D23; font-size: 16px; font-weight: 600;">${startDateFormatted}</p>
                            ${!data.allDay ? `<p style="margin: 4px 0 0; color: #5C616B; font-size: 14px;">${timeRange}</p>` : ''}
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
                  ${data.eventDescription ? `
                  <tr>
                    <td style="padding: 16px 0; border-top: 1px solid #D0E7FF;">
                      <p style="margin: 0; color: #5C616B; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Description</p>
                      <p style="margin: 0; color: #1A1D23; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${data.eventDescription}</p>
                    </td>
                  </tr>
                  ` : ''}
                </table>
              </div>

              <!-- RSVP Buttons -->
              <div style="margin: 0 0 32px;">
                <p style="margin: 0 0 16px; color: #1A1D23; font-size: 15px; font-weight: 600; text-align: center;">Will you be attending?</p>
                <table width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" style="padding: 0 4px;">
                      <a href="${data.rsvpAcceptLink}" 
                         style="display: inline-block; padding: 14px 24px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #FFFFFF; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);">
                        ✓ Accept
                      </a>
                    </td>
                    <td align="center" style="padding: 0 4px;">
                      <a href="${data.rsvpTentativeLink}" 
                         style="display: inline-block; padding: 14px 24px; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: #FFFFFF; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; box-shadow: 0 2px 8px rgba(245, 158, 11, 0.25);">
                        ? Tentative
                      </a>
                    </td>
                    <td align="center" style="padding: 0 4px;">
                      <a href="${data.rsvpDeclineLink}" 
                         style="display: inline-block; padding: 14px 24px; background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); color: #FFFFFF; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; box-shadow: 0 2px 8px rgba(239, 68, 68, 0.25);">
                        ✗ Decline
                      </a>
                    </td>
                  </tr>
                </table>
              </div>

              ${data.customMessage ? `
              <!-- Custom Message -->
              <div style="padding: 20px; background-color: #FFF9E6; border-left: 3px solid #F59E0B; border-radius: 6px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px; color: #1A1D23; font-size: 14px; font-weight: 600;">Personal Note from ${escapeText(data.organizerName)}</p>
                <p style="margin: 0; color: #5C616B; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${escapeText(data.customMessage)}</p>
              </div>
              ` : ''}

              <!-- Add to Calendar Note -->
              <div style="padding: 16px; background-color: #F0F9FF; border-left: 3px solid #3B82F6; border-radius: 6px; margin-bottom: 32px;">
                <table cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="width: 24px; vertical-align: top; padding-right: 12px; font-size: 18px;">📎</td>
                    <td>
                      <p style="margin: 0; color: #1A1D23; font-size: 14px; font-weight: 600;">Add to Calendar</p>
                      <p style="margin: 4px 0 0; color: #5C616B; font-size: 13px; line-height: 1.5;">
                        An iCalendar (.ics) file is attached to this email. Click it to add this event to your calendar.
                      </p>
                    </td>
                  </tr>
                </table>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; border-top: 1px solid #E1E4E8; background-color: #FAFBFC;">
              <table width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <p style="margin: 0; color: #5C616B; font-size: 13px; line-height: 1.6;">
                      This invitation was sent by <strong style="color: #1A1D23;">${data.organizerName}</strong>.
                    </p>
                    <p style="margin: 8px 0 0; color: #5C616B; font-size: 13px; line-height: 1.6;">
                      Questions? Contact <a href="mailto:${data.organizerEmail}" style="color: #4C6B9A; text-decoration: none;">${data.organizerEmail}</a>
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
        
        <!-- Footer Text -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="margin-top: 24px;">
          <tr>
            <td align="center" style="padding: 0 20px;">
              <p style="margin: 0; color: #9BA1A9; font-size: 12px; line-height: 1.6;">
                This email was sent to <strong style="color: #5C616B;">${data.attendeeEmail}</strong> because 
                <strong style="color: #5C616B;">${data.organizerName}</strong> invited you to this event.
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

export function getCalendarInvitationSubject(data: Pick<CalendarInvitationData, 'eventTitle'>): string {
  return `Invitation: ${data.eventTitle}`;
}

