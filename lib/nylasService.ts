// nylasService.ts - Nylas v3 API Service Implementation

import { Draft } from './localDraftStorage';

interface NylasConfig {
  apiKey: string;
  apiUri?: string;
  grantId: string;
}

interface NylasDraftRequest {
  subject?: string;
  body?: string;
  to?: Array<{ email: string; name?: string }>;
  cc?: Array<{ email: string; name?: string }>;
  bcc?: Array<{ email: string; name?: string }>;
  reply_to?: Array<{ email: string; name?: string }>;
  reply_to_message_id?: string;
  tracking_options?: {
    opens?: boolean;
    links?: boolean;
    thread_replies?: boolean;
    label?: string;
  };
  attachments?: Array<{
    filename: string;
    content_type: string;
    content: string; // Base64 encoded
    size: number;
  }>;
  custom_headers?: Array<{
    name: string;
    value: string;
  }>;
}

interface NylasDraftResponse {
  id: string;
  grant_id: string;
  object: 'draft';
  subject: string;
  body: string;
  to: Array<{ email: string; name?: string }>;
  cc?: Array<{ email: string; name?: string }>;
  bcc?: Array<{ email: string; name?: string }>;
  reply_to?: Array<{ email: string; name?: string }>;
  from?: Array<{ email: string; name?: string }>;
  date?: number;
  unread?: boolean;
  starred?: boolean;
  snippet?: string;
  thread_id?: string;
  folders?: string[];
  attachments?: Array<any>;
  created_at?: number;
}

interface NylasErrorResponse {
  error: {
    type: string;
    message: string;
    provider_error?: any;
  };
  request_id: string;
}

export class NylasService {
  private apiKey: string;
  private apiUri: string;
  private grantId: string;

  constructor(config: NylasConfig) {
    this.apiKey = config.apiKey;
    this.apiUri = config.apiUri || 'https://api.us.nylas.com';
    this.grantId = config.grantId;
  }

  /**
   * Create a new draft in Nylas
   */
  async createDraft(draft: Draft): Promise<NylasDraftResponse> {
    const url = `${this.apiUri}/v3/grants/${this.grantId}/drafts`;

    const requestBody: NylasDraftRequest = {
      subject: draft.subject || '',
      body: draft.body || '',
      to: draft.to || [],
    };

    // Add optional fields
    if (draft.cc && draft.cc.length > 0) {
      requestBody.cc = draft.cc;
    }
    if (draft.bcc && draft.bcc.length > 0) {
      requestBody.bcc = draft.bcc;
    }
    if (draft.replyToMessageId) {
      requestBody.reply_to_message_id = draft.replyToMessageId;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await this.handleError(response);
      throw error;
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Update an existing draft in Nylas
   */
  async updateDraft(draftId: string, draft: Draft): Promise<NylasDraftResponse> {
    const url = `${this.apiUri}/v3/grants/${this.grantId}/drafts/${draftId}`;

    const requestBody: NylasDraftRequest = {
      subject: draft.subject || '',
      body: draft.body || '',
      to: draft.to || [],
    };

    // Add optional fields
    if (draft.cc && draft.cc.length > 0) {
      requestBody.cc = draft.cc;
    }
    if (draft.bcc && draft.bcc.length > 0) {
      requestBody.bcc = draft.bcc;
    }
    if (draft.replyToMessageId) {
      requestBody.reply_to_message_id = draft.replyToMessageId;
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await this.handleError(response);
      throw error;
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Create or update a draft - used by sync service
   */
  async createOrUpdateDraft(draft: Draft): Promise<NylasDraftResponse> {
    // If draft has nylasId, update it; otherwise create new
    if (draft.nylasId) {
      try {
        return await this.updateDraft(draft.nylasId, draft);
      } catch (error) {
        // If update fails (e.g., draft not found), create new
        console.log('[NylasService] Update failed, creating new draft:', error);
        return await this.createDraft(draft);
      }
    } else {
      return await this.createDraft(draft);
    }
  }

  /**
   * Get a draft by ID
   */
  async getDraft(draftId: string): Promise<NylasDraftResponse> {
    const url = `${this.apiUri}/v3/grants/${this.grantId}/drafts/${draftId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await this.handleError(response);
      throw error;
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Delete a draft
   */
  async deleteDraft(draftId: string): Promise<void> {
    const url = `${this.apiUri}/v3/grants/${this.grantId}/drafts/${draftId}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await this.handleError(response);
      throw error;
    }
  }

  /**
   * Send a draft
   */
  async sendDraft(draftId: string): Promise<{ id: string; grant_id: string }> {
    const url = `${this.apiUri}/v3/grants/${this.grantId}/drafts/${draftId}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await this.handleError(response);
      throw error;
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Send a message directly without creating a draft
   */
  async sendMessage(draft: Draft): Promise<{ id: string; grant_id: string }> {
    const url = `${this.apiUri}/v3/grants/${this.grantId}/messages/send`;

    const requestBody: NylasDraftRequest = {
      subject: draft.subject || '',
      body: draft.body || '',
      to: draft.to || [],
    };

    if (draft.cc && draft.cc.length > 0) {
      requestBody.cc = draft.cc;
    }
    if (draft.bcc && draft.bcc.length > 0) {
      requestBody.bcc = draft.bcc;
    }
    if (draft.replyToMessageId) {
      requestBody.reply_to_message_id = draft.replyToMessageId;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await this.handleError(response);
      throw error;
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * List all drafts
   */
  async listDrafts(limit: number = 50): Promise<NylasDraftResponse[]> {
    const url = `${this.apiUri}/v3/grants/${this.grantId}/drafts?limit=${limit}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await this.handleError(response);
      throw error;
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Handle API errors and convert to Error objects
   */
  private async handleError(response: Response): Promise<Error> {
    let errorMessage = `Nylas API error: ${response.status}`;

    try {
      const errorData: NylasErrorResponse = await response.json();

      if (errorData.error) {
        errorMessage = errorData.error.message;

        // Include provider error if available
        if (errorData.error.provider_error) {
          errorMessage += ` (Provider: ${JSON.stringify(errorData.error.provider_error)})`;
        }
      }

      // Check for specific error types
      if (response.status === 404) {
        return new Error(`Draft not found: ${errorMessage}`);
      } else if (response.status === 429) {
        return new Error(`Rate limit exceeded: ${errorMessage}`);
      } else if (response.status === 503) {
        return new Error(`Service unavailable: ${errorMessage}`);
      } else if (response.status === 504) {
        return new Error(`Gateway timeout: ${errorMessage}`);
      } else if (response.status >= 500) {
        return new Error(`Server error: ${errorMessage}`);
      } else if (response.status === 401 || response.status === 403) {
        return new Error(`Authentication failed: ${errorMessage}`);
      } else {
        return new Error(errorMessage);
      }
    } catch (parseError) {
      // If we can't parse the error response, return a generic error
      return new Error(`${errorMessage} (Response parsing failed)`);
    }
  }

  /**
   * Test connection to Nylas API
   */
  async testConnection(): Promise<boolean> {
    try {
      const url = `${this.apiUri}/v3/grants/${this.grantId}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('[NylasService] Connection test failed:', error);
      return false;
    }
  }
}

// Example usage and initialization
export function createNylasService(config: NylasConfig): NylasService {
  return new NylasService(config);
}

// Type exports
export type {
  NylasConfig,
  NylasDraftRequest,
  NylasDraftResponse,
  NylasErrorResponse
};
