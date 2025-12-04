/**
 * Microsoft Graph API Client for Teams Integration
 *
 * Provides access to MS Teams features:
 * - Teams & Channels
 * - Chat messages (1:1 and group)
 * - Online Meetings
 * - User Presence
 * - Files (SharePoint/OneDrive)
 */

import { Client } from '@microsoft/microsoft-graph-client';

// MS Graph API Configuration
const MS_GRAPH_CONFIG = {
  clientId: process.env.MS_GRAPH_CLIENT_ID!,
  tenantId: process.env.MS_GRAPH_TENANT_ID!,
  clientSecret: process.env.MS_GRAPH_CLIENT_SECRET!,
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/ms-graph/callback`,
  scopes: [
    'User.Read',
    'User.ReadBasic.All',
    'Chat.ReadWrite',
    'Team.ReadBasic.All',
    'Channel.ReadBasic.All',
    'ChannelMessage.Send',
    'ChannelMessage.Read.All',
    'OnlineMeetings.ReadWrite',
    'Presence.Read.All',
    'Files.Read.All',
    'offline_access', // For refresh tokens
  ],
};

// Types for MS Graph responses
export interface MSGraphUser {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
  jobTitle?: string;
  officeLocation?: string;
  mobilePhone?: string;
  businessPhones?: string[];
}

export interface MSGraphTeam {
  id: string;
  displayName: string;
  description?: string;
  webUrl?: string;
  isArchived?: boolean;
}

export interface MSGraphChannel {
  id: string;
  displayName: string;
  description?: string;
  webUrl?: string;
  membershipType?: 'standard' | 'private' | 'shared';
}

export interface MSGraphChat {
  id: string;
  topic?: string;
  chatType: 'oneOnOne' | 'group' | 'meeting';
  createdDateTime: string;
  lastUpdatedDateTime?: string;
  members?: MSGraphChatMember[];
}

export interface MSGraphChatMember {
  id: string;
  displayName: string;
  email?: string;
  userId?: string;
}

export interface MSGraphMessage {
  id: string;
  createdDateTime: string;
  lastModifiedDateTime?: string;
  body: {
    contentType: 'text' | 'html';
    content: string;
  };
  from?: {
    user?: {
      id: string;
      displayName: string;
    };
  };
  attachments?: MSGraphAttachment[];
  mentions?: MSGraphMention[];
}

export interface MSGraphAttachment {
  id: string;
  contentType: string;
  contentUrl?: string;
  name: string;
  thumbnailUrl?: string;
}

export interface MSGraphMention {
  id: number;
  mentionText: string;
  mentioned: {
    user?: {
      id: string;
      displayName: string;
    };
  };
}

export interface MSGraphPresence {
  id: string;
  availability: 'Available' | 'Busy' | 'DoNotDisturb' | 'BeRightBack' | 'Away' | 'Offline';
  activity: string;
}

export interface MSGraphOnlineMeeting {
  id: string;
  subject: string;
  startDateTime: string;
  endDateTime: string;
  joinWebUrl: string;
  videoTeleconferenceId?: string;
  participants?: {
    organizer?: {
      identity?: {
        user?: {
          id: string;
          displayName: string;
        };
      };
    };
    attendees?: Array<{
      identity?: {
        user?: {
          id: string;
          displayName: string;
        };
      };
    }>;
  };
}

/**
 * Generate OAuth2 authorization URL for MS Graph
 */
export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: MS_GRAPH_CONFIG.clientId,
    response_type: 'code',
    redirect_uri: MS_GRAPH_CONFIG.redirectUri,
    response_mode: 'query',
    scope: MS_GRAPH_CONFIG.scopes.join(' '),
    state,
  });

  return `https://login.microsoftonline.com/${MS_GRAPH_CONFIG.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
}> {
  const params = new URLSearchParams({
    client_id: MS_GRAPH_CONFIG.clientId,
    client_secret: MS_GRAPH_CONFIG.clientSecret,
    code,
    redirect_uri: MS_GRAPH_CONFIG.redirectUri,
    grant_type: 'authorization_code',
    scope: MS_GRAPH_CONFIG.scopes.join(' '),
  });

  const response = await fetch(
    `https://login.microsoftonline.com/${MS_GRAPH_CONFIG.tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    scope: data.scope,
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const params = new URLSearchParams({
    client_id: MS_GRAPH_CONFIG.clientId,
    client_secret: MS_GRAPH_CONFIG.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    scope: MS_GRAPH_CONFIG.scopes.join(' '),
  });

  const response = await fetch(
    `https://login.microsoftonline.com/${MS_GRAPH_CONFIG.tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: data.expires_in,
  };
}

