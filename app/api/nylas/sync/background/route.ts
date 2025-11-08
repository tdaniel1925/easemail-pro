import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts, emails } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import Nylas from 'nylas';
import { sanitizeText, sanitizeParticipants } from '@/lib/utils/text-sanitizer';
import { assignEmailFolder, validateFolderAssignment } from '@/lib/email/folder-utils';

const nylas = new Nylas({
  apiKey: process.env.NYLAS_API_KEY!,
  apiUri: process.env.NYLAS_API_URI!,
});

// POST: Start or continue background sync
export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    console.log(`🔄 Starting background sync for account ${accountId}`);

    // Get account details
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Check if already syncing
    if (account.syncStatus === 'syncing' || account.syncStatus === 'background_syncing') {
      console.log(`⏭️ Account ${accountId} is already syncing`);
      return NextResponse.json({ 
        success: true, 
        message: 'Sync already in progress',
        progress: account.syncProgress || 0
      });
    }

    // Update status to background_syncing and clear stop flag
    await db.update(emailAccounts)
      .set({
        syncStatus: 'background_syncing',
        lastError: null,
        syncStopped: false, // Clear the stop flag when starting
        retryCount: 0, // Reset retry count on manual start
      })
      .where(eq(emailAccounts.id, accountId));

    // Start the background sync (don't await - runs in background)
    performBackgroundSync(
      accountId, 
      account.nylasGrantId!, 
      account.syncCursor || undefined, 
      account.nylasProvider || undefined
    ).catch(err => {
      console.error(`❌ Background sync error for ${accountId}:`, err);
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Background sync started',
      progress: account.syncProgress || 0
    });
  } catch (error) {
    console.error('Background sync initiation error:', error);
    return NextResponse.json({ error: 'Failed to start background sync' }, { status: 500 });
  }
}

// GET: Check sync status
export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get('accountId');

  if (!accountId) {
    return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
  }

  try {
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      syncStatus: account.syncStatus,
      progress: account.syncProgress || 0,
      totalEmailCount: account.totalEmailCount || 0,
      syncedEmailCount: account.syncedEmailCount || 0,
      lastSyncedAt: account.lastSyncedAt,
      initialSyncCompleted: account.initialSyncCompleted,
    });
  } catch (error) {
    console.error('Sync status check error:', error);
    return NextResponse.json({ error: 'Failed to check sync status' }, { status: 500 });
  }
}

