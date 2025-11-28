/**
 * JMAP EventSource for real-time email updates
 * Provides instant notifications when new emails arrive
 */

import { createFastmailJMAPClient } from './client';

export interface JMAPStateChange {
  type: 'Email' | 'Mailbox' | 'Thread';
  changed: Record<string, string>; // accountId -> state
}

export interface EventSourceOptions {
  apiToken: string;
  accountId: string;
  onStateChange?: (change: JMAPStateChange) => void;
  onError?: (error: Error) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export class JMAPEventSource {
  private eventSource: EventSource | null = null;
  private apiToken: string;
  private accountId: string;
  private pingUrl: string;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private options: EventSourceOptions;

  constructor(options: EventSourceOptions) {
    this.apiToken = options.apiToken;
    this.accountId = options.accountId;
    this.options = options;
    this.pingUrl = '';
  }

  /**
   * Connect to JMAP EventSource
   */
  async connect(): Promise<void> {
    try {
      console.log('[JMAP EventSource] Connecting...');

      // First, get the EventSource URL from JMAP session
      const jmapClient = createFastmailJMAPClient(this.apiToken);
      const session = await jmapClient.connect();

      // Fastmail provides an EventSource URL in the session
      // Format: https://api.fastmail.com/jmap/eventsource/?types=*&closeafter=state&ping=300
      const eventSourceUrl = new URL('https://api.fastmail.com/jmap/eventsource/');
      eventSourceUrl.searchParams.set('types', 'Email,Mailbox,Thread');
      eventSourceUrl.searchParams.set('closeafter', 'state');
      eventSourceUrl.searchParams.set('ping', '300'); // Keep-alive ping every 5 minutes

      this.pingUrl = eventSourceUrl.toString();

      // Create EventSource with authentication
      // Note: EventSource doesn't support custom headers, so we use query param auth
      const authenticatedUrl = new URL(this.pingUrl);
      authenticatedUrl.searchParams.set('access_token', this.apiToken);

      console.log('[JMAP EventSource] Opening connection to:', this.pingUrl);

      this.eventSource = new EventSource(authenticatedUrl.toString());

      // Handle connection opened
      this.eventSource.onopen = () => {
        console.log('[JMAP EventSource] ✅ Connected');
        this.options.onConnected?.();
      };

      // Handle state changes
      this.eventSource.addEventListener('state', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[JMAP EventSource] State change received:', data);

          if (data.changed) {
            // Check if Email state changed for our account
            const emailState = data.changed[this.accountId];
            if (emailState?.Email) {
              console.log('[JMAP EventSource] 📧 New emails detected!');
              this.options.onStateChange?.({
                type: 'Email',
                changed: data.changed,
              });
            }

            // Check for mailbox changes
            if (emailState?.Mailbox) {
              console.log('[JMAP EventSource] 📁 Mailbox changes detected!');
              this.options.onStateChange?.({
                type: 'Mailbox',
                changed: data.changed,
              });
            }
          }
        } catch (error) {
          console.error('[JMAP EventSource] Error parsing state change:', error);
        }
      });

      // Handle errors
      this.eventSource.onerror = (error) => {
        console.error('[JMAP EventSource] ❌ Connection error:', error);
        this.options.onError?.(new Error('EventSource connection error'));
        this.options.onDisconnected?.();

        // Attempt to reconnect after 5 seconds
        this.scheduleReconnect();
      };

    } catch (error) {
      console.error('[JMAP EventSource] Failed to connect:', error);
      this.options.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Disconnect from EventSource
   */
  disconnect(): void {
    console.log('[JMAP EventSource] Disconnecting...');

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.options.onDisconnected?.();
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      return; // Already scheduled
    }

    console.log('[JMAP EventSource] Scheduling reconnect in 5 seconds...');

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect().catch((error) => {
        console.error('[JMAP EventSource] Reconnect failed:', error);
      });
    }, 5000);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
}

/**
 * Create JMAP EventSource for Fastmail account
 */
export function createJMAPEventSource(options: EventSourceOptions): JMAPEventSource {
  return new JMAPEventSource(options);
}