/**
 * Create MS Graph client with access token
 */
export function createGraphClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
}

/**
 * MS Graph API wrapper class for Teams functionality
 */
export class MSGraphTeamsClient {
  private client: Client;

  constructor(accessToken: string) {
    this.client = createGraphClient(accessToken);
  }

  // ============ USER ============

  /**
   * Get current user's profile
   */
  async getMe(): Promise<MSGraphUser> {
    return await this.client.api('/me').get();
  }

  /**
   * Search for users
   */
  async searchUsers(query: string): Promise<MSGraphUser[]> {
    const response = await this.client
      .api('/users')
      .filter(`startswith(displayName,'${query}') or startswith(mail,'${query}')`)
      .top(10)
      .get();
    return response.value;
  }

  // ============ PRESENCE ============

  /**
   * Get current user's presence
   */
  async getMyPresence(): Promise<MSGraphPresence> {
    return await this.client.api('/me/presence').get();
  }

  /**
   * Get presence for multiple users
   */
  async getPresenceForUsers(userIds: string[]): Promise<MSGraphPresence[]> {
    const response = await this.client
      .api('/communications/getPresencesByUserId')
      .post({ ids: userIds });
    return response.value;
  }

  /**
   * Set user presence
   */
  async setPresence(
    availability: MSGraphPresence['availability'],
    activity: string,
    expirationDuration?: string
  ): Promise<void> {
    await this.client.api('/me/presence/setPresence').post({
      sessionId: process.env.MS_GRAPH_CLIENT_ID,
      availability,
      activity,
      expirationDuration: expirationDuration || 'PT1H',
    });
  }

  // ============ TEAMS ============

  /**
   * Get all teams the user is a member of
   */
  async getMyTeams(): Promise<MSGraphTeam[]> {
    const response = await this.client.api('/me/joinedTeams').get();
    return response.value;
  }

  /**
   * Get channels for a team
   */
  async getTeamChannels(teamId: string): Promise<MSGraphChannel[]> {
    const response = await this.client.api(`/teams/${teamId}/channels`).get();
    return response.value;
  }

  /**
   * Get messages from a channel
   */
  async getChannelMessages(
    teamId: string,
    channelId: string,
    top: number = 50
  ): Promise<MSGraphMessage[]> {
    const response = await this.client
      .api(`/teams/${teamId}/channels/${channelId}/messages`)
      .top(top)
      .get();
    return response.value;
  }

  /**
   * Send a message to a channel
   */
  async sendChannelMessage(
    teamId: string,
    channelId: string,
    content: string,
    contentType: 'text' | 'html' = 'text'
  ): Promise<MSGraphMessage> {
    return await this.client
      .api(`/teams/${teamId}/channels/${channelId}/messages`)
      .post({
        body: {
          contentType,
          content,
        },
      });
  }

  /**
   * Reply to a channel message
   */
  async replyToChannelMessage(
    teamId: string,
    channelId: string,
    messageId: string,
    content: string,
    contentType: 'text' | 'html' = 'text'
  ): Promise<MSGraphMessage> {
    return await this.client
      .api(`/teams/${teamId}/channels/${channelId}/messages/${messageId}/replies`)
      .post({
        body: {
          contentType,
          content,
        },
      });
  }

  // ============ CHATS ============

  /**
   * Get all chats for the user
   */
  async getMyChats(): Promise<MSGraphChat[]> {
    const response = await this.client
      .api('/me/chats')
      .expand('members')
      .top(50)
      .get();
    return response.value;
  }

