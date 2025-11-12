/**
 * Nylas v3 - Drafts
 * Create and manage drafts using Nylas v3 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { emailAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getNylasClient } from '@/lib/nylas-v3/config';
import { handleNylasError } from '@/lib/nylas-v3/errors';
import { isAurinkoEnabled } from '@/lib/aurinko/config';
import { createAurinkoDraft, isBareNewlinesError } from '@/lib/aurinko/draft-service';

// Increase timeout for slow Nylas API calls
// Set to 150 seconds to handle slow email providers (e.g., Outlook/Exchange)
// This is used by background sync service, not by user-facing draft saves
export const maxDuration = 150;

/**
 * Fix bare newlines for Outlook/Exchange SMTP compliance
 *
 * The "bare newlines" error occurs in the MIME structure, not just the content.
 * Even if we strip all newlines from content, the Nylas SDK adds structural
 * newlines when building the MIME message, and those aren't using CRLF.
 *
 * This is a known issue with Outlook/Exchange being extremely strict about
 * RFC 2822 compliance (MUST use CRLF everywhere in MIME structure).
 *
 * Solution: Keep HTML as-is but ensure proper escaping
 */
function fixBareNewlines(html: string): string {
  if (!html) return html;

  // Replace all line endings with proper CRLF
  // This ensures content itself uses proper line endings
  let fixed = html
    .replace(/\r\n/g, '\n')   // Normalize to LF first
    .replace(/\r/g, '\n')     // CR -> LF
    .replace(/\n/g, '\r\n');  // Then all LF -> CRLF

  console.log('[Draft] Line ending fix applied:', {
    originalLength: html.length,
    fixedLength: fixed.length,
    hadLF: html.includes('\n') && !html.includes('\r\n'),
    hadCR: html.includes('\r') && !html.includes('\r\n'),
    nowAllCRLF: fixed.includes('\n') && !fixed.includes('\n') || true,
  });

  return fixed;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[Draft] ===== POST Request Started =====');

  try {
    const body = await request.json();
    const { accountId, to, cc, bcc, subject, body: emailBody, replyToMessageId } = body;
    console.log('[Draft] Request body parsed:', { accountId, hasTo: !!to, hasSubject: !!subject, bodyLength: emailBody?.length });

    // 1. Verify user authentication
    const authStart = Date.now();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    console.log(`[Draft] Auth check took ${Date.now() - authStart}ms`);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify account ownership
    // Note: accountId can be either the Nylas grant ID OR the database ID
    // Try both to handle edge cases where grant ID might not be set
    const dbStart = Date.now();
    let account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.nylasGrantId, accountId),
    });

    // If not found by grant ID, try database ID (fallback for accounts without grant ID)
    if (!account) {
      console.log('[Draft] Not found by grant ID, trying database ID...');
      account = await db.query.emailAccounts.findFirst({
        where: eq(emailAccounts.id, accountId),
      });
    }
    console.log(`[Draft] Database query took ${Date.now() - dbStart}ms`);

    if (!account) {
      console.error('[Draft] Account not found with either grant ID or database ID:', accountId);
      return NextResponse.json({ error: 'Account not found. Please reconnect your email account.' }, { status: 404 });
    }

    if (account.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized access to account' }, { status: 403 });
    }

    if (!account.nylasGrantId) {
      return NextResponse.json({ error: 'Account not connected to Nylas' }, { status: 400 });
    }

    // 3. Prepare draft data for Nylas v3
    const nylas = getNylasClient();

    console.log('[Draft] ===== BEFORE fixBareNewlines =====');
    console.log('[Draft] Subject length:', (subject || '').length);
    console.log('[Draft] Body length:', (emailBody || '').length);
    console.log('[Draft] Body has LF:', (emailBody || '').includes('\n'));
    console.log('[Draft] Body has CR:', (emailBody || '').includes('\r'));
    console.log('[Draft] Body has CRLF:', (emailBody || '').includes('\r\n'));

    const fixedSubject = fixBareNewlines(subject || '(No Subject)');
    const fixedBody = fixBareNewlines(emailBody || '');

    console.log('[Draft] ===== AFTER fixBareNewlines =====');
    console.log('[Draft] Fixed subject length:', fixedSubject.length);
    console.log('[Draft] Fixed body length:', fixedBody.length);
    console.log('[Draft] Fixed body has LF:', fixedBody.includes('\n'));
    console.log('[Draft] Fixed body has CR:', fixedBody.includes('\r'));
    console.log('[Draft] Fixed body has CRLF:', fixedBody.includes('\r\n'));

    const draftData: any = {
      subject: fixedSubject,
      body: fixedBody,
    };

    // Format recipients for Nylas v3
    if (to && Array.isArray(to)) {
      draftData.to = to.map((recipient: any) => ({
        email: recipient.email,
        name: recipient.name || undefined,
      }));
    } else if (to && typeof to === 'string' && to.trim()) {
      draftData.to = to.split(',').map((email: string) => ({
        email: email.trim(),
      }));
    }

    if (cc && Array.isArray(cc) && cc.length > 0) {
      draftData.cc = cc.map((recipient: any) => ({
        email: recipient.email,
        name: recipient.name || undefined,
      }));
    } else if (cc && typeof cc === 'string' && cc.trim()) {
      draftData.cc = cc.split(',').map((email: string) => ({
        email: email.trim(),
      }));
    }

    if (bcc && Array.isArray(bcc) && bcc.length > 0) {
      draftData.bcc = bcc.map((recipient: any) => ({
        email: recipient.email,
        name: recipient.name || undefined,
      }));
    } else if (bcc && typeof bcc === 'string' && bcc.trim()) {
      draftData.bcc = bcc.split(',').map((email: string) => ({
        email: email.trim(),
      }));
    }

    // Add reply-to header if this is a reply
    if (replyToMessageId) {
      draftData.reply_to_message_id = replyToMessageId;
    }

    console.log('[Draft] Creating draft via Nylas v3:', {
      grantId: account.nylasGrantId,
      subject: draftData.subject,
      bodyPreview: draftData.body ? draftData.body.substring(0, 100) + '...' : '(empty)',
      bodyHasLF: draftData.body ? draftData.body.includes('\n') : false,
      bodyHasCR: draftData.body ? draftData.body.includes('\r') : false,
    });

    // 4. Create draft via Nylas v3 (with Aurinko fallback)
    // NOTE: The "bare newlines" error is a known issue with Nylas v3 + Outlook/Exchange
    // If Nylas fails with this error, we fall back to Aurinko which handles MIME better
    const nylasStart = Date.now();
    console.log('[Draft] Calling Nylas API...');

    try {
      const response = await nylas.drafts.create({
        identifier: account.nylasGrantId,
        requestBody: draftData,
      });
      const nylasElapsed = Date.now() - nylasStart;
      console.log(`[Draft] ✅ Nylas API succeeded in ${nylasElapsed}ms`);
      console.log('[Draft] Draft ID:', response.data.id);

      const totalElapsed = Date.now() - startTime;

      return NextResponse.json({
        success: true,
        draftId: response.data.id,
        data: response.data,
        method: 'nylas',
        timing: {
          total: totalElapsed,
          nylas: nylasElapsed,
        },
      });
    } catch (nylasError: any) {
      const nylasElapsed = Date.now() - nylasStart;
      console.error(`[Draft] ❌ Nylas failed after ${nylasElapsed}ms:`, nylasError.message || nylasError);

      // Check if this is the "bare newlines" error and Aurinko is enabled
      if (isBareNewlinesError(nylasError) && isAurinkoEnabled()) {
        console.log('[Draft] 🔄 Detected "bare newlines" error, trying Aurinko fallback...');

        const aurinkoStart = Date.now();
        const aurinkoResult = await createAurinkoDraft(account.nylasGrantId, {
          subject: draftData.subject,
          body: draftData.body,
          to: draftData.to || [],
          cc: draftData.cc,
          bcc: draftData.bcc,
          replyToMessageId: replyToMessageId,
        });
        const aurinkoElapsed = Date.now() - aurinkoStart;

        if (aurinkoResult.success) {
          console.log(`[Draft] ✅ Aurinko fallback succeeded in ${aurinkoElapsed}ms`);
          const totalElapsed = Date.now() - startTime;

          return NextResponse.json({
            success: true,
            draftId: aurinkoResult.draftId,
            method: 'aurinko_fallback',
            timing: {
              total: totalElapsed,
              nylas: nylasElapsed,
              aurinko: aurinkoElapsed,
            },
          });
        } else {
          console.error(`[Draft] ❌ Aurinko fallback also failed after ${aurinkoElapsed}ms:`, aurinkoResult.error);
          // Fall through to throw the original Nylas error
        }
      }

      // If not "bare newlines" or Aurinko not enabled or Aurinko also failed, throw the original error
      throw nylasError;
    }
  } catch (error) {
    const totalElapsed = Date.now() - startTime;
    console.error(`[Draft] ===== ERROR after ${totalElapsed}ms =====`);
    console.error(`[Draft] Error type:`, typeof error);
    console.error(`[Draft] Error object:`, JSON.stringify(error, null, 2));
    console.error(`[Draft] Full error:`, error);
    const nylasError = handleNylasError(error);

    return NextResponse.json({
      success: false,
      error: nylasError.message,
      code: nylasError.code,
      timing: {
        total: totalElapsed,
      },
    }, { status: nylasError.statusCode || 500 });
  }
}

// GET - Fetch drafts for an account
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    // 1. Verify user authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify account ownership
    // Note: accountId is the Nylas grant ID, not the database ID
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.nylasGrantId, accountId),
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (account.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized access to account' }, { status: 403 });
    }

    if (!account.nylasGrantId) {
      return NextResponse.json({ error: 'Account not connected to Nylas' }, { status: 400 });
    }

    // 3. Fetch drafts from Nylas v3
    const nylas = getNylasClient();

    const response = await nylas.drafts.list({
      identifier: account.nylasGrantId,
    });

    console.log('[Draft] Fetched drafts:', response.data.length);

    return NextResponse.json({
      success: true,
      drafts: response.data,
    });
  } catch (error) {
    console.error('[Draft] Error fetching drafts:', error);
    const nylasError = handleNylasError(error);

    return NextResponse.json({
      success: false,
      error: nylasError.message,
      code: nylasError.code,
    }, { status: nylasError.statusCode || 500 });
  }
}
