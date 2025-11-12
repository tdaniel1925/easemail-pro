/**
 * Nylas v3 - Drafts
 * Create and manage drafts using Nylas v3 API
 * 
 * FIXED: Proper timeout handling to prevent 504 errors
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

// REDUCED: Set to 30 seconds max (was 150)
// This ensures function fails fast before Vercel's 30-60s timeout
export const maxDuration = 30;

/**
 * Fix bare newlines for Outlook/Exchange SMTP compliance
 */
function fixBareNewlines(html: string): string {
  if (!html) return html;

  let fixed = html
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n/g, '\r\n');

  console.log('[Draft] Line ending fix applied:', {
    originalLength: html.length,
    fixedLength: fixed.length,
  });

  return fixed;
}

/**
 * Create a timeout that actually works
 */
function createTimeoutError(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Request timeout after ${ms}ms`));
    }, ms);
  });
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[Draft] ===== POST Request Started =====');

  let account: any = null;
  let draftData: any = null;
  let replyToMessageId: string | undefined;

  try {
    const body = await request.json();
    const { accountId, to, cc, bcc, subject, body: emailBody, replyToMessageId: replyToMsg } = body;
    replyToMessageId = replyToMsg;
    console.log('[Draft] Request body parsed:', { 
      accountId, 
      hasTo: !!to, 
      hasSubject: !!subject, 
      bodyLength: emailBody?.length 
    });

    // 1. Verify user authentication
    const authStart = Date.now();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    console.log(`[Draft] Auth check took ${Date.now() - authStart}ms`);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify account ownership
    const dbStart = Date.now();
    account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.nylasGrantId, accountId),
    });

    if (!account) {
      console.log('[Draft] Not found by grant ID, trying database ID...');
      account = await db.query.emailAccounts.findFirst({
        where: eq(emailAccounts.id, accountId),
      });
    }
    console.log(`[Draft] Database query took ${Date.now() - dbStart}ms`);

    if (!account) {
      console.error('[Draft] Account not found:', accountId);
      return NextResponse.json({ 
        error: 'Account not found. Please reconnect your email account.' 
      }, { status: 404 });
    }

    if (account.userId !== user.id) {
      return NextResponse.json({ 
        error: 'Unauthorized access to account' 
      }, { status: 403 });
    }

    if (!account.nylasGrantId) {
      return NextResponse.json({ 
        error: 'Account not connected to Nylas' 
      }, { status: 400 });
    }

    // 3. Prepare draft data
    const nylas = getNylasClient();

    console.log('[Draft] Applying line ending fixes...');
    const fixedSubject = fixBareNewlines(subject || '(No Subject)');
    const fixedBody = fixBareNewlines(emailBody || '');

    draftData = {
      subject: fixedSubject,
      body: fixedBody,
    };

    // Format recipients
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

    if (replyToMessageId) {
      draftData.reply_to_message_id = replyToMessageId;
    }

    console.log('[Draft] Creating draft via Nylas v3:', {
      grantId: account.nylasGrantId,
      subject: draftData.subject,
      bodyPreview: draftData.body ? draftData.body.substring(0, 100) + '...' : '(empty)',
    });

    // 4. Create draft with PROPER timeout protection
    // CRITICAL FIX: Use 25 seconds to fail before Vercel's 30s timeout
    const NYLAS_TIMEOUT_MS = 25000;
    const nylasStart = Date.now();
    console.log(`[Draft] Calling Nylas API with ${NYLAS_TIMEOUT_MS}ms timeout...`);

    try {
      // Create the Nylas API call
      const nylasPromise = nylas.drafts.create({
        identifier: account.nylasGrantId,
        requestBody: draftData,
      });

      // Race against timeout
      const response = await Promise.race([
        nylasPromise,
        createTimeoutError(NYLAS_TIMEOUT_MS)
      ]) as any;

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

      // Check if this is a timeout
      if (nylasError.message?.includes('timeout')) {
        console.error('[Draft] ⏱️ Request timed out - returning 408 for client retry');
        return NextResponse.json({
          success: false,
          error: 'Request timeout - please try again',
          code: 'TIMEOUT',
          timing: {
            total: Date.now() - startTime,
            nylas: nylasElapsed,
          },
        }, { status: 408 }); // 408 Request Timeout - client should retry
      }

      // Check for bare newlines error and try Aurinko fallback
      const isBareNewlines = isBareNewlinesError(nylasError);
      const aurinkoEnabled = isAurinkoEnabled();
      console.error(`[Draft] 🔍 Debug - isBareNewlines: ${isBareNewlines}, aurinkoEnabled: ${aurinkoEnabled}`);

      if (isBareNewlines && aurinkoEnabled) {
        console.error('[Draft] 🔄 Detected "bare newlines" error, trying Aurinko fallback...');

        const aurinkoStart = Date.now();
        try {
          const aurinkoResult = await Promise.race([
            createAurinkoDraft(account.nylasGrantId, {
              subject: draftData.subject,
              body: draftData.body,
              to: draftData.to || [],
              cc: draftData.cc,
              bcc: draftData.bcc,
              replyToMessageId: replyToMessageId,
            }),
            createTimeoutError(NYLAS_TIMEOUT_MS) // Same timeout for Aurinko
          ]);
          
          const aurinkoElapsed = Date.now() - aurinkoStart;

          if (aurinkoResult.success) {
            console.error(`[Draft] ✅ Aurinko fallback succeeded in ${aurinkoElapsed}ms`);
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
          }
        } catch (aurinkoError) {
          console.error(`[Draft] ❌ Aurinko fallback also failed:`, aurinkoError);
        }
      }

      // If not bare newlines or Aurinko failed, throw the original error
      throw nylasError;
    }
    
  } catch (error) {
    const totalElapsed = Date.now() - startTime;
    console.error(`[Draft] ===== ERROR after ${totalElapsed}ms =====`);
    console.error(`[Draft] Error:`, error);

    // Check if timeout error
    if ((error as any)?.message?.includes('timeout')) {
      console.error('[Draft] ⏱️ Top-level timeout - returning 408');
      return NextResponse.json({
        success: false,
        error: 'Request timeout - please try again',
        code: 'TIMEOUT',
        timing: { total: totalElapsed },
      }, { status: 408 });
    }

    // FALLBACK: Try Aurinko if this looks like bare newlines
    const isBareNewlines = isBareNewlinesError(error);
    const aurinkoEnabled = isAurinkoEnabled();
    console.error(`[Draft] 🔍 OUTER CATCH - isBareNewlines: ${isBareNewlines}, aurinkoEnabled: ${aurinkoEnabled}`);

    if (isBareNewlines && aurinkoEnabled && account && draftData) {
      console.error('[Draft] 🔄 OUTER CATCH - Trying Aurinko fallback...');

      try {
        const aurinkoResult = await Promise.race([
          createAurinkoDraft(account.nylasGrantId, {
            subject: draftData.subject,
            body: draftData.body,
            to: draftData.to || [],
            cc: draftData.cc,
            bcc: draftData.bcc,
            replyToMessageId: replyToMessageId,
          }),
          createTimeoutError(25000)
        ]);

        if (aurinkoResult.success) {
          console.error(`[Draft] ✅ OUTER CATCH - Aurinko fallback succeeded!`);
          return NextResponse.json({
            success: true,
            draftId: aurinkoResult.draftId,
            method: 'aurinko_fallback',
            timing: { total: Date.now() - startTime },
          });
        }
      } catch (aurinkoError) {
        console.error('[Draft] ❌ OUTER CATCH - Aurinko also failed:', aurinkoError);
      }
    }

    const nylasError = handleNylasError(error);

    return NextResponse.json({
      success: false,
      error: nylasError.message,
      code: nylasError.code,
      timing: { total: totalElapsed },
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

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const nylas = getNylasClient();

    // Add timeout protection
    const response = await Promise.race([
      nylas.drafts.list({
        identifier: account.nylasGrantId,
      }),
      createTimeoutError(25000)
    ]) as any;

    console.log('[Draft] Fetched drafts:', response.data.length);

    return NextResponse.json({
      success: true,
      drafts: response.data,
    });
    
  } catch (error) {
    console.error('[Draft] Error fetching drafts:', error);
    
    // Check for timeout
    if ((error as any)?.message?.includes('timeout')) {
      return NextResponse.json({
        success: false,
        error: 'Request timeout',
        code: 'TIMEOUT',
      }, { status: 408 });
    }
    
    const nylasError = handleNylasError(error);

    return NextResponse.json({
      success: false,
      error: nylasError.message,
      code: nylasError.code,
    }, { status: nylasError.statusCode || 500 });
  }
}