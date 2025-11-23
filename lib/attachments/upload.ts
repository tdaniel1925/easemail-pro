/**
 * Attachment Upload Service
 * Handles file uploads to Supabase Storage
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface UploadResult {
  storagePath: string;
  publicUrl?: string;
}

/**
 * Upload an attachment file to Supabase Storage
 */
export async function uploadAttachment(
  userId: string,
  file: Buffer,
  filename: string,
  mimeType: string
): Promise<UploadResult> {
  // Sanitize filename
  const sanitizedFilename = sanitizeFilename(filename);
  const timestamp = Date.now();
  const storagePath = `${userId}/attachments/${timestamp}_${sanitizedFilename}`;

  const { data, error } = await supabase.storage
    .from('attachments')
    .upload(storagePath, file, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  return {
    storagePath,
  };
}

/**
 * Get a signed URL for accessing an attachment
 */
export async function getAttachmentUrl(
  storagePath: string,
  expiresIn: number = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from('attachments')
    .createSignedUrl(storagePath, expiresIn);

  if (error || !data) {
    throw new Error(`Failed to generate signed URL: ${error?.message}`);
  }

  return data.signedUrl;
}

/**
 * Delete an attachment from storage
 */
export async function deleteAttachment(storagePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from('attachments')
    .remove([storagePath]);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

/**
 * Get multiple signed URLs in batch
 */
export async function batchGetAttachmentUrls(
  storagePaths: string[],
  expiresIn: number = 3600
): Promise<Record<string, string>> {
  const urls: Record<string, string> = {};

  await Promise.all(
    storagePaths.map(async (path) => {
      try {
        const url = await getAttachmentUrl(path, expiresIn);
        urls[path] = url;
      } catch (error) {
        console.error(`Failed to get URL for ${path}:`, error);
        urls[path] = '';
      }
    })
  );

  return urls;
}

/**
 * Sanitize filename for safe storage
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255); // Max filename length
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string | null {
  const parts = filename.split('.');
  if (parts.length < 2) return null;
  return parts.pop()?.toLowerCase() || null;
}

/**
 * Check if file type is supported
 */
export function isSupportedFileType(mimeType: string): boolean {
  const supported = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
  ];

  return supported.some((type) => mimeType.startsWith(type) || mimeType === type);
}

