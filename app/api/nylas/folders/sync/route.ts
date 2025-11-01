import { NextRequest, NextResponse } from 'next/server';
import { nylas } from '@/lib/email/nylas-client';
import { db } from '@/lib/db/drizzle';
import { emailAccounts, emailFolders, syncLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET: Fetch folders for account
export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get('accountId');
  if (!accountId) {
    return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
  }
  
  try {
    // Get folders from database WITH live email counts
    const foldersRaw = await db.query.emailFolders.findMany({
      where: eq(emailFolders.accountId, accountId),
      orderBy: (folders, { asc }) => [asc(folders.displayName)],
    });
    
    // Calculate LIVE email counts from emails table (not stale totalCount)
    const { emails } = await import('@/lib/db/schema');
    const { count, sql } = await import('drizzle-orm');
    
    const foldersWithLiveCounts = await Promise.all(
      foldersRaw.map(async (folder) => {
        const result = await db
          .select({ count: count() })
          .from(emails)
          .where(eq(emails.folderId, folder.id));
        
        return {
          ...folder,
          emailCount: result[0]?.count || 0, // Live count from actual emails in DB
        };
      })
    );
    
    console.log('📥 GET /api/nylas/folders/sync - Returning folders with live counts:', foldersWithLiveCounts.map(f => `${f.displayName} (${f.emailCount} emails)`));
    
    return NextResponse.json({ success: true, folders: foldersWithLiveCounts });
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

        // Detect folder type from name (for both new and existing folders)
        const folderName = folder.name.toLowerCase();
        let folderType = 'custom';
        
        // Map common folder names to types
        if (folderName === 'inbox' || folderName === 'posteingang') {
          folderType = 'inbox';
        } else if (folderName.includes('sent') || folderName === 'gesendete elemente') {
          folderType = 'sent';
        } else if (folderName.includes('draft') || folderName === 'entwürfe') {
          folderType = 'drafts';
        } else if (folderName.includes('trash') || folderName.includes('deleted') || folderName === 'gelöschte elemente') {
          folderType = 'trash';
        } else if (folderName.includes('spam') || folderName.includes('junk')) {
          folderType = 'spam';
        } else if (folderName.includes('archive') || folderName === 'archiv') {
          folderType = 'archive';
        } else if (folderName.includes('starred') || folderName.includes('flagged')) {
          folderType = 'starred';
        }

        if (existing) {
          // Update existing folder (INCLUDING folderType to fix any that were miscategorized)
          console.log(`  ✏️ Updating: ${folder.name} -> folderType: ${folderType}`);
          await db.update(emailFolders)
            .set({
              displayName: folder.name,
              folderType: folderType,  // Update type in case it changed
              unreadCount: (folder as any).unreadCount || 0,
              totalCount: (folder as any).totalCount || 0,
              lastSyncedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(emailFolders.id, existing.id));
        } else {
          // Insert new folder
          console.log(`  ➕ Inserting: ${folder.name} -> folderType: ${folderType}`);
          await db.insert(emailFolders).values({
            accountId: account.id,
            nylasFolderId: folder.id,
            displayName: folder.name,
            folderType: folderType,
            providerAttributes: folder.attributes as any,
            unreadCount: (folder as any).unreadCount || 0,
            totalCount: (folder as any).totalCount || 0,
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

