/**
 * Nylas v3 - Drafts
 * OPTIMIZED FOR IMAP (FastMail, etc.)
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

// INCREASED: IMAP operations can take 30-60 seconds
// Especially FastMail, Zoho, and other IMAP providers
export const maxDuration = 60;

/**
 * Fix bare newlines for SMTP compliance
 */
function fixBareNewlines(html: string): string {
  if (!html) return html;
  return html
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n/g, '\r\n');
}

/**
 * Create timeout promise
 */
function createTimeoutError(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms);
  });
}

/**
 * Detect if account is IMAP-based
 */
function isIMAPAccount(account: any): boolean {
  return account.provider === 'imap' ||
         account.email?.includes('@fastmail.') ||
         account.email?.includes('@migadu.') ||
         account.email?.includes('@zoho.') ||
         !account.provider; // Fallback for legacy accounts
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

    // 1. Verify user authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify account ownership
    account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.nylasGrantId, accountId),
    });

    if (!account) {
      account = await db.query.emailAccounts.findFirst({
        where: eq(emailAccounts.id, accountId),
      });
    }

    if (!account) {
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

    // 4. Determine timeout based on account type
    const isIMAP = isIMAPAccount(account);
    const NYLAS_TIMEOUT_MS = isIMAP ? 50000 : 25000; // 50s for IMAP, 25s for API-based
    
    console.log('[Draft] Creating draft via Nylas v3:', {
      grantId: account.nylasGrantId,
      provider: account.provider,
      isIMAP,
      timeout: NYLAS_TIMEOUT_MS,
      subject: draftData.subject?.substring(0, 50),
    });

    const nylasStart = Date.now();

    try {
      const nylasPromise = nylas.drafts.create({
        identifier: account.nylasGrantId,
        requestBody: draftData,
      });

      const response = await Promise.race([
        nylasPromise,
        createTimeoutError(NYLAS_TIMEOUT_MS)
      ]) as any;

      const nylasElapsed = Date.now() - nylasStart;
      console.log(`[Draft] ✅ Nylas API succeeded in ${nylasElapsed}ms (IMAP: ${isIMAP})`);
      console.log('[Draft] Draft ID:', response.data.id);

      return NextResponse.json({
        success: true,
        draftId: response.data.id,
        data: response.data,
        method: 'nylas',
        isIMAP,
        timing: {
          total: Date.now() - startTime,
          nylas: nylasElapsed,
        },
      });
      
    } catch (nylasError: any) {
      const nylasElapsed = Date.now() - nylasStart;
      console.error(`[Draft] ❌ Nylas failed after ${nylasElapsed}ms:`, nylasError.message);

      // Check if timeout
      if (nylasError.message?.includes('timeout')) {
        console.error('[Draft] ⏱️ Request timed out - returning 408');
        
        const errorMessage = isIMAP
          ? 'IMAP draft save is slow - your draft is saved locally and will retry automatically'
          : 'Request timeout - please try again';
        
        return NextResponse.json({
          success: false,
          error: errorMessage,
          code: 'TIMEOUT',
          isIMAP,
          timing: {
            total: Date.now() - startTime,
            nylas: nylasElapsed,
          },
        }, { status: 408 });
      }

      // Check for bare newlines and try Aurinko
      const isBareNewlines = isBareNewlinesError(nylasError);
      const aurinkoEnabled = isAurinkoEnabled();

      if (isBareNewlines && aurinkoEnabled) {
        console.error('[Draft] 🔄 Bare newlines error, trying Aurinko...');

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
            createTimeoutError(NYLAS_TIMEOUT_MS)
          ]);

          if (aurinkoResult.success) {
            console.error(`[Draft] ✅ Aurinko fallback succeeded`);
            return NextResponse.json({
              success: true,
              draftId: aurinkoResult.draftId,
              method: 'aurinko_fallback',
            });
          }
        } catch (aurinkoError) {
          console.error(`[Draft] ❌ Aurinko also failed:`, aurinkoError);
        }
      }

      throw nylasError;
    }
    
  } catch (error) {
    const totalElapsed = Date.now() - startTime;
    console.error(`[Draft] ===== ERROR after ${totalElapsed}ms =====`);

    // Check if timeout
    if ((error as any)?.message?.includes('timeout')) {
      const isIMAP = account ? isIMAPAccount(account) : false;
      const errorMessage = isIMAP
        ? 'IMAP draft save is slow - your draft is saved locally and will retry automatically'
        : 'Request timeout - please try again';
        
      return NextResponse.json({
        success: false,
        error: errorMessage,
        code: 'TIMEOUT',
        isIMAP,
      }, { status: 408 });
    }

    // Try Aurinko fallback
    const isBareNewlines = isBareNewlinesError(error);
    const aurinkoEnabled = isAurinkoEnabled();
    console.error(`[Draft] 🔍 OUTER CATCH - isBareNewlines: ${isBareNewlines}, aurinkoEnabled: ${aurinkoEnabled}`);

    if (isBareNewlines && aurinkoEnabled && account && draftData) {
      console.error('[Draft] 🔄 OUTER CATCH - Trying Aurinko...');

      try {
        const isIMAP = isIMAPAccount(account);
        const timeout = isIMAP ? 50000 : 25000;
        
        const aurinkoResult = await Promise.race([
          createAurinkoDraft(account.nylasGrantId, {
            subject: draftData.subject,
            body: draftData.body,
            to: draftData.to || [],
            cc: draftData.cc,
            bcc: draftData.bcc,
            replyToMessageId: replyToMessageId,
          }),
          createTimeoutError(timeout)
        ]);

        if (aurinkoResult.success) {
          console.error(`[Draft] ✅ OUTER CATCH - Aurinko succeeded`);
          return NextResponse.json({
            success: true,
            draftId: aurinkoResult.draftId,
            method: 'aurinko_fallback',
          });
        }
      } catch (aurinkoError) {
        console.error('[Draft] ❌ OUTER CATCH - Aurinko failed:', aurinkoError);
      }
    }

    const nylasError = handleNylasError(error);

    return NextResponse.json({
      success: false,
      error: nylasError.message,
      code: nylasError.code,
    }, { status: nylasError.statusCode || 500 });
  }
}

// GET - Fetch drafts
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!account.nylasGrantId) {
      return NextResponse.json({ error: 'Account not connected to Nylas' }, { status: 400 });
    }

    const nylas = getNylasClient();

    // Use longer timeout for IMAP
    const isIMAP = isIMAPAccount(account);
    const timeout = isIMAP ? 50000 : 25000;

    const response = await Promise.race([
      nylas.drafts.list({ identifier: account.nylasGrantId }),
      createTimeoutError(timeout)
    ]) as any;

    return NextResponse.json({
      success: true,
      drafts: response.data,
    });
    
  } catch (error) {
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