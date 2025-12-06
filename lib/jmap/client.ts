/**
 * JMAP (JSON Meta Application Protocol) Client
 * Modern email protocol - much faster and more reliable than IMAP
 * https://jmap.io/
 */

export interface JMAPSession {
  apiUrl: string;
  uploadUrl: string;
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

export interface JMAPAttachment {
  partId?: string;
  blobId: string;
  size: number;
  name?: string;
  type: string;
  charset?: string;
  disposition?: 'attachment' | 'inline';
  cid?: string; // Content-ID for inline images (cid:xxx references)
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
  attachments?: JMAPAttachment[]; // Attachments with cid for inline images
}

export class JMAPClient {
  private sessionUrl: string;
  private authHeader: string;
  private session: JMAPSession | null = null;

  constructor(config: {
    sessionUrl: string;
    apiToken?: string;
    username?: string;
    password?: string;
  }) {
    this.sessionUrl = config.sessionUrl;

    // Support both API token (Bearer) and Basic auth
    if (config.apiToken) {
      // Fastmail JMAP requires Bearer token authentication
      this.authHeader = `Bearer ${config.apiToken}`;
    } else if (config.username && config.password) {
      // Fallback to Basic auth (legacy, may not work for JMAP)
      this.authHeader = `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`;
    } else {
      throw new Error('Either apiToken or username+password must be provided');
    }
  }

