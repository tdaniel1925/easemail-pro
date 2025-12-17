// Microsoft Teams Integration Types

// OAuth Types
export interface TeamsTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface TeamsUserProfile {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
  jobTitle?: string;
  officeLocation?: string;
}

// Chat Types
export interface TeamsChat {
  id: string;
  topic?: string;
  createdDateTime: string;
  lastUpdatedDateTime?: string;
  chatType: 'oneOnOne' | 'group' | 'meeting';
  webUrl?: string;
  tenantId?: string;
  onlineMeetingInfo?: {
    calendarEventId?: string;
    joinWebUrl?: string;
    organizer?: {
      id: string;
      displayName: string;
    };
  };
  members?: TeamsChatMember[];
}

export interface TeamsChatMember {
  id: string;
  displayName: string;
  userId?: string;
  email?: string;
  tenantId?: string;
  roles?: string[];
}

// Message Types
export interface TeamsMessage {
  id: string;
  replyToId?: string;
  etag?: string;
  messageType: 'message' | 'systemEventMessage' | 'chatEvent';
  createdDateTime: string;
  lastModifiedDateTime?: string;
  lastEditedDateTime?: string;
  deletedDateTime?: string;
  subject?: string;
  summary?: string;
  chatId?: string;
  importance: 'normal' | 'high' | 'urgent';
  locale?: string;
  webUrl?: string;
  from?: {
    user?: {
      id: string;
      displayName: string;
      userIdentityType?: string;
    };
    application?: {
      id: string;
      displayName: string;
    };
  };
  body: {
    contentType: 'text' | 'html';
    content: string;
  };
  attachments?: TeamsAttachment[];
  mentions?: TeamsMention[];
  reactions?: TeamsReaction[];
}

export interface TeamsAttachment {
  id: string;
  contentType: string;
  contentUrl?: string;
  content?: string;
  name?: string;
  thumbnailUrl?: string;
  teamsAppId?: string;
}

export interface TeamsMention {
  id: number;
  mentionText: string;
  mentioned: {
    user?: {
      id: string;
      displayName: string;
      userIdentityType?: string;
    };
    application?: {
      id: string;
      displayName: string;
    };
  };
}

export interface TeamsReaction {
  reactionType: string;
  createdDateTime: string;
  user: {
    id: string;
    displayName: string;
    userIdentityType?: string;
  };
}

// API Response Types
export interface GraphApiResponse<T> {
  '@odata.context'?: string;
  '@odata.count'?: number;
  '@odata.nextLink'?: string;
  '@odata.deltaLink'?: string;
  value: T[];
}

export interface GraphApiError {
  error: {
    code: string;
    message: string;
    innerError?: {
      'request-id': string;
      date: string;
      'client-request-id'?: string;
    };
  };
}

// Sync Types
export interface TeamsSyncResult {
  success: boolean;
  chatsProcessed: number;
  messagesProcessed: number;
  errors: string[];
  deltaLink?: string;
}

export interface ChatSyncResult {
  chatId: string;
  messagesAdded: number;
  messagesUpdated: number;
  messagesDeleted: number;
  error?: string;
}

// Send Message Types
export interface SendTeamsMessageRequest {
  chatId: string;
  content: string;
  contentType?: 'text' | 'html';
  importance?: 'normal' | 'high' | 'urgent';
  attachments?: TeamsAttachment[];
  mentions?: TeamsMention[];
}

export interface SendTeamsMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Webhook Types
export interface TeamsWebhookNotification {
  value: TeamsChangeNotification[];
  validationTokens?: string[];
}

export interface TeamsChangeNotification {
  subscriptionId: string;
  subscriptionExpirationDateTime: string;
  changeType: 'created' | 'updated' | 'deleted';
  resource: string;
  resourceData?: {
    id: string;
    '@odata.type': string;
    '@odata.id': string;
  };
  clientState?: string;
  tenantId: string;
}

// Subscription Types
export interface TeamsSubscription {
  id: string;
  resource: string;
  applicationId: string;
  changeType: string;
  clientState?: string;
  notificationUrl: string;
  expirationDateTime: string;
  creatorId?: string;
  latestSupportedTlsVersion?: string;
}

export interface CreateSubscriptionRequest {
  changeType: string;
  notificationUrl: string;
  resource: string;
  expirationDateTime: string;
  clientState?: string;
}

// Database record types (matching schema)
export interface TeamsAccountRecord {
  id: string;
  userId: string;
  microsoftUserId: string;
  email: string;
  displayName: string | null;
  tenantId: string | null;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  scopes: string[] | null;
  syncStatus: string;
  lastSyncAt: Date | null;
  lastError: string | null;
  isActive: boolean;
  autoSync: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamsChatRecord {
  id: string;
  teamsAccountId: string;
  userId: string;
  teamsChatId: string;
  chatType: string;
  topic: string | null;
  webUrl: string | null;
  participants: Array<{
    id: string;
    displayName: string;
    email?: string;
    avatarUrl?: string;
  }> | null;
  otherParticipantName: string | null;
  otherParticipantEmail: string | null;
  lastMessageId: string | null;
  lastMessageAt: Date | null;
  lastMessagePreview: string | null;
  lastMessageSenderId: string | null;
  lastMessageSenderName: string | null;
  unreadCount: number;
  lastReadAt: Date | null;
  syncCursor: string | null;
  lastSyncedAt: Date | null;
  isArchived: boolean;
  isPinned: boolean;
  isMuted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamsMessageRecord {
  id: string;
  chatId: string;
  teamsAccountId: string;
  userId: string;
  teamsMessageId: string;
  replyToMessageId: string | null;
  senderId: string;
  senderName: string | null;
  senderEmail: string | null;
  body: string | null;
  bodyType: string;
  subject: string | null;
  summary: string | null;
  messageType: string;
  importance: string;
  hasAttachments: boolean;
  attachments: Array<{
    id: string;
    name: string;
    contentType: string;
    contentUrl?: string;
    size?: number;
  }> | null;
  mentions: Array<{
    id: number;
    mentionText: string;
    mentioned: {
      user?: { id: string; displayName: string };
    };
  }> | null;
  reactions: Array<{
    reactionType: string;
    user: { id: string; displayName: string };
    createdAt: string;
  }> | null;
  isRead: boolean;
  isDeleted: boolean;
  isEdited: boolean;
  deletedAt: Date | null;
  editedAt: Date | null;
  teamsCreatedAt: Date | null;
  teamsModifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
