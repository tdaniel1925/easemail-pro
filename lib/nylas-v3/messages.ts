/**
 * Nylas v3 Messages API
 * On-demand message fetching with cursor-based pagination
 */

import { getNylasClient } from './config';
import { retryWithBackoff, handleNylasError } from './errors';
import { PAGINATION } from './config';

export interface FetchMessagesParams {
  grantId: string;
  folderId?: string;
  limit?: number;
  pageToken?: string;
  unread?: boolean;
}

export interface FetchMessagesResponse {
  messages: any[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Fetch messages with cursor-based pagination
 * This is the v3 way - on-demand fetching, not background sync
 */
export async function fetchMessages({
  grantId,
  folderId,
  limit = PAGINATION.DEFAULT_PAGE_SIZE,
  pageToken,
  unread,
}: FetchMessagesParams): Promise<FetchMessagesResponse> {
  const nylas = getNylasClient();

  // Validate limit
  if (limit > PAGINATION.MAX_PAGE_SIZE) {
    limit = PAGINATION.MAX_PAGE_SIZE;
  }
  if (limit < PAGINATION.MIN_PAGE_SIZE) {
    limit = PAGINATION.MIN_PAGE_SIZE;
  }

  try {
    const queryParams: any = {
      limit,
    };

    // Add cursor for pagination
    if (pageToken) {
      queryParams.page_token = pageToken;
    }

    // Filter by folder if specified
    if (folderId) {
      queryParams.in = [folderId];
    }

    // Filter by unread status if specified
    if (unread !== undefined) {
      queryParams.unread = unread;
    }

    console.log('📧 Fetching messages from Nylas v3:', {
      grantId: grantId.substring(0, 8) + '...',
      folderId,
      limit,
      hasPageToken: !!pageToken,
      unread,
    });

    const response = await retryWithBackoff(
      async () =>
        await nylas.messages.list({
          identifier: grantId,
          queryParams,
        }),
      {
        maxRetries: 3,
        onRetry: (attempt, error) => {
          console.log(`⏳ Retry ${attempt}/3 for message fetch: ${error.message}`);
        },
      }
    );

    console.log(`✅ Fetched ${response.data.length} messages, hasMore: ${!!response.nextCursor}`);

    return {
      messages: response.data,
      nextCursor: response.nextCursor || null,
      hasMore: !!response.nextCursor,
    };
  } catch (error) {
    console.error('❌ Message fetch error:', error);
    throw handleNylasError(error);
  }
}

/**
 * Fetch a single message by ID
 */
export async function fetchMessage(grantId: string, messageId: string) {
  const nylas = getNylasClient();

  try {
    const message = await retryWithBackoff(
      async () =>
        await nylas.messages.find({
          identifier: grantId,
          messageId,
        }),
      {
        maxRetries: 2,
      }
    );

    return message.data;
  } catch (error) {
    console.error('❌ Single message fetch error:', error);
    throw handleNylasError(error);
  }
}

/**
 * Update message metadata (read/unread, starred, etc.)
 */
export async function updateMessage(
  grantId: string,
  messageId: string,
  updates: {
    unread?: boolean;
    starred?: boolean;
    folders?: string[];
  }
) {
  const nylas = getNylasClient();

  try {
    const updatedMessage = await nylas.messages.update({
      identifier: grantId,
      messageId,
      requestBody: updates,
    });

    console.log(`✅ Updated message ${messageId}`);
    return updatedMessage.data;
  } catch (error) {
    console.error('❌ Message update error:', error);
    throw handleNylasError(error);
  }
}

/**
 * Delete a message
 */
export async function deleteMessage(grantId: string, messageId: string) {
  const nylas = getNylasClient();

  try {
    await nylas.messages.destroy({
      identifier: grantId,
      messageId,
    });

    console.log(`✅ Deleted message ${messageId}`);
  } catch (error) {
    console.error('❌ Message delete error:', error);
    throw handleNylasError(error);
  }
}

/**
 * Send a message
 */
export async function sendMessage(
  grantId: string,
  message: {
    to: Array<{ email: string; name?: string }>;
    subject: string;
    body: string;
    cc?: Array<{ email: string; name?: string }>;
    bcc?: Array<{ email: string; name?: string }>;
    replyToMessageId?: string;
  }
) {
  const nylas = getNylasClient();

  try {
    const sentMessage = await nylas.messages.send({
      identifier: grantId,
      requestBody: message,
    });

    console.log(`✅ Sent message: ${message.subject}`);
    return sentMessage.data;
  } catch (error) {
    console.error('❌ Message send error:', error);
    throw handleNylasError(error);
  }
}
