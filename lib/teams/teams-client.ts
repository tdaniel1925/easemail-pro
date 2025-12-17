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

export class TeamsClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Make an authenticated request to the Graph API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    useBeta = false
  ): Promise<T> {
    const baseUrl = useBeta ? GRAPH_API_BETA : GRAPH_API_BASE;
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error: GraphApiError = await response.json();
      console.error('Graph API error:', error);
      throw new Error(error.error?.message || `Graph API error: ${response.status}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
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
}

/**
 * Create a Teams client with the given access token
 */
export function createTeamsClient(accessToken: string): TeamsClient {
  return new TeamsClient(accessToken);
}
