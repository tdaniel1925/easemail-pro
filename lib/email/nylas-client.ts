import Nylas, { WebhookTriggers } from 'nylas';

const nylasConfig = {
  apiKey: process.env.NYLAS_API_KEY!,
  apiUri: process.env.NYLAS_API_URI || 'https://api.us.nylas.com',
};

export const nylas = new Nylas(nylasConfig);

// Initialize OAuth flow
export async function initNylasAuth(userId: string, provider: string) {
  const config = {
    clientId: process.env.NYLAS_CLIENT_ID!,
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/nylas/callback`,
  };

  const authUrl = nylas.auth.urlForOAuth2({
    ...config,
    provider: provider as any, // 'google', 'microsoft', 'imap'
    scope: ['email.read_only', 'email.send', 'email.modify', 'contacts.read_only'],
    state: userId,
  });

  return authUrl;
}

// Exchange code for grant
export async function exchangeNylasCode(code: string) {
  const response = await nylas.auth.exchangeCodeForToken({
    clientId: process.env.NYLAS_CLIENT_ID!,
    clientSecret: process.env.NYLAS_CLIENT_SECRET!,
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/nylas/callback`,
    code,
  });

  return {
    grantId: response.grantId,
    email: response.email,
    provider: response.provider,
  };
}

// Get messages
export async function getNylasMessages(grantId: string, params?: {
  limit?: number;
  pageToken?: string;
  folder?: string;
  unread?: boolean;
}) {
  const messages = await nylas.messages.list({
    identifier: grantId,
    queryParams: {
      limit: params?.limit || 50,
      pageToken: params?.pageToken,
      in: params?.folder ? [params.folder] : undefined,
      unread: params?.unread,
    },
  });

  return messages;
}

// Send email
export async function sendNylasEmail(grantId: string, emailData: {
  to: Array<{ email: string; name?: string }>;
  subject: string;
  body: string;
  cc?: Array<{ email: string; name?: string }>;
  bcc?: Array<{ email: string; name?: string }>;
  replyTo?: Array<{ email: string; name?: string }>;
  attachments?: Array<{ filename: string; content: string; contentType: string }>;
}) {
  const message = await nylas.messages.send({
    identifier: grantId,
    requestBody: {
      to: emailData.to,
      subject: emailData.subject,
      body: emailData.body,
      cc: emailData.cc,
      bcc: emailData.bcc,
      replyTo: emailData.replyTo,
      attachments: emailData.attachments,
    },
  });

  return message;
}

// Create webhook
export async function createNylasWebhook(accountId: string) {
  const webhook = await nylas.webhooks.create({
    requestBody: {
      triggerTypes: [
        WebhookTriggers.MessageCreated,
        WebhookTriggers.MessageUpdated,
        WebhookTriggers.MessageDeleted,
        WebhookTriggers.ThreadCreated,
        WebhookTriggers.ThreadUpdated,
      ],
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/nylas`,
      description: `Webhook for account ${accountId}`,
    },
  });

  return webhook;
}

// Get contacts
export async function getNylasContacts(grantId: string, params?: {
  limit?: number;
  pageToken?: string;
}) {
  const contacts = await nylas.contacts.list({
    identifier: grantId,
    queryParams: {
      limit: params?.limit || 100,
      pageToken: params?.pageToken,
    },
  });

  return contacts;
}


