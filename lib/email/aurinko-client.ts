import axios from 'axios';

const aurinkoApi = axios.create({
  baseURL: process.env.AURINKO_API_URL || 'https://api.aurinko.io',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Initialize OAuth
export async function initAurinkoAuth(userId: string, serviceType: string) {
  const authUrl = `${process.env.AURINKO_API_URL}/v1/auth/authorize?` +
    `clientId=${process.env.AURINKO_CLIENT_ID}` +
    `&serviceType=${serviceType}` + // 'Google', 'Office365', 'EWS'
    `&scopes=Mail.Read Mail.Send Mail.ReadWrite Contacts.Read` +
    `&responseType=code` +
    `&returnUrl=${process.env.NEXT_PUBLIC_APP_URL}/api/auth/aurinko/callback` +
    `&state=${userId}`;

  return authUrl;
}

// Exchange code for token
export async function exchangeAurinkoCode(code: string) {
  const response = await aurinkoApi.post('/v1/auth/token', {
    clientId: process.env.AURINKO_CLIENT_ID,
    clientSecret: process.env.AURINKO_CLIENT_SECRET,
    code,
    grantType: 'authorization_code',
  });

  return response.data;
}

// Get messages
export async function getAurinkoMessages(
  accountId: string,
  accessToken: string,
  params?: {
    limit?: number;
    offset?: number;
    folder?: string;
    unread?: boolean;
  }
) {
  const response = await aurinkoApi.get(`/v1/accounts/${accountId}/email/messages`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    params: {
      limit: params?.limit || 50,
      offset: params?.offset || 0,
      folder: params?.folder,
      unread: params?.unread,
    },
  });

  return response.data;
}

// Send email
export async function sendAurinkoEmail(
  accountId: string,
  accessToken: string,
  emailData: {
    to: Array<{ email: string; name?: string }>;
    subject: string;
    body: string;
    cc?: Array<{ email: string; name?: string }>;
    bcc?: Array<{ email: string; name?: string }>;
    attachments?: Array<{ filename: string; content: string; contentType: string }>;
  }
) {
  const response = await aurinkoApi.post(
    `/v1/accounts/${accountId}/email/messages`,
    emailData,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return response.data;
}

// Create webhook
export async function createAurinkoWebhook(accountId: string, accessToken: string) {
  const response = await aurinkoApi.post(
    `/v1/accounts/${accountId}/webhooks`,
    {
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/aurinko`,
      events: ['email.received', 'email.sent', 'email.deleted'],
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return response.data;
}

// Get contacts
export async function getAurinkoContacts(
  accountId: string,
  accessToken: string,
  params?: {
    limit?: number;
    offset?: number;
  }
) {
  const response = await aurinkoApi.get(`/v1/accounts/${accountId}/contacts`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    params: {
      limit: params?.limit || 100,
      offset: params?.offset || 0,
    },
  });

  return response.data;
}


