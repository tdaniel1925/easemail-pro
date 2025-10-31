/**
 * Attachments API Client
 * Frontend client for interacting with attachments API
 */

import type {
  Attachment,
  GetAttachmentsParams,
  GetAttachmentsResponse,
  AttachmentStats,
  SmartFilter,
} from './types';

const API_BASE = '/api/attachments';

class AttachmentsAPI {
  /**
   * List attachments with filters
   */
  async list(params?: GetAttachmentsParams): Promise<GetAttachmentsResponse> {
    const searchParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            searchParams.append(key, value.join(','));
          } else {
            searchParams.append(key, String(value));
          }
        }
      });
    }
    
    const url = `${API_BASE}?${searchParams.toString()}`;
    const res = await fetch(url);
    
    if (!res.ok) {
      throw new Error(`Failed to fetch attachments: ${res.statusText}`);
    }
    
    return res.json();
  }

  /**
   * Get single attachment by ID
   */
  async get(id: string): Promise<Attachment> {
    const res = await fetch(`${API_BASE}/${id}`);
    
    if (!res.ok) {
      throw new Error(`Failed to fetch attachment: ${res.statusText}`);
    }
    
    const data = await res.json();
    return data.attachment;
  }

  /**
   * Get attachment preview URL
   */
  async getPreviewUrl(id: string): Promise<string> {
    const res = await fetch(`${API_BASE}/${id}/preview`);
    
    if (!res.ok) {
      throw new Error(`Failed to get preview URL: ${res.statusText}`);
    }
    
    const data = await res.json();
    return data.url;
  }

  /**
   * Get attachment download URL
   */
  async getDownloadUrl(id: string): Promise<{
    url: string;
    filename: string;
  }> {
    const res = await fetch(`${API_BASE}/${id}/download`);
    
    if (!res.ok) {
      throw new Error(`Failed to get download URL: ${res.statusText}`);
    }
    
    const data = await res.json();
    return {
      url: data.url,
      filename: data.filename,
    };
  }

  /**
   * Download attachment
   */
  async download(id: string): Promise<void> {
    const { url, filename } = await this.getDownloadUrl(id);
    
    // Trigger browser download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<AttachmentStats> {
    const res = await fetch(`${API_BASE}/stats`);
    
    if (!res.ok) {
      throw new Error(`Failed to fetch stats: ${res.statusText}`);
    }
    
    const data = await res.json();
    return data.stats;
  }

  /**
   * Get smart filters with counts
   */
  async getSmartFilters(): Promise<SmartFilter[]> {
    const res = await fetch(`${API_BASE}/smart-filters`);
    
    if (!res.ok) {
      throw new Error(`Failed to fetch smart filters: ${res.statusText}`);
    }
    
    const data = await res.json();
    return data.filters;
  }

  /**
   * Trigger AI reprocessing
   */
  async reprocess(id: string, priority: number = 8): Promise<void> {
    const res = await fetch(`${API_BASE}/${id}/reprocess`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ priority }),
    });
    
    if (!res.ok) {
      throw new Error(`Failed to reprocess attachment: ${res.statusText}`);
    }
  }

  /**
   * Search attachments (convenience method)
   */
  async search(query: string, filters?: Partial<GetAttachmentsParams>): Promise<GetAttachmentsResponse> {
    return this.list({
      search: query,
      ...filters,
    });
  }
}

export const attachmentsApi = new AttachmentsAPI();

