/**
 * JMAP (JSON Meta Application Protocol) Client
 * Modern email protocol - much faster and more reliable than IMAP
 * https://jmap.io/
 */

export interface JMAPSession {
  apiUrl: string;
  accountId: string;
  username: string;
  capabilities: {
    'urn:ietf:params:jmap:core': any;
    'urn:ietf:params:jmap:mail': any;
  };
}

export interface JMAPMailbox {
  id: string;
  name: string;
  role?: 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam' | 'archive';
  totalEmails: number;
  unreadEmails: number;
  parentId?: string;
}

export interface JMAPEmail {
  id: string;
  mailboxIds: Record<string, boolean>;
  threadId: string;
  subject?: string;
  from?: Array<{ email: string; name?: string }>;
  to?: Array<{ email: string; name?: string }>;
  cc?: Array<{ email: string; name?: string }>;
  bcc?: Array<{ email: string; name?: string }>;
  receivedAt: string;
  size: number;
  preview?: string;
  hasAttachment: boolean;
  keywords: Record<string, boolean>; // $seen, $flagged, etc.
  bodyValues?: Record<string, { value: string; isEncodingProblem: boolean }>;
}

export class JMAPClient {
  private sessionUrl: string;
  private username: string;
  private password: string;
  private session: JMAPSession | null = null;

  constructor(config: {
    sessionUrl: string;
    username: string;
    password: string;
  }) {
    this.sessionUrl = config.sessionUrl;
    this.username = config.username;
    this.password = config.password;
  }

  /**
   * Authenticate and get JMAP session
   */
  async connect(): Promise<JMAPSession> {
    try {
      const response = await fetch(this.sessionUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.username}:${this.password}`).toString('base64')}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`JMAP authentication failed: ${response.status}`);
      }

      const session = await response.json();

      this.session = {
        apiUrl: session.apiUrl,
        accountId: session.primaryAccounts['urn:ietf:params:jmap:mail'],
        username: session.username,
        capabilities: session.capabilities,
      };

      console.log('✅ JMAP session established:', {
        apiUrl: this.session.apiUrl,
        accountId: this.session.accountId,
        username: this.session.username,
      });

      return this.session;
    } catch (error) {
      console.error('❌ JMAP connection failed:', error);
      throw error;
    }
  }

  /**
   * Make a JMAP API request
   */
  private async request(methodCalls: any[]): Promise<any> {
    if (!this.session) {
      throw new Error('Not connected. Call connect() first.');
    }

    const response = await fetch(this.session.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${this.username}:${this.password}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        using: [
          'urn:ietf:params:jmap:core',
          'urn:ietf:params:jmap:mail',
        ],
        methodCalls,
      }),
    });

    if (!response.ok) {
      throw new Error(`JMAP request failed: ${response.status}`);
    }

    const result = await response.json();
    return result.methodResponses;
  }

  /**
   * Get all mailboxes (folders)
   */
  async getMailboxes(): Promise<JMAPMailbox[]> {
    const responses = await this.request([
      [
        'Mailbox/get',
        {
          accountId: this.session!.accountId,
        },
        'mailboxes',
      ],
    ]);

    const mailboxResponse = responses[0];
    if (mailboxResponse[0] !== 'Mailbox/get') {
      throw new Error('Unexpected response type');
    }

    return mailboxResponse[1].list;
  }

  /**
   * Get emails from a mailbox
   */
  async getEmails(options: {
    mailboxId?: string;
    limit?: number;
    position?: number;
  }): Promise<{ emails: JMAPEmail[]; total: number }> {
    const { mailboxId, limit = 50, position = 0 } = options;

    // Build filter
    const filter: any = {};
    if (mailboxId) {
      filter.inMailbox = mailboxId;
    }

    const responses = await this.request([
      // 1. Query for email IDs
      [
        'Email/query',
        {
          accountId: this.session!.accountId,
          filter,
          sort: [{ property: 'receivedAt', isAscending: false }],
          position,
          limit,
        },
        'query',
      ],
      // 2. Get email details
      [
        'Email/get',
        {
          accountId: this.session!.accountId,
          '#ids': {
            resultOf: 'query',
            name: 'Email/query',
            path: '/ids',
          },
          properties: [
            'id',
            'mailboxIds',
            'threadId',
            'subject',
            'from',
            'to',
            'cc',
            'bcc',
            'receivedAt',
            'size',
            'preview',
            'hasAttachment',
            'keywords',
          ],
        },
        'emails',
      ],
    ]);

    const queryResponse = responses[0];
    const getResponse = responses[1];

    if (queryResponse[0] !== 'Email/query' || getResponse[0] !== 'Email/get') {
      throw new Error('Unexpected response type');
    }

    return {
      emails: getResponse[1].list,
      total: queryResponse[1].total,
    };
  }

  /**
   * Get full email with body
   */
  async getEmailBody(emailId: string): Promise<JMAPEmail> {
    const responses = await this.request([
      [
        'Email/get',
        {
          accountId: this.session!.accountId,
          ids: [emailId],
          properties: [
            'id',
            'mailboxIds',
            'threadId',
            'subject',
            'from',
            'to',
            'cc',
            'bcc',
            'receivedAt',
            'size',
            'preview',
            'hasAttachment',
            'keywords',
            'bodyValues',
            'textBody',
            'htmlBody',
          ],
          bodyProperties: ['partId', 'blobId', 'size', 'type', 'charset'],
          fetchAllBodyValues: true,
        },
        'email',
      ],
    ]);

    const getResponse = responses[0];
    if (getResponse[0] !== 'Email/get') {
      throw new Error('Unexpected response type');
    }

    return getResponse[1].list[0];
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.connect();
      await this.getMailboxes();
      return true;
    } catch (error) {
      console.error('JMAP connection test failed:', error);
      return false;
    }
  }
}

/**
 * Create a JMAP client for Fastmail
 */
export function createFastmailJMAPClient(username: string, password: string): JMAPClient {
  return new JMAPClient({
    sessionUrl: 'https://api.fastmail.com/jmap/session',
    username,
    password,
  });
}
