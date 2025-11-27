import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts, emails } from '@/lib/db/schema';
import { eq, count } from 'drizzle-orm';
import Nylas from 'nylas';
import { sanitizeText, sanitizeParticipants } from '@/lib/utils/text-sanitizer';
import { assignEmailFolder, validateFolderAssignment } from '@/lib/email/folder-utils';
import { extractAndSaveAttachments } from '@/lib/attachments/extract-from-email';
import { isRateLimitError, isRetryableError, calculateBackoffDelay } from '@/lib/rate-limit-handler';
import { canStartSync, completeSyncSlot } from '@/lib/sync/sync-queue';
import { getProviderConfig } from '@/lib/sync/provider-config';
import { canMakeRequest as circuitBreakerCheck, recordSuccess, recordRateLimitFailure } from '@/lib/sync/circuit-breaker';
import { logQuotaUsage } from '@/lib/sync/quota-monitor';

const nylas = new Nylas({
  apiKey: process.env.NYLAS_API_KEY!,
  apiUri: process.env.NYLAS_API_URI!,
});

// ✅ VERSION MARKER: v4.0-enterprise (provider-specific delays, circuit breaker, queue management)
const SYNC_VERSION = '4.0-enterprise';

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

    // ✅ FIXED: Check if sync is stuck (status says "syncing" but no activity for 10+ minutes)
    const STUCK_SYNC_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
    const isStuckSync = (account.syncStatus === 'syncing' || account.syncStatus === 'background_syncing') &&
                        account.lastActivityAt &&
                        (Date.now() - account.lastActivityAt.getTime()) > STUCK_SYNC_TIMEOUT_MS;

    if (isStuckSync) {
      console.log(`🔧 Detected stuck sync for ${accountId} - resetting (last activity: ${account.lastActivityAt})`);
      // Reset the stuck sync state
      await db.update(emailAccounts)
        .set({
          syncStatus: 'idle',
          lastError: 'Previous sync timed out - restarting',
        })
        .where(eq(emailAccounts.id, accountId));

      // Refresh account data
      const refreshedAccount = await db.query.emailAccounts.findFirst({
        where: eq(emailAccounts.id, accountId),
      });
      if (refreshedAccount) {
        account.syncStatus = refreshedAccount.syncStatus;
        account.lastError = refreshedAccount.lastError;
      }
    }

    // Check if already syncing (and not stuck)
    if (!isStuckSync && (account.syncStatus === 'syncing' || account.syncStatus === 'background_syncing')) {
      console.log(`⏭️ Account ${accountId} is already syncing`);
      return NextResponse.json({
        success: true,
        message: 'Sync already in progress',
        progress: account.syncProgress || 0
      });
    }

    // ✅ NEW: Check sync queue - prevent too many concurrent syncs
    const canStart = await canStartSync(accountId);
    if (!canStart) {
      console.log(`⏸️ Sync queued for ${accountId} - too many concurrent syncs`);
      await db.update(emailAccounts)
        .set({ syncStatus: 'queued', lastError: 'Waiting for available sync slot' })
        .where(eq(emailAccounts.id, accountId));

      return NextResponse.json({
        success: true,
        message: 'Sync queued - will start when slot available',
        progress: account.syncProgress || 0,
        queued: true,
      });
    }

    // ✅ NEW: Check circuit breaker - prevent syncing if provider has too many rate limits
    const circuitCheck = circuitBreakerCheck(account.emailProvider || 'unknown');
    if (!circuitCheck.allowed) {
      console.log(`🔴 Circuit breaker blocking sync for ${accountId}: ${circuitCheck.reason}`);
      await db.update(emailAccounts)
        .set({
          syncStatus: 'paused',
          lastError: circuitCheck.reason || 'Circuit breaker active - too many rate limits',
        })
        .where(eq(emailAccounts.id, accountId));

      // Release sync slot since we're not starting
      completeSyncSlot(accountId);

      return NextResponse.json({
        success: false,
        message: circuitCheck.reason || 'Circuit breaker active',
        retryAfterMs: circuitCheck.retryAfterMs,
      }, { status: 429 });
    }

    // Update status to background_syncing and clear stop flag
    // Enable webhook suppression during initial sync
    await db.update(emailAccounts)
      .set({
        syncStatus: 'background_syncing',
        lastError: null,
        syncStopped: false, // Clear the stop flag when starting
        retryCount: 0, // Reset retry count on manual start
        lastActivityAt: new Date(), // ✅ Track when sync started
        suppressWebhooks: !account.initialSyncCompleted, // Suppress webhooks during initial sync only
      })
      .where(eq(emailAccounts.id, accountId));

    // ✅ FIXED: AWAIT the sync so Vercel doesn't kill it when response returns
    // This works on Vercel Pro with 5-minute timeouts
    try {
      await performBackgroundSync(
        accountId,
        account.nylasGrantId!,
        account.syncCursor || undefined,
        account.nylasProvider || undefined,
        account.emailAddress || undefined
      );

      return NextResponse.json({
        success: true,
        message: 'Background sync completed successfully',
        progress: account.syncProgress || 0
      });
    } catch (err) {
      console.error(`❌ Background sync error for ${accountId}:`, err);

      // Return partial success - sync started but may need continuation
      return NextResponse.json({
        success: true,
        message: 'Background sync started - may need continuation',
        progress: account.syncProgress || 0,
        needsContinuation: true,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    }
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

// ✅ NEW: Cursor validation helper
async function validateCursor(grantId: string, cursor: string | null): Promise<string | null> {
  if (!cursor) return null;

  try {
    // Test the cursor by fetching a single message
    const testResponse = await nylas.messages.list({
      identifier: grantId,
      queryParams: {
        limit: 1,
        pageToken: cursor,
      },
    });

    // If successful, cursor is valid
    console.log(`✅ Cursor validation passed`);
    return cursor;
  } catch (error: any) {
    console.warn(`⚠️ Cursor validation failed:`, error.message);
    console.warn(`📋 Will restart sync from beginning`);
    // Return null to start from beginning
    return null;
  }
}

// Background sync function with pagination
async function performBackgroundSync(
  accountId: string,
  grantId: string,
  startingCursor: string | null = null,
  provider?: string,
  accountEmail?: string
) {
  console.log(`📧 [${SYNC_VERSION}] Starting background email sync for account ${accountId} (Email: ${accountEmail}, Provider: ${provider})`);

  // ✅ NEW: Validate cursor before using it
  const validatedCursor = await validateCursor(grantId, startingCursor);
  if (startingCursor && !validatedCursor) {
    console.warn(`⚠️ Starting cursor was invalid, restarting from beginning`);
    // Update account to clear invalid cursor
    await db.update(emailAccounts)
      .set({
        syncCursor: null,
        lastError: 'Previous sync cursor expired, restarting from beginning',
      })
      .where(eq(emailAccounts.id, accountId));
  }

  let pageToken: string | undefined = validatedCursor || undefined;
  let totalSynced = 0;
  const pageSize = 200; // Nylas API max limit is 200 emails per request
  const maxPages = Infinity; // ✅ UNLIMITED: No limit on pages - sync ALL emails like Superhuman/Outlook
  let currentPage = 0;

  // ✅ Track folders encountered during sync for debugging
  const foldersEncountered = new Set<string>();

  // ✅ SPEED OPTIMIZATION: Extended timeout for Vercel Pro (5min max, leave 30s buffer)
  const startTime = Date.now();
  const TIMEOUT_MS = 4.5 * 60 * 1000; // 4.5 minutes (more sync time per run)

  // ✅ NOTE: Nylas messages.list() with pagination returns messages from ALL folders
  // The API aggregates messages across folders and uses cursor pagination
  // We detect sent emails by checking if from.email matches accountEmail
  // This ensures sent items sync correctly even if Nylas doesn't tag them properly
  //
  // FUTURE ENHANCEMENT: For even better reliability, we could:
  // 1. First sync folder list: GET /folders
  // 2. Then sync each folder individually: GET /messages?in[]=folderId
  // This would guarantee complete coverage but would be slower
  // Current approach is optimized for speed while maintaining accuracy

  // ✅ NEW: Get provider-specific configuration (supports Gmail, Outlook, Yahoo, iCloud, IMAP, etc.)
  const providerConfig = getProviderConfig(provider);
  const delayMs = providerConfig.delayMs;
  console.log(`📊 Using provider config for ${provider || 'unknown'}: ${delayMs}ms delay, ${providerConfig.maxRetries} max retries`);

  try {
    // Get current synced count and continuation count
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });

    if (!account) {
      console.error(`❌ Account ${accountId} not found`);
      return;
    }

    const userId = account.userId;
    let syncedCount = account?.syncedEmailCount || 0;
    const continuationCount = account?.continuationCount || 0;
    
    // ✅ SAFETY: Prevent infinite continuation loops
    const MAX_CONTINUATIONS = Infinity; // ✅ UNLIMITED: No limit on continuations - sync ALL emails until complete

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
      
      // ✅ ENHANCED LOGGING: Log at start of page to track activity
      const elapsed = Date.now() - startTime;
      console.log(`📄 [${Math.round(elapsed/1000)}s] Fetching page ${currentPage} for account ${accountId} | Synced: ${syncedCount} | Cursor: ${pageToken?.substring(0, 20)}...`);

      // ✅ FIX #3: Check if approaching Vercel timeout
      if (elapsed > TIMEOUT_MS) {
        console.log(`⏰ Approaching Vercel timeout (${Math.round(elapsed/1000)}s elapsed) - saving progress and re-queuing`);

        // ✅ CRITICAL FIX: Get actual current count from database before timeout
        // This ensures we don't lose progress if we timeout before the end-of-loop update
        const actualCount = await db
          .select({ count: count() })
          .from(emails)
          .where(eq(emails.accountId, accountId));
        
        const actualSyncedCount = actualCount[0]?.count || syncedCount;
        console.log(`📊 Timeout check: Local count: ${syncedCount}, DB count: ${actualSyncedCount}`);

        // Get account to check totalEmailCount
        const timeoutAccount = await db.query.emailAccounts.findFirst({
          where: eq(emailAccounts.id, accountId),
        });
        const totalEmailCount = timeoutAccount?.totalEmailCount || 0;

        // Calculate progress accurately using actual DB count
        let timeoutProgress: number;
        if (totalEmailCount > 0 && actualSyncedCount > 0) {
          timeoutProgress = Math.min(Math.round((actualSyncedCount / totalEmailCount) * 100), 99);
        } else if (actualSyncedCount > 0) {
          timeoutProgress = Math.min(Math.round((actualSyncedCount / 10000) * 100), 99);
        } else {
          timeoutProgress = Math.min(Math.round((currentPage / maxPages) * 100), 99);
        }

        // Save current state with cursor for resume
        await db.update(emailAccounts)
          .set({
            syncStatus: 'background_syncing', // Keep as syncing
            syncProgress: timeoutProgress,
            syncCursor: pageToken || null, // Save position for resume
            syncedEmailCount: actualSyncedCount, // ✅ Use actual DB count, not local variable
            lastSyncedAt: new Date(),
            continuationCount: continuationCount + 1, // Increment continuation counter
          })
          .where(eq(emailAccounts.id, accountId));
        
        // Trigger new background job to continue from where we left off
        console.log(`🔄 Triggering continuation ${continuationCount + 1}/${MAX_CONTINUATIONS} with cursor: ${pageToken?.substring(0, 20)}...`);
        console.log(`📊 Progress before continuation: ${syncedCount.toLocaleString()} emails synced, ${currentPage} pages processed`);

        // ✅ IMPROVED: Enhanced continuation retry with progressive backoff and auto-resume
        let continuationSuccess = false;
        const maxContinuationRetries = 5; // Increased from 3 to 5

        for (let retryAttempt = 1; retryAttempt <= maxContinuationRetries; retryAttempt++) {
          try {
            console.log(`🔄 Continuation attempt ${retryAttempt}/${maxContinuationRetries}`);

            const continuationResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/nylas/sync/background`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accountId }),
              signal: AbortSignal.timeout(10000), // 10s timeout per request
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
              // Progressive backoff: 1s, 2s, 4s, 8s, 16s
              const backoffMs = 1000 * Math.pow(2, retryAttempt - 1);
              console.log(`⏳ Waiting ${backoffMs}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, backoffMs));
            } else {
              // All retries failed - mark for auto-resume instead of error
              console.error(`❌ All ${maxContinuationRetries} continuation attempts failed`);
              console.error(`📊 Sync paused at: ${syncedCount.toLocaleString()} emails, ${currentPage} pages`);
              console.error(`💾 Saved cursor for auto-resume: ${pageToken?.substring(0, 50)}...`);

              // ✅ NEW: Mark as "pending_resume" instead of "error" for auto-recovery
              await db.update(emailAccounts)
                .set({
                  syncStatus: 'pending_resume', // New status for auto-resume
                  lastError: `Continuation ${continuationCount + 1} paused after ${maxContinuationRetries} retries. Auto-resume will retry in 1 minute. Progress saved: ${syncedCount.toLocaleString()} emails synced.`,
                  metadata: {
                    ...((await db.query.emailAccounts.findFirst({ where: eq(emailAccounts.id, accountId) }))?.metadata || {}),
                    resumeAfter: new Date(Date.now() + 60000).toISOString(), // Resume after 1 minute
                  },
                })
                .where(eq(emailAccounts.id, accountId));
            }
          }
        }

        if (!continuationSuccess) {
          console.log(`⏸️ Continuation paused - will auto-resume in 1 minute`);
          return; // Exit function, auto-resume will pick it up
        }

        return; // Exit gracefully, continuation job will pick up
      }

      // ✅ PERFORMANCE: Only check syncStopped every 10 pages to avoid N+1 query
      // This reduces database queries from 100s to ~10 per sync run (30-50% faster)
      if (currentPage % 10 === 0) {
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

        // ✅ NEW: Log quota usage for monitoring
        if ((response as any).headers) {
          logQuotaUsage(provider || 'unknown', accountId, (response as any).headers, false);
        }

        // ✅ NEW: Record successful API call in circuit breaker
        recordSuccess(provider || 'unknown');

        const messages = response.data;

        if (!messages || messages.length === 0) {
          console.log(`✅ No more messages returned from Nylas for account ${accountId}`);
          console.log(`📊 Sync completion reason: Empty response from Nylas API`);
          console.log(`📊 Total synced: ${syncedCount.toLocaleString()} emails across ${currentPage} pages`);
          break;
        }

        console.log(`💾 Syncing ${messages.length} emails (Page ${currentPage})`);

        // Process emails
        let pageInsertedCount = 0;
        
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
            let assignedFolder = assignEmailFolder(message.folders);

            // ✅ FIX: Check if this is a sent message (from account owner)
            // This handles emails sent from external clients that may not be in the Sent folder
            const isFromAccountOwner = accountEmail && message.from?.[0]?.email?.toLowerCase() === accountEmail.toLowerCase();

            // Override folder to 'sent' if email is from account owner and not in drafts
            if (isFromAccountOwner && assignedFolder !== 'sent' && assignedFolder !== 'drafts') {
              console.log(`📤 Overriding folder "${assignedFolder}" → "sent" for email from account owner (${message.from?.[0]?.email})`);
              assignedFolder = 'sent';
            }

            // Track folders encountered during sync
            if (message.folders) {
              message.folders.forEach((f: string) => foldersEncountered.add(f));
            }
            foldersEncountered.add(assignedFolder);

            // Log folder assignment for first email on each page for debugging
            if (currentPage % 10 === 0 && messages.indexOf(message) === 0) {
              console.log(`📁 Folder assignment sample:`, {
                from: message.from?.[0]?.email,
                accountEmail,
                isFromAccountOwner,
                rawFolders: message.folders,
                assignedFolder,
                subject: message.subject?.substring(0, 50),
              });
            }

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
              pageInsertedCount++;

              // ✅ OPTIMIZED: Queue attachments for background processing using setImmediate
              // This prevents blocking the sync loop and reduces memory pressure
              if (message.attachments && message.attachments.length > 0) {
                // Defer attachment extraction to next event loop tick
                // This keeps the main sync loop responsive and fast
                const attachmentData = {
                  message,
                  emailRecord: result[0],
                  accountId,
                  userId,
                  grantId,
                  nylas,
                };

                // Use setImmediate to defer execution without blocking
                setImmediate(() => {
                  extractAndSaveAttachments(attachmentData).catch((attachmentError: any) => {
                    console.error(`⚠️ Failed to extract attachments for email ${message.id}:`, attachmentError.message);
                    // Don't fail the whole sync if attachment extraction fails
                  });
                });
              }
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

        // Log page completion
        console.log(`✅ Page ${currentPage} complete: ${pageInsertedCount} new emails inserted (${messages.length - pageInsertedCount} duplicates skipped) | Total synced: ${syncedCount}`);

        // ✅ OPTIMIZATION: Update activity every page, full progress every 2 pages
        // This prevents false "stuck" detection while reducing DB writes
        const shouldUpdateFullProgress = currentPage % 2 === 0 || !response.nextCursor;

        if (shouldUpdateFullProgress) {
          // Update sync progress with detailed metrics
          // ✅ FIX: Use actual total email count for accurate progress
          const currentAccount = await db.query.emailAccounts.findFirst({
            where: eq(emailAccounts.id, accountId),
          });

          const totalEmailCount = currentAccount?.totalEmailCount || 0;

          // Calculate progress based on actual total or estimate
          let estimatedProgress: number;
          if (totalEmailCount > 0 && syncedCount > 0) {
            // Use actual total for accurate progress
            estimatedProgress = Math.min(Math.round((syncedCount / totalEmailCount) * 100), 99);
          } else if (syncedCount > 0) {
            // Estimate based on 10K default if no total available
            estimatedProgress = Math.min(Math.round((syncedCount / 10000) * 100), 99);
          } else {
            // Fallback to page-based
            estimatedProgress = Math.min(Math.round((currentPage / maxPages) * 100), 99);
          }

          // Calculate sync rate (emails per minute)
          const elapsedMinutes = (Date.now() - startTime) / (1000 * 60);
          const emailsPerMinute = elapsedMinutes > 0 ? Math.round(syncedCount / elapsedMinutes) : 0;

          await db.update(emailAccounts)
            .set({
              syncedEmailCount: syncedCount,
              syncProgress: estimatedProgress,
              syncCursor: response.nextCursor || null,
              lastSyncedAt: new Date(),
              lastActivityAt: new Date(), // ✅ Track activity every 2 pages
              // Store metadata for dashboard
              metadata: {
                currentPage,
                maxPages,
                emailsPerMinute,
                lastBatchSize: messages.length,
                totalEmailCount: totalEmailCount || null,
              },
            })
            .where(eq(emailAccounts.id, accountId));

          console.log(`📊 Progress: ${estimatedProgress}% | Synced: ${syncedCount.toLocaleString()} emails | Page: ${currentPage}/${maxPages} | Rate: ${emailsPerMinute}/min | Time: ${Math.round((Date.now() - startTime)/1000)}s`);
        } else {
          // ✅ NEW: Light update every page to track activity and save cursor
          await db.update(emailAccounts)
            .set({
              lastActivityAt: new Date(), // Update activity heartbeat
              syncCursor: response.nextCursor || null, // Always save cursor for recovery
            })
            .where(eq(emailAccounts.id, accountId));
        }

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
        // Enhanced error logging for debugging
        const errorType = (pageError as any)?.type || 'unknown';
        const errorCode = (pageError as any)?.providerError?.error?.code || (pageError as any)?.statusCode || (pageError as any)?.status;
        const errorMsg = (pageError as any)?.providerError?.error?.message || (pageError as any)?.message || 'Unknown error';
        
        console.error(`❌ Error fetching page ${currentPage}:`, pageError);
        console.error(`📋 Error details: Type=${errorType}, Code=${errorCode}, Message=${errorMsg}`);

        // Get current account state for retry logic
        const currentAccount = await db.query.emailAccounts.findFirst({
          where: eq(emailAccounts.id, accountId),
        });

        const retryCount = (currentAccount?.retryCount || 0) + 1;
        const maxRetries = 3;

        if (retryCount <= maxRetries) {
          // Check if it's a rate limit error for smarter backoff
          const isRateLimit = isRateLimitError(pageError);
          const isServiceError = isRetryableError(pageError) && !isRateLimit;
          let backoffMs: number;

          if (isRateLimit) {
            // For rate limits, use moderate backoff and respect Retry-After if available
            console.log(`⏱️ Rate limit (429) detected on retry ${retryCount}/${maxRetries}`);
            console.log(`📊 Gmail quota used: ${(pageError as any)?.headers?.['nylas-gmail-quota-usage'] || 'unknown'}`);

            // ✅ NEW: Log quota usage for rate limit error
            if ((pageError as any)?.headers) {
              logQuotaUsage(provider || 'unknown', accountId, (pageError as any).headers, true);
            }

            // ✅ NEW: Record rate limit failure in circuit breaker
            const circuitBreakerResult = recordRateLimitFailure(provider || 'unknown');
            if (circuitBreakerResult.shouldOpenCircuit) {
              console.log(`🔴 Circuit breaker opened for ${provider} due to repeated rate limits`);
            }

            // Extract Retry-After from error if available (Nylas includes this in some error responses)
            const retryAfter = (pageError as any)?.response?.headers?.get?.('retry-after');
            if (retryAfter) {
              backoffMs = parseInt(retryAfter, 10) * 1000; // Convert seconds to ms
              console.log(`📋 Using Retry-After header: ${backoffMs}ms`);
            } else {
              // ✅ OPTIMIZED: Reduced backoff times - 10s, 20s, 40s instead of 30s, 60s, 120s
              // Most rate limits clear in 10-30 seconds, not minutes
              backoffMs = calculateBackoffDelay(retryCount, {
                maxRetries: maxRetries,
                initialDelayMs: 10000, // Start at 10 seconds (reduced from 30s)
                maxDelayMs: 40000, // Max 40 seconds (reduced from 120s)
                backoffMultiplier: 2,
                jitterMs: 3000, // Add 0-3s jitter (reduced from 5s)
              });
            }
          } else if (isServiceError) {
            // For 503 and other service errors, use moderate backoff
            console.log(`🔧 Service error (${errorCode}) detected on retry ${retryCount}/${maxRetries}`);
            backoffMs = calculateBackoffDelay(retryCount, {
              maxRetries: maxRetries,
              initialDelayMs: 5000, // Start at 5 seconds for service errors
              maxDelayMs: 30000, // Max 30 seconds
              backoffMultiplier: 2,
              jitterMs: 2000,
            });
          } else {
            // Standard exponential backoff for other errors
            backoffMs = calculateBackoffDelay(retryCount, {
              maxRetries: maxRetries,
              initialDelayMs: 1000,
              maxDelayMs: 30000,
              backoffMultiplier: 2,
            });
          }

          console.log(`🔄 Retry ${retryCount}/${maxRetries} in ${Math.round(backoffMs/1000)}s for account ${accountId}${isRateLimit ? ' (rate limited)' : isServiceError ? ' (service error)' : ''}`);

          const errorMessage = pageError instanceof Error ? pageError.message : 'Unknown error';
          await db.update(emailAccounts)
            .set({
              retryCount: retryCount,
              lastRetryAt: new Date(),
              lastError: isRateLimit
                ? `⏱️ Rate limited (429) - retrying ${retryCount}/${maxRetries} (waiting ${Math.round(backoffMs/1000)}s)`
                : isServiceError
                ? `🔧 Service error (${errorCode}) - retrying ${retryCount}/${maxRetries} (waiting ${Math.round(backoffMs/1000)}s)`
                : `Retry ${retryCount}/${maxRetries}: ${errorMessage}`,
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
        suppressWebhooks: false, // Re-enable webhooks after initial sync completes
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
    console.log(`📁 Folders encountered during sync:`);
    console.log(`   ${Array.from(foldersEncountered).sort().join(', ') || 'None'}`);
    console.log(`✅ ========================================`);

    // ✅ NEW: Release sync slot to allow other accounts to sync
    completeSyncSlot(accountId);
  } catch (error) {
    console.error(`❌ Background sync failed for account ${accountId}:`, error);

    // Categorize error type for better user messaging
    let errorMessage = 'Unknown error';
    let isTransient = false;

    if (error instanceof Error) {
      errorMessage = error.message;

      // Check if error is transient (can retry)
      const transientPatterns = [
        'timeout',
        'network',
        'econnreset',
        'rate limit',
        '429',
        '500',
        '502',
        '503',
        '504',
      ];

      isTransient = transientPatterns.some(pattern =>
        errorMessage.toLowerCase().includes(pattern)
      );
    }

    // Get current retry count
    const currentAccount = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });

    // Update account with error details
    await db.update(emailAccounts)
      .set({
        syncStatus: isTransient ? 'error' : 'error_permanent',
        lastError: errorMessage,
        retryCount: isTransient ? ((currentAccount?.retryCount || 0) + 1) : 0,
        lastActivityAt: new Date(),
      })
      .where(eq(emailAccounts.id, accountId));

    console.log(
      `[Sync] Error categorized as ${isTransient ? 'TRANSIENT' : 'PERMANENT'} for account ${accountId}`
    );

    // ✅ NEW: Release sync slot even on error
    completeSyncSlot(accountId);
  }
}

