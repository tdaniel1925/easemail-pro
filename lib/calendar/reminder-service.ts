/**
 * Reminder Execution Service
 * Checks for upcoming events and sends reminders via email/SMS
 */

import { db } from '@/lib/db/drizzle';
import { calendarEvents, contacts, users } from '@/lib/db/schema';
import { gte, lte, eq, and } from 'drizzle-orm';

interface ReminderToSend {
  eventId: string;
  userId: string;
  title: string;
  startTime: Date;
  location?: string;
  description?: string;
  reminderType: 'email' | 'sms' | 'popup';
  minutesBefore: number;
}

/**
 * Find events that need reminders sent
 */
export async function findEventsNeedingReminders(): Promise<ReminderToSend[]> {
  try {
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    // Get events starting in the next 2 hours that have reminders
    const upcomingEvents = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          gte(calendarEvents.startTime, now),
          lte(calendarEvents.startTime, twoHoursFromNow),
          eq(calendarEvents.status, 'confirmed' as any)
        )
      );
    
    const remindersToSend: ReminderToSend[] = [];
    
    for (const event of upcomingEvents) {
      if (!event.reminders || event.reminders.length === 0) continue;
      
      const eventStartTime = new Date(event.startTime);
      const minutesUntilEvent = Math.floor((eventStartTime.getTime() - now.getTime()) / (1000 * 60));
      
      for (const reminder of event.reminders) {
        // Check if it's time to send this reminder
        const shouldSend = minutesUntilEvent <= reminder.minutesBefore && 
                          minutesUntilEvent >= (reminder.minutesBefore - 5); // 5-minute window
        
        if (shouldSend) {
          // Check if already sent (stored in metadata)
          const sentKey = `reminder_sent_${reminder.type}_${reminder.minutesBefore}`;
          if (event.metadata && (event.metadata as any)[sentKey]) {
            continue; // Already sent
          }
          
          remindersToSend.push({
            eventId: event.id,
            userId: event.userId,
            title: event.title,
            startTime: eventStartTime,
            location: event.location || undefined,
            description: event.description || undefined,
            reminderType: reminder.type,
            minutesBefore: reminder.minutesBefore,
          });
        }
      }
    }
    
    return remindersToSend;
    
  } catch (error) {
    console.error('❌ Failed to find events needing reminders:', error);
    throw error;
  }
}

/**
 * Send email reminder
 */
export async function sendEmailReminder(reminder: ReminderToSend): Promise<boolean> {
  try {
    // Get user email
    const userResult = await db.query.users.findFirst({
      where: eq(calendarEvents.userId, reminder.userId)
    });
    
    if (!userResult || !userResult.email) {
      console.warn(`No email found for user ${reminder.userId}`);
      return false;
    }
    
    // Format time
    const timeStr = reminder.startTime.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    
    // Build email content
    const subject = `Reminder: ${reminder.title}`;
    const body = `
      <h2>Event Reminder</h2>
      <p><strong>${reminder.title}</strong></p>
      <p><strong>When:</strong> ${timeStr}</p>
      ${reminder.location ? `<p><strong>Where:</strong> ${reminder.location}</p>` : ''}
      ${reminder.description ? `<p><strong>Details:</strong> ${reminder.description}</p>` : ''}
      <p>This event starts in ${reminder.minutesBefore} minutes.</p>
    `;
    
    // Send via your email API (you already have Nylas email sending)
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/nylas/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: [userResult.email],
        subject,
        body,
      }),
    });
    
    const result = await response.json();
    
    if (result.success) {
      await markReminderSent(reminder.eventId, reminder.reminderType, reminder.minutesBefore);
      console.log(`✅ Email reminder sent for event ${reminder.eventId}`);
      return true;
    } else {
      console.error(`❌ Failed to send email reminder: ${result.error}`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Email reminder error:', error);
    return false;
  }
}

/**
 * Send SMS reminder
 * ✅ FIXED: Now actually sends SMS via Twilio
 */
export async function sendSMSReminder(reminder: ReminderToSend): Promise<boolean> {
  try {
    // ✅ Get user's email to look up their contact
    const userResult = await db.query.users.findFirst({
      where: eq(users.id, reminder.userId)
    });

    if (!userResult || !userResult.email) {
      console.warn(`❌ No user found for ${reminder.userId}`);
      return false;
    }

    // Look up user's phone in contacts table (user's own contact)
    const userContact = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.userId, reminder.userId),
        eq(contacts.email, userResult.email)
      )
    });

    if (!userContact || !userContact.phone) {
      console.warn(`📱 SMS reminder skipped - no phone number for user ${reminder.userId} (email: ${userResult.email})`);
      console.warn(`ℹ️  To enable SMS reminders, user must add themselves as a contact with a phone number`);
      // Don't mark as sent since it wasn't actually sent
      return false;
    }

    // Format reminder message
    const timeStr = reminder.startTime.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    const message = `📅 Reminder: ${reminder.title} at ${timeStr}${reminder.location ? ` at ${reminder.location}` : ''}`;

    // ✅ Send via Twilio
    const { sendSMS } = await import('@/lib/sms/twilio-client-v2');
    const result = await sendSMS({
      to: userContact.phone,
      message,
    });

    if (result.success) {
      await markReminderSent(reminder.eventId, reminder.reminderType, reminder.minutesBefore);
      console.log(`✅ SMS reminder sent to ${userContact.phone} for event ${reminder.eventId} (SID: ${result.sid})`);
      return true;
    } else {
      console.error(`❌ SMS reminder failed: ${result.error}`);
      return false;
    }

  } catch (error) {
    console.error('❌ SMS reminder error:', error);
    return false;
  }
}

/**
 * Mark reminder as sent in event metadata
 */
async function markReminderSent(
  eventId: string,
  reminderType: string,
  minutesBefore: number
): Promise<void> {
  try {
    const event = await db.query.calendarEvents.findFirst({
      where: eq(calendarEvents.id, eventId)
    });
    
    if (!event) return;
    
    const sentKey = `reminder_sent_${reminderType}_${minutesBefore}`;
    const updatedMetadata = {
      ...(event.metadata || {}),
      [sentKey]: new Date().toISOString(),
    };
    
    await db
      .update(calendarEvents)
      .set({
        metadata: updatedMetadata as any,
        updatedAt: new Date(),
      })
      .where(eq(calendarEvents.id, eventId));
    
  } catch (error) {
    console.error('Failed to mark reminder as sent:', error);
  }
}

/**
 * Process all pending reminders
 */
export async function processReminders(): Promise<{
  processed: number;
  sent: number;
  failed: number;
}> {
  try {
    console.log('🔔 Starting reminder processing...');
    
    const reminders = await findEventsNeedingReminders();
    console.log(`Found ${reminders.length} reminders to send`);
    
    let sent = 0;
    let failed = 0;
    
    for (const reminder of reminders) {
      let success = false;
      
      if (reminder.reminderType === 'email') {
        success = await sendEmailReminder(reminder);
      } else if (reminder.reminderType === 'sms') {
        success = await sendSMSReminder(reminder);
      } else {
        // Popup reminders are handled client-side
        await markReminderSent(reminder.eventId, reminder.reminderType, reminder.minutesBefore);
        success = true;
      }
      
      if (success) {
        sent++;
      } else {
        failed++;
      }
    }
    
    console.log(`✅ Reminder processing complete: ${sent} sent, ${failed} failed`);
    
    return {
      processed: reminders.length,
      sent,
      failed,
    };
    
  } catch (error) {
    console.error('❌ Reminder processing error:', error);
    throw error;
  }
}