// Background sync function with pagination
async function performBackgroundSync(
  accountId: string, 
  grantId: string, 
  startingCursor: string | null = null,
  provider?: string
) {
  console.log(`📧 Starting background email sync for account ${accountId} (Provider: ${provider})`);

  let pageToken: string | undefined = startingCursor || undefined;
  let totalSynced = 0;
  const pageSize = 200; // Nylas API max limit is 200 emails per request
  const maxPages = 1000; // Supports up to 200,000 emails (1000 pages × 200)
  let currentPage = 0;
  
  // ✅ FIX #3: Timeout detection (Vercel Pro = 5 min, leave 1 min buffer)
  const startTime = Date.now();
  const TIMEOUT_MS = 4 * 60 * 1000; // 4 minutes
  
  // Provider-specific delays to avoid rate limiting
  const delayMs = provider === 'microsoft' ? 500 : 100; // Microsoft needs more delay

  try {
    // Get current synced count and continuation count
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });

    let syncedCount = account?.syncedEmailCount || 0;
    const continuationCount = account?.continuationCount || 0;
    
    // ✅ SAFETY: Prevent infinite continuation loops
    const MAX_CONTINUATIONS = 100; // ✅ INCREASED: Allow more continuations for large mailboxes (100 × 4min = 6.6 hours max)

    if (continuationCount >= MAX_CONTINUATIONS) {
      console.error(`❌ Max continuations reached (${MAX_CONTINUATIONS}) for account ${accountId} - stopping sync`);
      console.error(`📊 Sync stats at stop: ${syncedCount.toLocaleString()} emails synced`);
      await db.update(emailAccounts)
        .set({
          syncStatus: 'error',
          lastError: `Sync exceeded maximum time limit (${MAX_CONTINUATIONS} continuations = ~${Math.round(MAX_CONTINUATIONS * 4 / 60)} hours). Synced ${syncedCount.toLocaleString()} emails. Please contact support if you have an extremely large mailbox.`,
          syncProgress: 99,
          continuationCount: 0, // Reset for next manual sync
        })
        .where(eq(emailAccounts.id, accountId));
      return;
    }

    while (currentPage < maxPages) {
      currentPage++;
      console.log(`📄 Fetching page ${currentPage} for account ${accountId}`);

      // ✅ FIX #3: Check if approaching Vercel timeout
      const elapsed = Date.now() - startTime;
      if (elapsed > TIMEOUT_MS) {
        console.log(`⏰ Approaching Vercel timeout (${Math.round(elapsed/1000)}s elapsed) - saving progress and re-queuing`);
        
        // Save current state with cursor for resume
        await db.update(emailAccounts)
          .set({
            syncStatus: 'background_syncing', // Keep as syncing
            syncProgress: Math.min(Math.round((syncedCount / 50000) * 100), 99), // Estimate progress
            syncCursor: pageToken || null, // Save position for resume
            syncedEmailCount: syncedCount,
            lastSyncedAt: new Date(),
            continuationCount: continuationCount + 1, // Increment continuation counter
          })
          .where(eq(emailAccounts.id, accountId));
        
        // Trigger new background job to continue from where we left off
        console.log(`🔄 Triggering continuation ${continuationCount + 1}/${MAX_CONTINUATIONS} with cursor: ${pageToken?.substring(0, 20)}...`);
        console.log(`📊 Progress before continuation: ${syncedCount.toLocaleString()} emails synced, ${currentPage} pages processed`);

        // ✅ FIX #5: Retry continuation request with exponential backoff
        let continuationSuccess = false;
        const maxContinuationRetries = 3;
        
        for (let retryAttempt = 1; retryAttempt <= maxContinuationRetries; retryAttempt++) {
          try {
            console.log(`🔄 Continuation attempt ${retryAttempt}/${maxContinuationRetries}`);
            
            const continuationResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/nylas/sync/background`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accountId }),
            });

            if (!continuationResponse.ok) {
              throw new Error(`Continuation request failed with status ${continuationResponse.status}: ${continuationResponse.statusText}`);
            }

            const responseData = await continuationResponse.json();
            console.log(`✅ Continuation ${continuationCount + 1} successfully triggered:`, responseData);
            continuationSuccess = true;
            break; // Success! Exit retry loop
          } catch (err) {
            console.error(`❌ Continuation attempt ${retryAttempt}/${maxContinuationRetries} failed:`, err);
            
            if (retryAttempt < maxContinuationRetries) {
              // Exponential backoff: 2s, 4s, 8s
              const backoffMs = 2000 * Math.pow(2, retryAttempt - 1);
              console.log(`⏳ Waiting ${backoffMs}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, backoffMs));
            } else {
              // All retries failed - log detailed error
              console.error(`❌ All ${maxContinuationRetries} continuation attempts failed`);
              console.error(`📊 Sync stopped at: ${syncedCount.toLocaleString()} emails, ${currentPage} pages`);
              console.error(`💾 Saved cursor for manual retry: ${pageToken?.substring(0, 50)}...`);
              
              // Update account with detailed error status
              await db.update(emailAccounts)
                .set({
                  syncStatus: 'error',
                  lastError: `Continuation ${continuationCount + 1} failed after ${maxContinuationRetries} retries. Synced ${syncedCount.toLocaleString()} emails before stopping. Please retry sync to continue from where it left off.`,
                })
                .where(eq(emailAccounts.id, accountId));
            }
          }
        }
        
        if (!continuationSuccess) {
          console.error(`❌ Continuation failed permanently - sync stopped`);
          return; // Exit function since continuation failed
        }

        return; // Exit gracefully, continuation job will pick up
      }

      // Check if account still exists before continuing
      const accountCheck = await db.query.emailAccounts.findFirst({
        where: eq(emailAccounts.id, accountId),
      });

      if (!accountCheck) {
        console.log(`🛑 Account ${accountId} no longer exists - stopping sync`);
        return; // Exit the sync function completely
      }

      // Check if sync was manually stopped (using dedicated flag)
      if (accountCheck.syncStopped) {
        console.log(`🛑 Sync was manually stopped for account ${accountId} - exiting`);
        return;
      }

      try {
        // Build query params - only include pageToken if it exists
        const queryParams: any = {
          limit: pageSize,
        };
        
        if (pageToken) {
          queryParams.pageToken = pageToken;
        }
        
        // Fetch messages from Nylas
        const response = await nylas.messages.list({
          identifier: grantId,
          queryParams,
        });

        const messages = response.data;

        if (!messages || messages.length === 0) {
          console.log(`✅ No more messages returned from Nylas for account ${accountId}`);
          console.log(`📊 Sync completion reason: Empty response from Nylas API`);
          console.log(`📊 Total synced: ${syncedCount.toLocaleString()} emails across ${currentPage} pages`);
          break;
        }

        console.log(`💾 Syncing ${messages.length} emails (Page ${currentPage})`);

        // Insert or update emails in database
        for (const message of messages) {
          try {
            // Map attachments to ensure required fields are present and sanitize all text
            const mappedAttachments = message.attachments?.map((att: any) => ({
              id: sanitizeText(att.id) || '',
              filename: sanitizeText(att.filename) || 'untitled',
              size: att.size || 0, // Default to 0 if size is undefined
              contentType: sanitizeText(att.contentType) || 'application/octet-stream',
              contentId: sanitizeText(att.contentId),
              url: sanitizeText(att.url),
              providerFileId: sanitizeText(att.id),
            })) || [];

            // Log date for debugging
            const receivedDate = message.date ? new Date(message.date * 1000) : new Date();
            const sentDate = message.date ? new Date(message.date * 1000) : new Date();
            
            if (currentPage === 1 && messages.indexOf(message) === 0) {
              console.log('📅 Sample email date conversion:', {
                nylasDate: message.date,
                receivedAt: receivedDate.toISOString(),
                sentAt: sentDate.toISOString(),
                subject: message.subject?.substring(0, 50),
                folders: message.folders,
                selectedFolder: message.folders?.[0],
              });
            }

            // Use INSERT ... ON CONFLICT DO NOTHING to handle duplicates gracefully
            // Use returning() to check if the insert actually happened (not a duplicate)
            
            // SAFE folder assignment - prevents the bug where everything goes to inbox
            const assignedFolder = assignEmailFolder(message.folders);
            
            // VALIDATION: Ensure folder assignment is working correctly
            try {
              validateFolderAssignment(message.folders, assignedFolder);
            } catch (validationError: any) {
              console.error(`⚠️ Folder validation failed for ${message.id}:`, validationError.message);
              console.error(`Folders from API:`, message.folders);
              console.error(`Assigned folder:`, assignedFolder);
            }
            
            const result = await db.insert(emails).values({
              accountId: accountId,
              provider: 'nylas',
              providerMessageId: sanitizeText(message.id),
              messageId: message.object === 'message' ? sanitizeText(message.id) : undefined,
              threadId: sanitizeText(message.threadId),
              providerThreadId: sanitizeText(message.threadId),
              folder: assignedFolder,
              folders: message.folders || [],
              fromEmail: sanitizeText(message.from?.[0]?.email),
              fromName: sanitizeText(message.from?.[0]?.name),
              toEmails: sanitizeParticipants(message.to),
              ccEmails: sanitizeParticipants(message.cc),
              bccEmails: sanitizeParticipants(message.bcc),
              subject: sanitizeText(message.subject),
              snippet: sanitizeText(message.snippet),
              bodyText: sanitizeText(message.body),
              bodyHtml: sanitizeText(message.body),
              receivedAt: receivedDate,
              sentAt: sentDate,
              isRead: !message.unread,
              isStarred: message.starred || false,
              hasAttachments: (message.attachments?.length || 0) > 0,
              attachmentsCount: message.attachments?.length || 0,
              attachments: mappedAttachments,
            }).onConflictDoNothing()
              .returning(); // Check if actually inserted

            // Only increment counters if email was actually inserted (not a duplicate)
            if (result && result.length > 0) {
              totalSynced++;
              syncedCount++;
            }
          } catch (emailError: any) {
            // If it's a duplicate key error, just skip it silently
            if (emailError?.code === '23505') {
              console.log(`⏭️ Email ${message.id} already exists, skipping`);
              continue;
            }
            console.error(`❌ Error syncing email ${message.id}:`, emailError);
            // Continue with next email
          }
        }

        // Update sync progress with detailed metrics
        // ✅ FIX #5: Better progress calculation and logging
        const estimatedProgress = syncedCount > 0
          ? Math.min(Math.round((syncedCount / 50000) * 100), 99) // Estimate based on 50K assumption
          : Math.min(Math.round((currentPage / maxPages) * 100), 99); // Fallback to page-based

        // Calculate sync rate (emails per minute)
        const elapsedMinutes = (Date.now() - startTime) / (1000 * 60);
        const emailsPerMinute = elapsedMinutes > 0 ? Math.round(syncedCount / elapsedMinutes) : 0;

        await db.update(emailAccounts)
          .set({
            syncedEmailCount: syncedCount,
            syncProgress: estimatedProgress,
            syncCursor: response.nextCursor || null,
            lastSyncedAt: new Date(),
            // Store metadata for dashboard
            metadata: {
              currentPage,
              maxPages,
              emailsPerMinute,
              lastBatchSize: messages.length,
            },
          })
          .where(eq(emailAccounts.id, accountId));

        console.log(`📊 Progress: ${estimatedProgress}% | Synced: ${syncedCount.toLocaleString()} emails | Page: ${currentPage}/${maxPages} | Rate: ${emailsPerMinute}/min | Time: ${Math.round((Date.now() - startTime)/1000)}s`);

        // Check for next page
        if (!response.nextCursor) {
          console.log(`✅ Reached end of messages for account ${accountId} - no nextCursor`);
          console.log(`📊 Sync completion reason: Nylas pagination complete (no nextCursor)`);
          console.log(`📊 Total synced: ${syncedCount.toLocaleString()} emails across ${currentPage} pages`);
          break;
        }

        pageToken = response.nextCursor;

        // Provider-specific delay to avoid rate limiting
        // Microsoft needs more time between requests to avoid throttling
        await new Promise(resolve => setTimeout(resolve, delayMs));

      } catch (pageError) {
        console.error(`❌ Error fetching page ${currentPage}:`, pageError);
        
        // Get current account state for retry logic
        const currentAccount = await db.query.emailAccounts.findFirst({
          where: eq(emailAccounts.id, accountId),
        });

        const retryCount = (currentAccount?.retryCount || 0) + 1;
        const maxRetries = 3;

        if (retryCount <= maxRetries) {
          // Auto-retry with exponential backoff
          const backoffMs = Math.min(1000 * Math.pow(2, retryCount - 1), 30000); // Max 30s
          console.log(`🔄 Retry ${retryCount}/${maxRetries} in ${backoffMs}ms for account ${accountId}`);

          await db.update(emailAccounts)
            .set({
              retryCount: retryCount,
              lastRetryAt: new Date(),
              lastError: `Retry ${retryCount}/${maxRetries}: ${pageError instanceof Error ? pageError.message : 'Unknown error'}`,
            })
            .where(eq(emailAccounts.id, accountId));

          // Wait for backoff period
          await new Promise(resolve => setTimeout(resolve, backoffMs));

          // Retry this page (decrement currentPage to retry)
          currentPage--;
          continue;
        } else {
          // Max retries exceeded - update error status
          console.error(`❌ Max retries (${maxRetries}) exceeded for account ${accountId}`);
          await db.update(emailAccounts)
            .set({
              syncStatus: 'error',
              lastError: `Sync failed after ${maxRetries} retries: ${pageError instanceof Error ? pageError.message : 'Unknown error'}`,
            })
            .where(eq(emailAccounts.id, accountId));
          
          throw pageError;
        }
      }
    }

    // Mark sync as completed
    // ✅ FIX #5: Add completion verification and detailed logging
    const elapsedMinutes = Math.round((Date.now() - startTime) / 60000);
    const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);

    // Determine completion reason
    let completionReason = 'Unknown';
    if (currentPage >= maxPages) {
      completionReason = `Reached max pages limit (${maxPages})`;
    } else if (!pageToken) {
      completionReason = 'Nylas pagination complete (no more pages)';
    } else {
      completionReason = 'No more emails available from provider';
    }

    await db.update(emailAccounts)
      .set({
        syncStatus: 'completed',
        syncProgress: 100,
        initialSyncCompleted: true,
        totalEmailCount: syncedCount,
        lastSyncedAt: new Date(),
        continuationCount: 0, // Reset continuation counter on successful completion
        retryCount: 0, // Reset retry counter
        lastError: null, // Clear any previous errors
      })
      .where(eq(emailAccounts.id, accountId));

    console.log(`✅ ========================================`);
    console.log(`✅ Background sync COMPLETED for account ${accountId}`);
    console.log(`✅ ========================================`);
    console.log(`📊 Final Stats:`);
    console.log(`   - New emails synced this session: ${totalSynced.toLocaleString()}`);
    console.log(`   - Total emails in database: ${syncedCount.toLocaleString()}`);
    console.log(`   - Pages processed: ${currentPage}/${maxPages}`);
    console.log(`   - Time elapsed: ${elapsedMinutes} min ${elapsedSeconds % 60} sec`);
    console.log(`   - Completion reason: ${completionReason}`);
    console.log(`   - Continuations used: ${continuationCount}/${MAX_CONTINUATIONS}`);
    console.log(`✅ ========================================`);
  } catch (error) {
    console.error(`❌ Background sync failed for account ${accountId}:`, error);
    
    await db.update(emailAccounts)
      .set({
        syncStatus: 'error',
        lastError: error instanceof Error ? error.message : 'Unknown error',
      })
      .where(eq(emailAccounts.id, accountId));
  }
}