  /**
   * Authenticate and get JMAP session
   */
  async connect(): Promise<JMAPSession> {
    try {
      console.log('🔐 Connecting to JMAP session URL:', this.sessionUrl);

      const response = await fetch(this.sessionUrl, {
        method: 'GET',
        headers: {
          'Authorization': this.authHeader,
          'Accept': 'application/json',
        },
      });

      console.log('📡 JMAP session response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ JMAP authentication failed:', response.status, errorText);
        throw new Error(`JMAP authentication failed: ${response.status} - ${errorText}`);
      }

      const session = await response.json();
      console.log('📦 JMAP session response:', JSON.stringify(session, null, 2));

      if (!session.apiUrl || !session.primaryAccounts) {
        throw new Error('Invalid JMAP session response: missing required fields');
      }

      this.session = {
        apiUrl: session.apiUrl,
        uploadUrl: session.uploadUrl,
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
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
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
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        using: [
          'urn:ietf:params:jmap:core',
          'urn:ietf:params:jmap:mail',
          'urn:ietf:params:jmap:submission',
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
      // 2. Get email details (including attachments for inline images)
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
            'attachments', // Include attachments for inline image cid resolution
          ],
          // Specify which attachment properties we need (including cid for inline images)
          bodyProperties: ['partId', 'blobId', 'size', 'type', 'name', 'disposition', 'cid'],
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
   * Get full email with body and attachments
   */
  async getEmailBody(emailId: string): Promise<JMAPEmail & { attachments?: any[] }> {
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
            'attachments',
          ],
          // Include cid for inline image resolution (cid:xxx references in HTML)
          bodyProperties: ['partId', 'blobId', 'size', 'type', 'charset', 'name', 'disposition', 'cid'],
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
   * Get download URL for an attachment blob
   */
  getDownloadUrl(blobId: string, name: string, type: string): string {
    if (!this.session) {
      throw new Error('Not connected. Call connect() first.');
    }

    // JMAP download URL format: {downloadUrl}?blobId={blobId}&name={name}&type={type}
    // For Fastmail, it's: https://api.fastmail.com/jmap/download/{accountId}/{blobId}/{name}?accept={type}
    const baseUrl = this.session.apiUrl.replace('/jmap/api', '/jmap/download');
    return `${baseUrl}/${this.session.accountId}/${blobId}/${encodeURIComponent(name)}?accept=${encodeURIComponent(type)}`;
  }

  /**
   * Download an attachment blob
   */
  async downloadAttachment(blobId: string, name: string, type: string): Promise<ArrayBuffer> {
    const url = this.getDownloadUrl(blobId, name, type);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': this.authHeader,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download attachment: ${response.status}`);
    }

    return response.arrayBuffer();
  }

  /**
   * Get the primary identity for sending emails
   */
  async getPrimaryIdentity(): Promise<string> {
    if (!this.session) {
      throw new Error('Not connected. Call connect() first.');
    }

    const responses = await this.request([
      [
        'Identity/get',
        {
          accountId: this.session.accountId,
        },
        'identities',
      ],
    ]);

    const identityResponse = responses[0];
    if (identityResponse[0] !== 'Identity/get') {
      throw new Error('Unexpected response type for Identity/get');
    }

    const identities = identityResponse[1].list;
    if (!identities || identities.length === 0) {
      throw new Error('No identities found for this account');
    }

    // Return the first identity (usually the primary one)
    return identities[0].id;
  }

  /**
   * Send an email via JMAP EmailSubmission
   */
  async sendEmail(options: {
    from: { email: string; name?: string };
    to: Array<{ email: string; name?: string }>;
    cc?: Array<{ email: string; name?: string }>;
    bcc?: Array<{ email: string; name?: string }>;
    subject: string;
    body: string;
    bodyType?: 'text' | 'html';
    inReplyTo?: string;
    references?: string;
    attachments?: Array<{ filename: string; content: string; contentType: string }>;
  }): Promise<{ emailId: string; submissionId: string }> {
    if (!this.session) {
      throw new Error('Not connected. Call connect() first.');
    }

    const { from, to, cc, bcc, subject, body, bodyType = 'html', inReplyTo, references, attachments } = options;

    // Get mailboxes to find Drafts folder
    const mailboxes = await this.getMailboxes();
    const draftsMailbox = mailboxes.find(m => m.role === 'drafts');

    if (!draftsMailbox) {
      throw new Error('Could not find Drafts mailbox');
    }

    // Get the identity ID for sending
    const identityId = await this.getPrimaryIdentity();
    console.log('[JMAP] Using identity:', identityId);

    // Generate unique IDs for the email and submission
    const emailCreateId = `email-${Date.now()}`;
    const submissionCreateId = `submission-${Date.now()}`;

    // Build email addresses in JMAP format
    const formatAddresses = (addrs?: Array<{ email: string; name?: string }>) => {
      if (!addrs || addrs.length === 0) return null;
      return addrs.map(a => ({ email: a.email, name: a.name || null }));
    };

    // Build the email object according to JMAP spec
    // The body part must specify the content type and charset
    const emailObject: any = {
      mailboxIds: { [draftsMailbox.id]: true }, // Put in drafts first
      from: [{ email: from.email, name: from.name || null }],
      to: formatAddresses(to),
      subject: subject || '(No Subject)',
      bodyValues: {
        'body': {
          value: body,
          isEncodingProblem: false,
          isTruncated: false,
        },
      },
      keywords: { '$draft': true }, // Mark as draft initially
    };

    // Add CC if present
    if (cc && cc.length > 0) {
      emailObject.cc = formatAddresses(cc);
    }

    // Add BCC if present
    if (bcc && bcc.length > 0) {
      emailObject.bcc = formatAddresses(bcc);
    }

    // Set body type - JMAP requires textBody OR htmlBody, not both
    if (bodyType === 'html') {
      emailObject.htmlBody = [{ partId: 'body', type: 'text/html' }];
    } else {
      emailObject.textBody = [{ partId: 'body', type: 'text/plain' }];
    }

    // Add reply headers if present
    if (inReplyTo) {
      emailObject.inReplyTo = [inReplyTo];
    }
    if (references) {
      emailObject.references = references.split(' ').filter(Boolean);
    }

    // Handle attachments - upload blobs first, then add to email
    if (attachments && attachments.length > 0) {
      console.log(`[JMAP] Processing ${attachments.length} attachment(s)...`);

      const uploadedAttachments: Array<{ blobId: string; type: string; name: string; size: number }> = [];

      for (const attachment of attachments) {
        try {
          // Decode base64 content to binary
          const binaryData = Buffer.from(attachment.content, 'base64');

          // Upload blob to JMAP server
          const uploadUrl = this.session.uploadUrl.replace('{accountId}', this.session.accountId);

          console.log(`[JMAP] Uploading attachment: ${attachment.filename} (${binaryData.length} bytes)`);

          const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
              'Authorization': this.authHeader,
              'Content-Type': attachment.contentType,
            },
            body: binaryData,
          });

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
          }

          const uploadResult = await uploadResponse.json();
          console.log(`[JMAP] Uploaded attachment:`, uploadResult);

          uploadedAttachments.push({
            blobId: uploadResult.blobId,
            type: attachment.contentType,
            name: attachment.filename,
            size: uploadResult.size || binaryData.length,
          });
        } catch (error) {
          console.error(`[JMAP] Failed to upload attachment: ${attachment.filename}`, error);
          throw error;
        }
      }

