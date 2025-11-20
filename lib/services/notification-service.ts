/**
 * Browser Notification Service
 * Handles desktop notifications for calendar reminders (Outlook-like behavior)
 */

export type NotificationPermissionStatus = 'granted' | 'denied' | 'default';

export interface EventReminder {
  eventId: string;
  eventTitle: string;
  eventStart: Date;
  eventLocation?: string;
  minutesBefore: number;
}

export interface ScheduledNotification {
  id: string;
  eventId: string;
  scheduledTime: Date;
  timeoutId: NodeJS.Timeout;
}

class NotificationService {
  private scheduledNotifications: Map<string, ScheduledNotification> = new Map();

  /**
   * Request notification permission from the user
   */
  async requestPermission(): Promise<NotificationPermissionStatus> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('⚠️ Browser notifications not supported');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      console.log('✅ Notification permission already granted');
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      console.warn('⚠️ Notification permission denied');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      console.log(`📢 Notification permission: ${permission}`);
      return permission as NotificationPermissionStatus;
    } catch (error) {
      console.error('❌ Failed to request notification permission:', error);
      return 'denied';
    }
  }

  /**
   * Check current permission status
   */
  getPermissionStatus(): NotificationPermissionStatus {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission as NotificationPermissionStatus;
  }

  /**
   * Show a notification immediately
   */
  showNotification(title: string, options?: NotificationOptions): Notification | null {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('⚠️ Browser notifications not supported');
      return null;
    }

    if (Notification.permission !== 'granted') {
      console.warn('⚠️ Notification permission not granted');
      return null;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });

      // Auto-close after 10 seconds (Outlook behavior)
      setTimeout(() => notification.close(), 10000);

      return notification;
    } catch (error) {
      console.error('❌ Failed to show notification:', error);
      return null;
    }
  }

  /**
   * Schedule a calendar reminder notification
   */
  scheduleReminder(reminder: EventReminder): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const now = new Date();
    const eventStart = new Date(reminder.eventStart);
    const notificationTime = new Date(eventStart.getTime() - reminder.minutesBefore * 60 * 1000);

    // Don't schedule if the notification time has passed
    if (notificationTime <= now) {
      console.log(`⏭️ Skipping past reminder for event: ${reminder.eventTitle}`);
      return null;
    }

    const msUntilNotification = notificationTime.getTime() - now.getTime();
    const notificationId = `${reminder.eventId}-${reminder.minutesBefore}`;

    // Cancel existing notification for this event+time if it exists
    this.cancelNotification(notificationId);

    // Schedule the notification
    const timeoutId = setTimeout(() => {
      const timeUntilEvent = Math.round(reminder.minutesBefore);
      const timeLabel = timeUntilEvent === 1 ? '1 minute' : `${timeUntilEvent} minutes`;

      const body = reminder.eventLocation
        ? `Starting in ${timeLabel} at ${reminder.eventLocation}`
        : `Starting in ${timeLabel}`;

      const notification = this.showNotification(reminder.eventTitle, {
        body,
        tag: reminder.eventId, // Prevents duplicate notifications
        requireInteraction: false, // Auto-dismiss like Outlook
        silent: false,
        data: {
          eventId: reminder.eventId,
          url: '/calendar', // Navigate to calendar on click
        },
      });

      // Handle notification click - focus calendar
      if (notification) {
        notification.onclick = () => {
          window.focus();
          window.location.href = '/calendar';
          notification.close();
        };
      }

      // Remove from scheduled map after showing
      this.scheduledNotifications.delete(notificationId);
    }, msUntilNotification);

    // Store scheduled notification
    this.scheduledNotifications.set(notificationId, {
      id: notificationId,
      eventId: reminder.eventId,
      scheduledTime: notificationTime,
      timeoutId,
    });

    console.log(
      `⏰ Scheduled reminder for "${reminder.eventTitle}" at ${notificationTime.toLocaleString()} (in ${Math.round(msUntilNotification / 1000 / 60)} minutes)`
    );

    return notificationId;
  }

  /**
   * Cancel a scheduled notification
   */
  cancelNotification(notificationId: string): boolean {
    const scheduled = this.scheduledNotifications.get(notificationId);

    if (scheduled) {
      clearTimeout(scheduled.timeoutId);
      this.scheduledNotifications.delete(notificationId);
      console.log(`🗑️ Cancelled notification: ${notificationId}`);
      return true;
    }

    return false;
  }

  /**
   * Cancel all notifications for a specific event
   */
  cancelEventNotifications(eventId: string): number {
    let cancelled = 0;

    Array.from(this.scheduledNotifications.entries()).forEach(([id, scheduled]) => {
      if (scheduled.eventId === eventId) {
        clearTimeout(scheduled.timeoutId);
        this.scheduledNotifications.delete(id);
        cancelled++;
      }
    });

    if (cancelled > 0) {
      console.log(`🗑️ Cancelled ${cancelled} notifications for event: ${eventId}`);
    }

    return cancelled;
  }

  /**
   * Cancel all scheduled notifications
   */
  cancelAllNotifications(): number {
    const count = this.scheduledNotifications.size;

    Array.from(this.scheduledNotifications.values()).forEach(scheduled => {
      clearTimeout(scheduled.timeoutId);
    });

    this.scheduledNotifications.clear();
    console.log(`🗑️ Cancelled all ${count} scheduled notifications`);

    return count;
  }

  /**
   * Get all scheduled notifications
   */
  getScheduledNotifications(): ScheduledNotification[] {
    return Array.from(this.scheduledNotifications.values());
  }

  /**
   * Get count of scheduled notifications
   */
  getScheduledCount(): number {
    return this.scheduledNotifications.size;
  }
}

// Singleton instance
export const notificationService = new NotificationService();
