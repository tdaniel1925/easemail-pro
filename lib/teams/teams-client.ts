// Microsoft Teams Graph API Client
import {
  TeamsChat,
  TeamsMessage,
  TeamsChatMember,
  GraphApiResponse,
  GraphApiError,
  SendTeamsMessageRequest,
  SendTeamsMessageResponse,
  TeamsSubscription,
  CreateSubscriptionRequest,
} from './teams-types';

const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';
const GRAPH_API_BETA = 'https://graph.microsoft.com/beta';

// Retry configuration
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // 1 second

/**
 * Helper function for exponential backoff with jitter
 */
function calculateBackoffDelay(attempt: number, baseDelayMs: number = BASE_DELAY_MS): number {
  // Exponential backoff: 1s, 2s, 4s
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  // Add jitter to prevent thundering herd (±20%)
  const jitter = exponentialDelay * 0.2 * (Math.random() - 0.5);
  return Math.floor(exponentialDelay + jitter);
}

/**
 * Check if an error is retryable
 */
function isRetryableError(status: number, error?: GraphApiError): boolean {
  // Retry on rate limits (429)
  if (status === 429) return true;

  // Retry on server errors (5xx)
  if (status >= 500 && status < 600) return true;

  // Don't retry on client errors (4xx) except 429
  return false;
}

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class TeamsClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Make an authenticated request to the Graph API with retry logic
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    useBeta = false
  ): Promise<T> {
    const baseUrl = useBeta ? GRAPH_API_BETA : GRAPH_API_BASE;
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        if (!response.ok) {
          const error: GraphApiError = await response.json().catch(() => ({
            error: { message: `HTTP ${response.status}` },
          }));

          // Check if we should retry
          if (attempt < MAX_RETRIES && isRetryableError(response.status, error)) {
            // Calculate delay (honor Retry-After header for 429)
            let delayMs = calculateBackoffDelay(attempt);

            if (response.status === 429) {
              const retryAfter = response.headers.get('Retry-After');
              if (retryAfter) {
                // Retry-After can be in seconds or a date
                const retryAfterSeconds = parseInt(retryAfter);
                if (!isNaN(retryAfterSeconds)) {
                  delayMs = retryAfterSeconds * 1000;
                }
              }
            }

            console.warn(
              `⚠️ Graph API error ${response.status}, retrying in ${delayMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`
            );

            await sleep(delayMs);
            continue; // Retry
          }

          // Not retryable or max retries reached
          console.error('Graph API error:', error);
          throw new Error(error.error?.message || `Graph API error: ${response.status}`);
        }

        // Success - handle 204 No Content
        if (response.status === 204) {
          return {} as T;
        }

        return response.json();
      } catch (error: any) {
        lastError = error;

        // Check if it's a network error (retryable)
        const isNetworkError =
          error.name === 'TypeError' ||
          error.code === 'ECONNRESET' ||
          error.code === 'ETIMEDOUT' ||
          error.code === 'ENOTFOUND';

        if (attempt < MAX_RETRIES && isNetworkError) {
          const delayMs = calculateBackoffDelay(attempt);
          console.warn(
            `⚠️ Network error, retrying in ${delayMs}ms (attempt ${attempt + 1}/${MAX_RETRIES}): ${error.message}`
          );
          await sleep(delayMs);
          continue; // Retry
        }

        // Not retryable or max retries reached
        throw error;
      }
    }

    // Max retries exceeded
    throw lastError || new Error('Max retries exceeded');
  }

  // ============================================
  // CHAT OPERATIONS
  // ============================================

  /**
   * Get all chats for the authenticated user
   */
  async getChats(options?: {
    top?: number;
    skipToken?: string;
    expand?: string[];
  }): Promise<GraphApiResponse<TeamsChat>> {
    const params = new URLSearchParams();

    if (options?.top) {
      params.append('$top', options.top.toString());
    }
    if (options?.skipToken) {
      params.append('$skiptoken', options.skipToken);
    }
    if (options?.expand?.length) {
      params.append('$expand', options.expand.join(','));
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<GraphApiResponse<TeamsChat>>(`/me/chats${query}`);
  }

  /**
   * Get a specific chat by ID
   */
  async getChat(chatId: string, expand?: string[]): Promise<TeamsChat> {
    const params = expand?.length ? `?$expand=${expand.join(',')}` : '';
    return this.request<TeamsChat>(`/me/chats/${chatId}${params}`);
  }

  /**
   * Get members of a chat
   */
  async getChatMembers(chatId: string): Promise<GraphApiResponse<TeamsChatMember>> {
    return this.request<GraphApiResponse<TeamsChatMember>>(`/me/chats/${chatId}/members`);
  }

  /**
   * Create a new 1:1 chat with a user
   */
  async createOneOnOneChat(otherUserId: string): Promise<TeamsChat> {
    return this.request<TeamsChat>('/chats', {
      method: 'POST',
      body: JSON.stringify({
        chatType: 'oneOnOne',
        members: [
          {
            '@odata.type': '#microsoft.graph.aadUserConversationMember',
            roles: ['owner'],
            'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${otherUserId}')`,
          },
        ],
      }),
    });
  }

  /**
   * Create a new group chat
   */
  async createGroupChat(topic: string, memberIds: string[]): Promise<TeamsChat> {
    const members = memberIds.map(id => ({
      '@odata.type': '#microsoft.graph.aadUserConversationMember',
      roles: ['owner'],
      'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${id}')`,
    }));

    return this.request<TeamsChat>('/chats', {
      method: 'POST',
      body: JSON.stringify({
        chatType: 'group',
        topic,
        members,
      }),
    });
  }

  // ============================================
  // MESSAGE OPERATIONS
  // ============================================

  /**
   * Get messages from a chat
   */
  async getChatMessages(
    chatId: string,
    options?: {
      top?: number;
      skipToken?: string;
      deltaLink?: string;
    }
  ): Promise<GraphApiResponse<TeamsMessage>> {
    // If we have a delta link, use it directly
    if (options?.deltaLink) {
      return this.request<GraphApiResponse<TeamsMessage>>(options.deltaLink);
    }

    const params = new URLSearchParams();
    if (options?.top) {
      params.append('$top', options.top.toString());
    }
    if (options?.skipToken) {
      params.append('$skiptoken', options.skipToken);
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<GraphApiResponse<TeamsMessage>>(`/me/chats/${chatId}/messages${query}`);
  }

  /**
   * Get messages from a chat using delta query (for incremental sync)
   */
  async getChatMessagesDelta(
    chatId: string,
    deltaLink?: string
  ): Promise<GraphApiResponse<TeamsMessage>> {
    if (deltaLink) {
      return this.request<GraphApiResponse<TeamsMessage>>(deltaLink);
    }
    return this.request<GraphApiResponse<TeamsMessage>>(`/me/chats/${chatId}/messages/delta`);
  }

  /**
   * Get a specific message
   */
  async getMessage(chatId: string, messageId: string): Promise<TeamsMessage> {
    return this.request<TeamsMessage>(`/me/chats/${chatId}/messages/${messageId}`);
  }

  /**
   * Send a message to a chat
   */
  async sendMessage(request: SendTeamsMessageRequest): Promise<SendTeamsMessageResponse> {
    try {
      const body: Record<string, any> = {
        body: {
          contentType: request.contentType || 'html',
          content: request.content,
        },
      };

      if (request.importance && request.importance !== 'normal') {
        body.importance = request.importance;
      }

      if (request.attachments?.length) {
        body.attachments = request.attachments;
      }

      if (request.mentions?.length) {
        body.mentions = request.mentions;
      }

      const response = await this.request<TeamsMessage>(
        `/me/chats/${request.chatId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify(body),
        }
      );

      return {
        success: true,
        messageId: response.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message',
      };
    }
  }

  /**
   * Update a message (edit)
   */
  async updateMessage(chatId: string, messageId: string, content: string): Promise<TeamsMessage> {
    return this.request<TeamsMessage>(`/me/chats/${chatId}/messages/${messageId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        body: {
          contentType: 'html',
          content,
        },
      }),
    });
  }

  /**
   * Soft delete a message
   */
  async deleteMessage(chatId: string, messageId: string): Promise<void> {
    await this.request<void>(`/me/chats/${chatId}/messages/${messageId}/softDelete`, {
      method: 'POST',
    });
  }

  // ============================================
  // REACTIONS
  // ============================================

  /**
   * Add a reaction to a message
   */
  async addReaction(chatId: string, messageId: string, reactionType: string): Promise<void> {
    await this.request<void>(
      `/me/chats/${chatId}/messages/${messageId}/setReaction`,
      {
        method: 'POST',
        body: JSON.stringify({ reactionType }),
      },
      true // Use beta API for reactions
    );
  }

  /**
   * Remove a reaction from a message
   */
  async removeReaction(chatId: string, messageId: string, reactionType: string): Promise<void> {
    await this.request<void>(
      `/me/chats/${chatId}/messages/${messageId}/unsetReaction`,
      {
        method: 'POST',
        body: JSON.stringify({ reactionType }),
      },
      true // Use beta API for reactions
    );
  }

  // ============================================
  // READ RECEIPTS
  // ============================================

  /**
   * Mark messages in a chat as read
   */
  async markChatAsRead(chatId: string): Promise<void> {
    await this.request<void>(`/me/chats/${chatId}/markChatReadForUser`, {
      method: 'POST',
      body: JSON.stringify({
        user: {
          id: null, // null means the current user
          tenantId: null,
        },
      }),
    });
  }

  /**
   * Mark messages in a chat as unread
   */
  async markChatAsUnread(chatId: string, lastMessageId: string): Promise<void> {
    await this.request<void>(`/me/chats/${chatId}/markChatUnreadForUser`, {
      method: 'POST',
      body: JSON.stringify({
        user: {
          id: null,
          tenantId: null,
        },
        lastMessageReadDateTime: null,
      }),
    });
  }

  // ============================================
  // PRESENCE
  // ============================================

  /**
   * Get presence status for a user
   */
  async getUserPresence(userId: string): Promise<{
    id: string;
    availability: string;
    activity: string;
  }> {
    return this.request(`/users/${userId}/presence`);
  }

  /**
   * Get presence for multiple users
   */
  async getBulkPresence(userIds: string[]): Promise<Array<{
    id: string;
    availability: string;
    activity: string;
  }>> {
    const response = await this.request<{ value: Array<{ id: string; availability: string; activity: string }> }>(
      '/communications/getPresencesByUserId',
      {
        method: 'POST',
        body: JSON.stringify({ ids: userIds }),
      }
    );
    return response.value;
  }

  // ============================================
  // SUBSCRIPTIONS (WEBHOOKS)
  // ============================================

  /**
   * Create a webhook subscription for chat messages
   */
  async createSubscription(request: CreateSubscriptionRequest): Promise<TeamsSubscription> {
    return this.request<TeamsSubscription>('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Update a subscription (extend expiration)
   */
  async updateSubscription(subscriptionId: string, expirationDateTime: string): Promise<TeamsSubscription> {
    return this.request<TeamsSubscription>(`/subscriptions/${subscriptionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ expirationDateTime }),
    });
  }

  /**
   * Delete a subscription
   */
  async deleteSubscription(subscriptionId: string): Promise<void> {
    await this.request<void>(`/subscriptions/${subscriptionId}`, {
      method: 'DELETE',
    });
  }

  /**
   * List all subscriptions
   */
  async listSubscriptions(): Promise<GraphApiResponse<TeamsSubscription>> {
    return this.request<GraphApiResponse<TeamsSubscription>>('/subscriptions');
  }

  // ============================================
  // USERS
  // ============================================

  /**
   * Search for users by name or email
   */
  async searchUsers(query: string, top = 10): Promise<GraphApiResponse<{
    id: string;
    displayName: string;
    mail: string;
    userPrincipalName: string;
  }>> {
    const filter = encodeURIComponent(
      `startswith(displayName,'${query}') or startswith(mail,'${query}')`
    );
    return this.request(`/users?$filter=${filter}&$top=${top}`);
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<{
    id: string;
    displayName: string;
    mail: string;
    userPrincipalName: string;
    jobTitle?: string;
  }> {
    return this.request(`/users/${userId}`);
  }

  /**
   * Get user's photo (returns base64)
   */
  async getUserPhoto(userId: string): Promise<string | null> {
    try {
      const response = await fetch(`${GRAPH_API_BASE}/users/${userId}/photo/$value`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      return `data:${blob.type};base64,${base64}`;
    } catch {
      return null;
    }
  }

  // ============================================
  // ONLINE MEETINGS
  // ============================================

  /**
   * Create an online meeting (Teams meeting)
   */
  async createOnlineMeeting(options: {
    subject: string;
    startDateTime: string; // ISO 8601 format
    endDateTime: string; // ISO 8601 format
    participants?: Array<{ email: string; name?: string }>;
    lobbyBypassSettings?: {
      scope?: 'everyone' | 'organization' | 'organizer' | 'invited';
      isDialInBypassEnabled?: boolean;
    };
    allowedPresenters?: 'everyone' | 'organization' | 'roleIsPresenter' | 'organizer';
    recordAutomatically?: boolean;
  }): Promise<{
    id: string;
    joinWebUrl: string;
    joinUrl: string;
    subject: string;
    startDateTime: string;
    endDateTime: string;
    videoTeleconferenceId?: string;
    chatInfo?: {
      threadId: string;
      messageId: string;
    };
  }> {
    const attendees = options.participants?.map(p => ({
      upn: p.email,
      role: 'attendee',
    })) || [];

    const body: Record<string, any> = {
      subject: options.subject,
      startDateTime: options.startDateTime,
      endDateTime: options.endDateTime,
      participants: {
        attendees,
      },
    };

    if (options.lobbyBypassSettings) {
      body.lobbyBypassSettings = options.lobbyBypassSettings;
    }
    if (options.allowedPresenters) {
      body.allowedPresenters = options.allowedPresenters;
    }
    if (options.recordAutomatically !== undefined) {
      body.recordAutomatically = options.recordAutomatically;
    }

    const meeting = await this.request<any>('/me/onlineMeetings', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return {
      id: meeting.id,
      joinWebUrl: meeting.joinWebUrl,
      joinUrl: meeting.joinUrl || meeting.joinWebUrl,
      subject: meeting.subject,
      startDateTime: meeting.startDateTime,
      endDateTime: meeting.endDateTime,
      videoTeleconferenceId: meeting.videoTeleconferenceId,
      chatInfo: meeting.chatInfo,
    };
  }

  /**
   * Get an online meeting by ID
   */
  async getOnlineMeeting(meetingId: string): Promise<any> {
    return this.request(`/me/onlineMeetings/${meetingId}`);
  }

  /**
   * Create a Meet Now instant meeting
   */
  async createInstantMeeting(subject?: string): Promise<{
    id: string;
    joinWebUrl: string;
    joinUrl: string;
    subject: string;
  }> {
    const now = new Date();
    const endTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

    const meeting = await this.request<any>('/me/onlineMeetings', {
      method: 'POST',
      body: JSON.stringify({
        subject: subject || 'Instant Meeting',
        startDateTime: now.toISOString(),
        endDateTime: endTime.toISOString(),
      }),
    });

    return {
      id: meeting.id,
      joinWebUrl: meeting.joinWebUrl,
      joinUrl: meeting.joinUrl || meeting.joinWebUrl,
      subject: meeting.subject,
    };
  }

  // ============================================
  // CALENDAR EVENTS
  // ============================================

  /**
   * Get calendar events (including Teams meetings)
   */
  async getCalendarEvents(options?: {
    startDateTime?: string;
    endDateTime?: string;
    top?: number;
    skip?: number;
    filter?: string;
    orderBy?: string;
  }): Promise<GraphApiResponse<CalendarEvent>> {
    const params = new URLSearchParams();

    if (options?.startDateTime && options?.endDateTime) {
      params.append('startDateTime', options.startDateTime);
      params.append('endDateTime', options.endDateTime);
    }
    if (options?.top) {
      params.append('$top', options.top.toString());
    }
    if (options?.skip) {
      params.append('$skip', options.skip.toString());
    }
    if (options?.filter) {
      params.append('$filter', options.filter);
    }
    if (options?.orderBy) {
      params.append('$orderby', options.orderBy);
    }

    const query = params.toString() ? `?${params.toString()}` : '';

    // Use calendarView for date range queries, events for other queries
    const endpoint = options?.startDateTime && options?.endDateTime
      ? `/me/calendarView${query}`
      : `/me/events${query}`;

    return this.request<GraphApiResponse<CalendarEvent>>(endpoint);
  }

  /**
   * Create a calendar event with optional Teams meeting
   */
  async createCalendarEvent(options: {
    subject: string;
    body?: { content: string; contentType?: 'text' | 'html' };
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    location?: { displayName: string };
    attendees?: Array<{
      email: string;
      name?: string;
      type?: 'required' | 'optional' | 'resource';
    }>;
    isOnlineMeeting?: boolean;
    onlineMeetingProvider?: 'teamsForBusiness' | 'skypeForBusiness' | 'skypeForConsumer';
    isAllDay?: boolean;
    recurrence?: any;
    reminderMinutesBeforeStart?: number;
    showAs?: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown';
    importance?: 'low' | 'normal' | 'high';
    sensitivity?: 'normal' | 'personal' | 'private' | 'confidential';
    categories?: string[];
  }): Promise<CalendarEvent> {
    const body: Record<string, any> = {
      subject: options.subject,
      start: options.start,
      end: options.end,
    };

    if (options.body) {
      body.body = {
        contentType: options.body.contentType || 'html',
        content: options.body.content,
      };
    }
    if (options.location) {
      body.location = options.location;
    }
    if (options.attendees) {
      body.attendees = options.attendees.map(a => ({
        emailAddress: { address: a.email, name: a.name },
        type: a.type || 'required',
      }));
    }
    if (options.isOnlineMeeting) {
      body.isOnlineMeeting = true;
      body.onlineMeetingProvider = options.onlineMeetingProvider || 'teamsForBusiness';
    }
    if (options.isAllDay !== undefined) {
      body.isAllDay = options.isAllDay;
    }
    if (options.recurrence) {
      body.recurrence = options.recurrence;
    }
    if (options.reminderMinutesBeforeStart !== undefined) {
      body.reminderMinutesBeforeStart = options.reminderMinutesBeforeStart;
    }
    if (options.showAs) {
      body.showAs = options.showAs;
    }
    if (options.importance) {
      body.importance = options.importance;
    }
    if (options.sensitivity) {
      body.sensitivity = options.sensitivity;
    }
    if (options.categories) {
      body.categories = options.categories;
    }

    return this.request<CalendarEvent>('/me/events', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * Update a calendar event
   */
  async updateCalendarEvent(eventId: string, updates: Partial<{
    subject: string;
    body: { content: string; contentType?: 'text' | 'html' };
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    location: { displayName: string };
    isOnlineMeeting: boolean;
    showAs: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown';
  }>): Promise<CalendarEvent> {
    return this.request<CalendarEvent>(`/me/events/${eventId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete a calendar event
   */
  async deleteCalendarEvent(eventId: string): Promise<void> {
    await this.request<void>(`/me/events/${eventId}`, {
      method: 'DELETE',
    });
  }

  /**
   * RSVP to a calendar event
   */
  async respondToCalendarEvent(
    eventId: string,
    response: 'accept' | 'tentativelyAccept' | 'decline',
    comment?: string,
    sendResponse: boolean = true
  ): Promise<void> {
    await this.request<void>(`/me/events/${eventId}/${response}`, {
      method: 'POST',
      body: JSON.stringify({
        comment: comment || '',
        sendResponse,
      }),
    });
  }

  /**
   * Get a single calendar event by ID
   */
  async getCalendarEvent(eventId: string): Promise<CalendarEvent> {
    return this.request<CalendarEvent>(`/me/events/${eventId}`);
  }
}

// Calendar event type from Graph API
export interface CalendarEvent {
  id: string;
  subject: string;
  bodyPreview?: string;
  body?: {
    contentType: string;
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
    locationType?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      countryOrRegion?: string;
      postalCode?: string;
    };
  };
  attendees?: Array<{
    emailAddress: {
      name: string;
      address: string;
    };
    type: string;
    status: {
      response: 'none' | 'organizer' | 'tentativelyAccepted' | 'accepted' | 'declined' | 'notResponded';
      time?: string;
    };
  }>;
  organizer?: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  isOnlineMeeting: boolean;
  onlineMeetingProvider?: string;
  onlineMeeting?: {
    joinUrl: string;
    conferenceId?: string;
    tollNumber?: string;
    tollFreeNumber?: string;
  };
  isAllDay: boolean;
  isCancelled: boolean;
  isOrganizer: boolean;
  responseRequested: boolean;
  responseStatus: {
    response: string;
    time?: string;
  };
  showAs: string;
  importance: string;
  sensitivity: string;
  categories?: string[];
  hasAttachments: boolean;
  webLink?: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  recurrence?: any;
  seriesMasterId?: string;
  type?: string;
}

/**
 * Create a Teams client with the given access token
 */
export function createTeamsClient(accessToken: string): TeamsClient {
  return new TeamsClient(accessToken);
}
