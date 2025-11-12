/**
 * Aurinko Draft Service
 * Fallback draft creation service when Nylas fails with "bare newlines" error
 */

import { aurinkoConfig, getAurinkoHeaders } from './config';

export interface AurinkoDraftRequest {
  subject: string;
  body: string;
  to: Array<{ email: string; name?: string }>;
  cc?: Array<{ email: string; name?: string }>;
  bcc?: Array<{ email: string; name?: string }>;
  replyToMessageId?: string;
}

export interface AurinkoDraftResponse {
  id: string;
  accountId: string;
  subject: string;
  body: string;
  to: Array<{ email: string; name?: string }>;
  cc?: Array<{ email: string; name?: string }>;
  bcc?: Array<{ email: string; name?: string }>;
  created: string;
}

/**
 * Create draft via Aurinko API
 * Uses unified email API that works across Gmail, Outlook, Exchange, etc.
 */
export async function createAurinkoDraft(
  accountId: string,
  draft: AurinkoDraftRequest
): Promise<{ success: boolean; draftId?: string; error?: string }> {
  const startTime = Date.now();

  try {
    console.log('[Aurinko] Creating draft via Aurinko API...');
    console.log('[Aurinko] Account ID:', accountId);
    console.log('[Aurinko] Subject:', draft.subject);
    console.log('[Aurinko] To recipients:', draft.to.length);

    const url = `${aurinkoConfig.apiUri}/email/drafts`;

    const response = await fetch(url, {
      method: 'POST',
      headers: getAurinkoHeaders(accountId),
      body: JSON.stringify({
        subject: draft.subject,
        body: draft.body,
        to: draft.to,
        cc: draft.cc,
        bcc: draft.bcc,
        // Aurinko may use different field name for reply-to
        ...(draft.replyToMessageId && { inReplyTo: draft.replyToMessageId }),
      }),
    });

    const elapsed = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: any = {};

      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      console.error(`[Aurinko] ❌ Failed after ${elapsed}ms:`, errorData);

      return {
        success: false,
        error: errorData.message || errorData.error || `HTTP ${response.status}`,
      };
    }

    const result: AurinkoDraftResponse = await response.json();

    console.log(`[Aurinko] ✅ Draft created successfully in ${elapsed}ms`);
    console.log(`[Aurinko] Draft ID:`, result.id);

    return {
      success: true,
      draftId: result.id,
    };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[Aurinko] ❌ Exception after ${elapsed}ms:`, error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if error is the "bare newlines" issue that Aurinko should handle
 */
export function isBareNewlinesError(error: any): boolean {
  // Check various error message locations
  const errorMessage = (
    error?.message ||
    error?.error ||
    error?.providerError?.error?.message ||
    error?.providerError?.message ||
    ''
  ).toLowerCase();

  return (
    errorMessage.includes('bare newlines') ||
    errorMessage.includes('bare lf') ||
    errorMessage.includes('message contains bare')
  );
}
