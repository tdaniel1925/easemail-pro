/**
 * Desktop Notification Service
 * Handles browser push notifications for new emails
 */

export interface NotificationPermissionState {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

export interface NotificationPreferences {
  enabled: boolean;
  sound: boolean;
  showPreview: boolean;
  quietHours?: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string; // HH:MM format
  };
}

/**
 * Request notification permission from the browser
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notifications');
    return { granted: false, denied: false, default: true };
  }

  if (Notification.permission === 'granted') {
    return { granted: true, denied: false, default: false };
  }

  if (Notification.permission === 'denied') {
    return { granted: false, denied: true, default: false };
  }

  try {
    const permission = await Notification.requestPermission();
    return {
      granted: permission === 'granted',
      denied: permission === 'denied',
      default: permission === 'default',
    };
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return { granted: false, denied: false, default: true };
  }
}

/**
 * Check current notification permission state
 */
export function getNotificationPermission(): NotificationPermissionState {
  if (!('Notification' in window)) {
    return { granted: false, denied: false, default: true };
  }

  return {
    granted: Notification.permission === 'granted',
    denied: Notification.permission === 'denied',
    default: Notification.permission === 'default',
  };
}

/**
 * Check if we're in quiet hours
 */
function isQuietHours(preferences: NotificationPreferences): boolean {
  if (!preferences.quietHours?.enabled) return false;

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  const { start, end } = preferences.quietHours;
  
  // Handle overnight quiet hours (e.g., 22:00 to 08:00)
  if (start > end) {
    return currentTime >= start || currentTime <= end;
  }
  
  // Normal quiet hours (e.g., 13:00 to 14:00)
  return currentTime >= start && currentTime <= end;
}

/**
 * Show a notification for a new email
 */
export async function showEmailNotification(email: {
  from: string;
  fromName?: string;
  subject: string;
  snippet?: string;
  accountEmail?: string;
}): Promise<Notification | null> {
  // Check if notifications are supported
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return null;
  }

  // Check permission
  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return null;
  }

  // Get preferences from localStorage
  const prefsStr = localStorage.getItem('notificationPreferences');
  const preferences: NotificationPreferences = prefsStr 
    ? JSON.parse(prefsStr) 
    : { enabled: true, sound: true, showPreview: true };

  // Check if notifications are enabled
  if (!preferences.enabled) {
    console.log('Notifications disabled in preferences');
    return null;
  }

  // Check quiet hours
  if (isQuietHours(preferences)) {
    console.log('In quiet hours - suppressing notification');
    return null;
  }

  // Build notification
  const title = email.fromName || email.from;
  const body = preferences.showPreview 
    ? `${email.subject}\n${email.snippet || ''}`.substring(0, 150)
    : email.subject;

  const notification = new Notification(title, {
    body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: `email-${email.from}-${Date.now()}`, // Prevents duplicate notifications
    requireInteraction: false, // Auto-dismiss after a few seconds
    silent: !preferences.sound,
    data: {
      url: '/inbox-v3',
      from: email.from,
      subject: email.subject,
    },
  });

  // Handle notification click
  notification.onclick = function (event) {
    event.preventDefault();
    window.focus();
    // Navigate to inbox
    if (notification.data?.url) {
      window.location.href = notification.data.url;
    }
    notification.close();
  };

  // Play sound if enabled
  if (preferences.sound) {
    playNotificationSound();
  }

  return notification;
}

/**
 * Play notification sound
 */
function playNotificationSound() {
  try {
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800; // Frequency in hertz
    oscillator.type = 'sine'; // Sine wave

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime); // Volume
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
}

/**
 * Get notification preferences from localStorage
 */
export function getNotificationPreferences(): NotificationPreferences {
  const prefsStr = localStorage.getItem('notificationPreferences');
  if (prefsStr) {
    return JSON.parse(prefsStr);
  }
  
  // Default preferences
  return {
    enabled: true,
    sound: true,
    showPreview: true,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
  };
}

/**
 * Save notification preferences to localStorage
 */
export function saveNotificationPreferences(preferences: NotificationPreferences): void {
  localStorage.setItem('notificationPreferences', JSON.stringify(preferences));
  
  // Dispatch event so other components can react
  window.dispatchEvent(new CustomEvent('notificationPreferencesChanged', {
    detail: preferences,
  }));
}

/**
 * Test notification
 */
export async function testNotification(): Promise<void> {
  await showEmailNotification({
    from: 'test@example.com',
    fromName: 'Test Sender',
    subject: 'Test Notification',
    snippet: 'This is a test notification to verify your notification settings are working correctly.',
  });
}

