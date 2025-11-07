import { NextRequest, NextResponse } from 'next/server';
import { nylas } from '@/lib/email/nylas-client';
import { db } from '@/lib/db/drizzle';
import { emailAccounts, emailFolders, syncLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { normalizeFolderToCanonical } from '@/lib/email/folder-utils';

// GET: Fetch folders for account
export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get('accountId');
  if (!accountId) {
    return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
  }
  
  try {
    // Get folders from database
    const foldersRaw = await db.query.emailFolders.findMany({
      where: eq(emailFolders.accountId, accountId),
      orderBy: (folders, { asc }) => [asc(folders.displayName)],
    });
    
    // Return folders as-is - counts will be calculated client-side if needed
    // Note: Live counts are expensive and not needed for folder display
    
    console.log('📥 GET /api/nylas/folders/sync - Returning folders:', foldersRaw.map(f => `${f.displayName} (${f.folderType})`));
    
    return NextResponse.json({ success: true, folders: foldersRaw });
  } catch (error) {
    console.error('Folder fetch error:', error);
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}

// POST: Sync folders from Nylas
export async function POST(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get('accountId');
  if (!accountId) {
    return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
  }
  
  try {
    // Get account
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });
    
    if (!account || !account.nylasGrantId) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    
    // Create sync log
    const [syncLog] = await db.insert(syncLogs).values({
      accountId: account.id,
      syncType: 'folder',
      status: 'started',
    }).returning();
    
    // Fetch ALL folders from Nylas with pagination
    console.log(`🔄 Starting folder sync for account ${accountId}`);
    let allFolders: any[] = [];
    let pageToken: string | undefined = undefined;
    let pageCount = 0;
    const maxPages = 20; // Support up to 1000 folders (50 per page × 20)
    
    do {
      pageCount++;
      console.log(`📄 Fetching folder page ${pageCount}...`);
      
      const queryParams: any = {
        limit: 50,
      };
      
      // Only add page_token if we have one (not on first request)
      if (pageToken) {
        queryParams.page_token = pageToken;
      }
      
      const response = await nylas.folders.list({
        identifier: account.nylasGrantId,
        queryParams: queryParams,
      });
      
      allFolders = allFolders.concat(response.data);
      pageToken = response.nextCursor;
      
      console.log(`  ✅ Fetched ${response.data.length} folders (Total so far: ${allFolders.length})`);
      
      if (!pageToken || pageCount >= maxPages) {
        break;
      }
    } while (true);
    
    console.log(`📁 Total folders fetched: ${allFolders.length}`);
    
    const nylasfolders = { data: allFolders };
    let syncedCount = 0;
    
    // Sync each folder to database
    for (const folder of nylasfolders.data) {
      try {
        // Check if folder exists
        const existing = await db.query.emailFolders.findFirst({
          where: (folders, { and, eq }) => and(
            eq(folders.accountId, account.id),
            eq(folders.nylasFolderId, folder.id)
          ),
        });

        // ✅ Use comprehensive normalization for folder type detection
        const normalizedType = normalizeFolderToCanonical(folder.name);

        // Determine folderType for database storage
        // If normalized type is same as lowercase folder name, it's a custom folder
        const folderType = ['inbox', 'sent', 'drafts', 'trash', 'spam', 'archive', 'all', 'important', 'starred', 'outbox', 'conversation_history', 'notes'].includes(normalizedType)
          ? normalizedType
          : 'custom';

        if (existing) {
          // Update existing folder (INCLUDING folderType to fix any that were miscategorized)
          // ✅ FIX: Don't save unreadCount/totalCount from Nylas - they're often stale
          // Counts are calculated in real-time from the emails table instead
          console.log(`  ✏️ Updating: ${folder.name} -> folderType: ${folderType}`);
          await db.update(emailFolders)
            .set({
              displayName: folder.name,
              folderType: folderType,  // Update type in case it changed
              lastSyncedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(emailFolders.id, existing.id));
        } else {
          // Insert new folder
          // ✅ FIX: Don't save unreadCount/totalCount from Nylas - they're often stale
          // Counts are calculated in real-time from the emails table instead
          console.log(`  ➕ Inserting: ${folder.name} -> folderType: ${folderType}`);
          await db.insert(emailFolders).values({
            accountId: account.id,
            nylasFolderId: folder.id,
            displayName: folder.name,
            folderType: folderType,
            providerAttributes: folder.attributes as any,
            unreadCount: 0, // Will be calculated in real-time
            totalCount: 0, // Will be calculated in real-time
            lastSyncedAt: new Date(),
          });
        }
        syncedCount++;
      } catch (folderError) {
        console.error('Error syncing folder:', folder.id, folderError);
      }
    }
    
    // Update sync log
    await db.update(syncLogs)
      .set({
        status: 'completed',
        messagesSynced: syncedCount,
        completedAt: new Date(),
      })
      .where(eq(syncLogs.id, syncLog.id));
    
    // Update account sync status
    await db.update(emailAccounts)
      .set({
        syncStatus: 'active',
        lastSyncedAt: new Date(),
      })
      .where(eq(emailAccounts.id, account.id));
    
    return NextResponse.json({ success: true, foldersSynced: syncedCount });
  } catch (error) {
    console.error('Folder sync error:', error);
    return NextResponse.json({ error: 'Sync failed', details: (error as Error).message }, { status: 500 });
  }
}

