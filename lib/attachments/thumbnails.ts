/**
 * Thumbnail Generation Service
 * Creates thumbnails for images and PDFs
 */

import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const THUMBNAIL_CONFIG = {
  WIDTH: 400,
  HEIGHT: 300,
  QUALITY: 80,
  FORMAT: 'webp' as const,
};

/**
 * Generate a thumbnail for an image file
 */
export async function generateThumbnail(
  userId: string,
  fileBuffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string | null> {
  try {
    // Only generate thumbnails for images
    if (!mimeType.startsWith('image/')) {
      return null;
    }

    const thumbnailBuffer = await sharp(fileBuffer)
      .resize(THUMBNAIL_CONFIG.WIDTH, THUMBNAIL_CONFIG.HEIGHT, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: THUMBNAIL_CONFIG.QUALITY })
      .toBuffer();

    const thumbFilename = createThumbnailFilename(filename);
    const thumbPath = `${userId}/thumbnails/${Date.now()}_${thumbFilename}`;

    const { error } = await supabase.storage
      .from('email-attachments')
      .upload(thumbPath, thumbnailBuffer, {
        contentType: 'image/webp',
        upsert: false,
      });

    if (error) {
      console.error('Thumbnail upload failed:', error);
      return null;
    }

    return thumbPath;
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    return null;
  }
}

/**
 * Generate thumbnail for PDF (first page)
 */
export async function generatePdfThumbnail(
  userId: string,
  fileBuffer: Buffer,
  filename: string
): Promise<string | null> {
  try {
    // For V1, we'll skip PDF thumbnail generation
    // In production, you'd use pdf-lib or pdf-to-image
    // For now, return null and use a PDF icon instead
    return null;
  } catch (error) {
    console.error('PDF thumbnail generation failed:', error);
    return null;
  }
}

/**
 * Create thumbnail filename from original filename
 */
function createThumbnailFilename(filename: string): string {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  const sanitized = nameWithoutExt.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${sanitized}_thumb.webp`;
}

/**
 * Check if file type can have a thumbnail
 */
export function canGenerateThumbnail(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Batch generate thumbnails for multiple files
 */
export async function batchGenerateThumbnails(
  userId: string,
  files: Array<{
    buffer: Buffer;
    filename: string;
    mimeType: string;
  }>
): Promise<Array<string | null>> {
  return Promise.all(
    files.map((file) =>
      generateThumbnail(userId, file.buffer, file.filename, file.mimeType)
    )
  );
}

