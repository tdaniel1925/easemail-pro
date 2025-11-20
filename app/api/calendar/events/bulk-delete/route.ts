/**
 * Bulk Delete Calendar Events API
 * DELETE - Delete multiple events at once (with 2-way sync to Google/Microsoft Calendar)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { calendarEvents, emailAccounts } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { createCalendarSyncService } from '@/lib/services/calendar-sync-service';

export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventIds } = await request.json();

    if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
      return NextResponse.json(
        { error: 'Event IDs array is required' },
        { status: 400 }
      );
    }

    // Validate max bulk delete limit (prevent abuse)
    if (eventIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 events can be deleted at once' },
        { status: 400 }
      );
    }

    // Fetch all events that belong to the user
    const eventsToDelete = await db.query.calendarEvents.findMany({
      where: and(
        eq(calendarEvents.userId, user.id),
        inArray(calendarEvents.id, eventIds)
      )
    });

    if (eventsToDelete.length === 0) {
      return NextResponse.json(
        { error: 'No events found to delete' },
        { status: 404 }
      );
    }

    const searchParams = new URL(request.url).searchParams;
    const skipSync = searchParams.get('skipSync') === 'true';

    // Track deletion results
    const deletionResults = {
      localDeleted: 0,
      remoteSyncSucceeded: 0,
      remoteSyncFailed: 0,
      errors: [] as string[],
    };

    // 2-WAY SYNC: Delete from Google/Microsoft Calendar via Nylas BEFORE deleting locally
    if (!skipSync) {
      // Get user's calendar accounts
      const accounts = await db.query.emailAccounts.findMany({
        where: eq(emailAccounts.userId, user.id),
      });

      // Group events by provider for efficient syncing
      const googleEvents = eventsToDelete.filter(e => e.googleEventId);
      const microsoftEvents = eventsToDelete.filter(e => e.microsoftEventId);

      // Sync Google Calendar deletions
      if (googleEvents.length > 0) {
        const googleAccount = accounts.find(acc =>
          acc.provider === 'google' &&
          acc.nylasGrantId &&
          acc.nylasScopes?.some((s: string) => s.toLowerCase().includes('calendar'))
        );

        if (googleAccount) {
          const syncService = createCalendarSyncService({
            accountId: googleAccount.id,
            userId: user.id,
            grantId: googleAccount.nylasGrantId!,
            provider: 'google',
          });

          for (const event of googleEvents) {
            try {
              const deleteResult = await syncService.deleteEvent(event.googleEventId!);

              if (deleteResult.success) {
                deletionResults.remoteSyncSucceeded++;
                console.log(`✅ Event deleted from Google calendar: ${event.googleEventId}`);
              } else {
                deletionResults.remoteSyncFailed++;
                deletionResults.errors.push(`Failed to delete ${event.title} from Google calendar: ${deleteResult.error}`);
                console.warn(`⚠️ Failed to delete event from Google calendar: ${deleteResult.error}`);
              }
            } catch (error: any) {
              deletionResults.remoteSyncFailed++;
              deletionResults.errors.push(`Error deleting ${event.title} from Google calendar: ${error.message}`);
              console.error('⚠️ Error deleting from Google calendar:', error);
            }
          }
        }
      }

      // Sync Microsoft Calendar deletions
      if (microsoftEvents.length > 0) {
        const microsoftAccount = accounts.find(acc =>
          acc.provider === 'microsoft' &&
          acc.nylasGrantId &&
          acc.nylasScopes?.some((s: string) => s.toLowerCase().includes('calendar'))
        );

        if (microsoftAccount) {
          const syncService = createCalendarSyncService({
            accountId: microsoftAccount.id,
            userId: user.id,
            grantId: microsoftAccount.nylasGrantId!,
            provider: 'microsoft',
          });

          for (const event of microsoftEvents) {
            try {
              const deleteResult = await syncService.deleteEvent(event.microsoftEventId!);

              if (deleteResult.success) {
                deletionResults.remoteSyncSucceeded++;
                console.log(`✅ Event deleted from Microsoft calendar: ${event.microsoftEventId}`);
              } else {
                deletionResults.remoteSyncFailed++;
                deletionResults.errors.push(`Failed to delete ${event.title} from Microsoft calendar: ${deleteResult.error}`);
                console.warn(`⚠️ Failed to delete event from Microsoft calendar: ${deleteResult.error}`);
              }
            } catch (error: any) {
              deletionResults.remoteSyncFailed++;
              deletionResults.errors.push(`Error deleting ${event.title} from Microsoft calendar: ${error.message}`);
              console.error('⚠️ Error deleting from Microsoft calendar:', error);
            }
          }
        }
      }
    }

    // Delete events locally
    const deleteResult = await db.delete(calendarEvents)
      .where(and(
        eq(calendarEvents.userId, user.id),
        inArray(calendarEvents.id, eventIds)
      ))
      .returning();

    deletionResults.localDeleted = deleteResult.length;

    console.log(`✅ Bulk deleted ${deletionResults.localDeleted} calendar events locally`);

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletionResults.localDeleted} event${deletionResults.localDeleted > 1 ? 's' : ''}`,
      results: {
        deletedCount: deletionResults.localDeleted,
        remoteSyncSucceeded: deletionResults.remoteSyncSucceeded,
        remoteSyncFailed: deletionResults.remoteSyncFailed,
        errors: deletionResults.errors.length > 0 ? deletionResults.errors : undefined,
      },
    });

  } catch (error: any) {
    console.error('❌ Bulk calendar event deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete events', details: error.message },
      { status: 500 }
    );
  }
}