  /**
   * Get messages from a chat
   */
  async getChatMessages(chatId: string, top: number = 50): Promise<MSGraphMessage[]> {
    const response = await this.client
      .api(`/me/chats/${chatId}/messages`)
      .top(top)
      .get();
    return response.value;
  }

  /**
   * Send a message to a chat
   */
  async sendChatMessage(
    chatId: string,
    content: string,
    contentType: 'text' | 'html' = 'text'
  ): Promise<MSGraphMessage> {
    return await this.client.api(`/me/chats/${chatId}/messages`).post({
      body: {
        contentType,
        content,
      },
    });
  }

  /**
   * Create a new 1:1 chat
   */
  async createOneOnOneChat(userId: string): Promise<MSGraphChat> {
    const me = await this.getMe();
    return await this.client.api('/chats').post({
      chatType: 'oneOnOne',
      members: [
        {
          '@odata.type': '#microsoft.graph.aadUserConversationMember',
          roles: ['owner'],
          'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${me.id}')`,
        },
        {
          '@odata.type': '#microsoft.graph.aadUserConversationMember',
          roles: ['owner'],
          'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${userId}')`,
        },
      ],
    });
  }

  /**
   * Create a new group chat
   */
  async createGroupChat(userIds: string[], topic?: string): Promise<MSGraphChat> {
    const me = await this.getMe();
    const members = [
      {
        '@odata.type': '#microsoft.graph.aadUserConversationMember',
        roles: ['owner'],
        'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${me.id}')`,
      },
      ...userIds.map((userId) => ({
        '@odata.type': '#microsoft.graph.aadUserConversationMember',
        roles: ['owner'],
        'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${userId}')`,
      })),
    ];

    return await this.client.api('/chats').post({
      chatType: 'group',
      topic,
      members,
    });
  }

  // ============ MEETINGS ============

  /**
   * Create an online meeting
   */
  async createOnlineMeeting(params: {
    subject: string;
    startDateTime: string;
    endDateTime: string;
    participants?: string[];
  }): Promise<MSGraphOnlineMeeting> {
    const meetingData: any = {
      subject: params.subject,
      startDateTime: params.startDateTime,
      endDateTime: params.endDateTime,
    };

    if (params.participants && params.participants.length > 0) {
      meetingData.participants = {
        attendees: params.participants.map((email) => ({
          identity: {
            user: {
              id: email,
            },
          },
          upn: email,
        })),
      };
    }

    return await this.client.api('/me/onlineMeetings').post(meetingData);
  }

  /**
   * Get user's upcoming meetings
   */
  async getUpcomingMeetings(): Promise<MSGraphOnlineMeeting[]> {
    const response = await this.client
      .api('/me/onlineMeetings')
      .filter(`startDateTime ge ${new Date().toISOString()}`)
      .top(20)
      .get();
    return response.value;
  }

  /**
   * Join a meeting by URL (get meeting details)
   */
  async getMeetingByJoinUrl(joinUrl: string): Promise<MSGraphOnlineMeeting | null> {
    try {
      const response = await this.client
        .api('/me/onlineMeetings')
        .filter(`joinWebUrl eq '${joinUrl}'`)
        .get();
      return response.value[0] || null;
    } catch {
      return null;
    }
  }

  // ============ CALENDAR EVENTS (Teams Meetings) ============

  /**
   * Get calendar events with Teams meetings
   */
  async getCalendarEventsWithTeamsMeetings(
    startDateTime: string,
    endDateTime: string
  ): Promise<any[]> {
    const response = await this.client
      .api('/me/calendarView')
      .query({
        startDateTime,
        endDateTime,
      })
      .filter("isOnlineMeeting eq true")
      .top(50)
      .get();
    return response.value;
  }

  /**
   * Create a calendar event with Teams meeting
   */
  async createCalendarEventWithTeamsMeeting(params: {
    subject: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    attendees?: Array<{ emailAddress: { address: string; name?: string } }>;
    body?: { contentType: 'text' | 'html'; content: string };
  }): Promise<any> {
    return await this.client.api('/me/events').post({
      ...params,
      isOnlineMeeting: true,
      onlineMeetingProvider: 'teamsForBusiness',
    });
  }
}

// Export config for use in other files
export { MS_GRAPH_CONFIG };