      // Add attachments to email object
      if (uploadedAttachments.length > 0) {
        emailObject.attachments = uploadedAttachments.map(att => ({
          blobId: att.blobId,
          type: att.type,
          name: att.name,
          size: att.size,
          disposition: 'attachment',
        }));

        console.log(`[JMAP] Added ${uploadedAttachments.length} attachment(s) to email`);
      }
    }

    console.log('[JMAP] Creating email with object:', JSON.stringify(emailObject, null, 2));

    // Create the email and submit it in one request
    const responses = await this.request([
      // First, create the email
      [
        'Email/set',
        {
          accountId: this.session.accountId,
          create: {
            [emailCreateId]: emailObject,
          },
        },
        'createEmail',
      ],
      // Then, submit the email for sending
      [
        'EmailSubmission/set',
        {
          accountId: this.session.accountId,
          create: {
            [submissionCreateId]: {
              emailId: `#${emailCreateId}`,
              identityId: identityId,
            },
          },
          onSuccessUpdateEmail: {
            [`#${submissionCreateId}`]: {
              // Remove draft flag and move out of drafts on success
              'keywords/$draft': null,
              [`mailboxIds/${draftsMailbox.id}`]: null,
            },
          },
        },
        'submitEmail',
      ],
    ]);

    console.log('[JMAP] Send email response:', JSON.stringify(responses, null, 2));

    // Check for errors
    const emailResponse = responses[0];
    const submissionResponse = responses[1];

    if (emailResponse[0] === 'Email/set') {
      const emailResult = emailResponse[1];
      if (emailResult.notCreated && emailResult.notCreated[emailCreateId]) {
        const error = emailResult.notCreated[emailCreateId];
        console.error('[JMAP] Email creation error:', JSON.stringify(error, null, 2));
        throw new Error(`Failed to create email: ${error.type} - ${error.description || JSON.stringify(error.properties) || 'Unknown error'}`);
      }
    }

    if (submissionResponse[0] === 'EmailSubmission/set') {
      const submissionResult = submissionResponse[1];
      if (submissionResult.notCreated && submissionResult.notCreated[submissionCreateId]) {
        const error = submissionResult.notCreated[submissionCreateId];
        console.error('[JMAP] Submission error:', JSON.stringify(error, null, 2));
        throw new Error(`Failed to send email: ${error.type} - ${error.description || 'Unknown error'}`);
      }
    }

    // Extract the created email ID and submission ID
    const createdEmailId = emailResponse[1]?.created?.[emailCreateId]?.id;
    const createdSubmissionId = submissionResponse[1]?.created?.[submissionCreateId]?.id;

    if (!createdEmailId) {
      throw new Error('Email was not created - no ID returned');
    }

    console.log('[JMAP] ✅ Email sent successfully:', {
      emailId: createdEmailId,
      submissionId: createdSubmissionId,
    });

    return {
      emailId: createdEmailId,
      submissionId: createdSubmissionId || 'submitted',
    };
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
 * Create a JMAP client for Fastmail using API token (recommended)
 * API tokens can be generated at: Settings → Privacy & Security → Integrations
 */
export function createFastmailJMAPClient(apiToken: string): JMAPClient {
  return new JMAPClient({
    sessionUrl: 'https://api.fastmail.com/jmap/session',
    apiToken,
  });
}

/**
 * Create a JMAP client for Fastmail using username/password (legacy)
 * Note: Basic auth may not work for JMAP - use API tokens instead
 * @deprecated Use createFastmailJMAPClient with API token instead
 */
export function createFastmailJMAPClientWithPassword(username: string, password: string): JMAPClient {
  return new JMAPClient({
    sessionUrl: 'https://api.fastmail.com/jmap/session',
    username,
    password,
  });
}
