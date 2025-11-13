/**
 * Cron Job: Sync Calendars
 * Runs every 30 minutes to sync calendar metadata and events for all accounts
 *
 * This handles:
 * 1. Initial sync for new accounts
 * 2. Periodic refresh of calendar list (in case calendars are added/removed)
 * 3. Fallback for webhook failures
 *
 * Note: Real-time event changes are handled by webhooks at /api/webhooks/nylas/calendar
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { calendars, calendarEvents, emailAccounts } from '@/lib/db/schema';
import { eq, and, or, isNull, lt } from 'drizzle-orm';
import { getNylasClient } from '@/lib/nylas-v3/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('❌ Unauthorized cron job access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📅 Starting calendar sync cron job...');

    // Find accounts that need calendar sync
    // Criteria: accounts that have never synced OR last synced > 30 minutes ago
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const accountsToSync = await db.query.emailAccounts.findMany({
      where: and(
        eq(emailAccounts.isActive, true),
        or(
          isNull(emailAccounts.lastCalendarSyncAt),
          lt(emailAccounts.lastCalendarSyncAt, thirtyMinutesAgo)
        )
      ),
      columns: {
        id: true,
        userId: true,
        emailAddress: true,
        nylasGrantId: true,
        lastCalendarSyncAt: true,
      },
      limit: 50, // Process max 50 accounts per run
    });

    if (accountsToSync.length === 0) {
      console.log('✅ No accounts need calendar sync');
      return NextResponse.json({
        success: true,
        message: 'No accounts need sync',
        synced: 0,
        duration: Date.now() - startTime,
      });
    }

    console.log(`🔄 Syncing calendars for ${accountsToSync.length} account(s)...`);

    const nylas = getNylasClient();
    const results = {
      successful: 0,
      failed: 0,
      calendarsAdded: 0,
      eventsAdded: 0,
      errors: [] as any[],
    };

    // Sync each account
    for (const account of accountsToSync) {
      try {
        if (!account.nylasGrantId) {
          console.log(`⚠️ Skipping ${account.emailAddress}: No grant ID`);
          continue;
        }

        console.log(`  📥 Syncing ${account.emailAddress || account.id}...`);

        // Fetch calendars from Nylas
        const calendarsResponse = await nylas.calendars.list({
          identifier: account.nylasGrantId,
          queryParams: {
            limit: 50,
          },
        });

        // Sync each calendar
        for (const nylasCalendar of calendarsResponse.data) {
          // Upsert calendar metadata
          const existingCalendar = await db.query.calendars.findFirst({
            where: and(
              eq(calendars.userId, account.userId),
              eq(calendars.providerCalendarId, nylasCalendar.id)
            ),
          });

          const calendarData = {
            userId: account.userId,
            emailAccountId: account.id,
            provider: 'nylas',
            providerCalendarId: nylasCalendar.id,
            nylasGrantId: account.nylasGrantId,
            name: nylasCalendar.name || 'Untitled Calendar',
            description: nylasCalendar.description || null,
            timezone: nylasCalendar.timezone || 'UTC',
            color: nylasCalendar.hexColor || 'blue',
            isVisible: true,
            isPrimary: nylasCalendar.isPrimary || false,
            isReadOnly: nylasCalendar.readOnly || false,
            isOwned: nylasCalendar.isOwnedByUser || false,
            syncEnabled: true,
            lastSyncedAt: new Date(),
            syncStatus: 'idle',
            providerData: nylasCalendar.metadata || {},
            updatedAt: new Date(),
          };

          if (existingCalendar) {
            await db.update(calendars)
              .set(calendarData)
              .where(eq(calendars.id, existingCalendar.id));
          } else {
            await db.insert(calendars).values({
              ...calendarData,
              createdAt: new Date(),
            });
            results.calendarsAdded++;
          }

          // Fetch recent events for this calendar (last 30 days, next 90 days)
          const now = Math.floor(Date.now() / 1000);
          const thirtyDaysAgo = now - (30 * 24 * 60 * 60);
          const ninetyDaysFromNow = now + (90 * 24 * 60 * 60);

          const eventsResponse = await nylas.events.list({
            identifier: account.nylasGrantId,
            queryParams: {
              calendarId: nylasCalendar.id,
              start: String(thirtyDaysAgo),
              end: String(ninetyDaysFromNow),
              limit: 100,
            },
          });

          // Upsert events
          for (const event of eventsResponse.data) {
            await upsertCalendarEvent(account.userId, nylasCalendar.id, event);
            results.eventsAdded++;
          }
        }

        // Update account's last calendar sync time
        await db.update(emailAccounts)
          .set({
            lastCalendarSyncAt: new Date(),
          })
          .where(eq(emailAccounts.id, account.id));

        results.successful++;
        console.log(`  ✅ Synced ${account.emailAddress || account.id}`);
      } catch (error) {
        console.error(`  ❌ Failed to sync ${account.emailAddress || account.id}:`, error);
        results.failed++;
        results.errors.push({
          accountId: account.id,
          emailAddress: account.emailAddress,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const duration = Date.now() - startTime;

    console.log(`✅ Calendar sync complete:`);
    console.log(`   - Accounts synced: ${results.successful}/${accountsToSync.length}`);
    console.log(`   - Calendars added: ${results.calendarsAdded}`);
    console.log(`   - Events added: ${results.eventsAdded}`);
    console.log(`   - Failed: ${results.failed}`);
    console.log(`   - Duration: ${duration}ms`);

    return NextResponse.json({
      success: true,
      message: `Synced ${results.successful}/${accountsToSync.length} accounts`,
      ...results,
      duration,
    });
  } catch (error) {
    console.error('❌ Calendar sync cron job failed:', error);

    return NextResponse.json({
      error: 'Cron job failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    }, { status: 500 });
  }
}

async function upsertCalendarEvent(userId: string, calendarId: string, event: any) {
  try {
    const eventData: any = {
      id: event.id,
      userId: userId,
      calendarId: calendarId,
      title: event.title || 'Untitled Event',
      description: event.description || null,
      location: event.location || null,
      status: event.status || 'confirmed',
      busy: event.busy ?? true,
      metadata: {
        nylasEventId: event.id,
        participants: event.participants || [],
        conferencing: event.conferencing,
        reminders: event.reminders,
      },
    };

    // Handle event timing
    if (event.when) {
      if (event.when.start_time) {
        eventData.startTime = new Date(event.when.start_time * 1000);
      }
      if (event.when.end_time) {
        eventData.endTime = new Date(event.when.end_time * 1000);
      }
      if (event.when.date) {
        eventData.startTime = new Date(event.when.date);
        eventData.endTime = new Date(event.when.date);
        eventData.isAllDay = true;
      }
    }

    // Check if event exists
    const existingEvent = await db.query.calendarEvents.findFirst({
      where: and(
        eq(calendarEvents.id, event.id),
        eq(calendarEvents.userId, userId)
      ),
    });

    if (existingEvent) {
      await db.update(calendarEvents)
        .set({
          ...eventData,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(calendarEvents.id, event.id),
            eq(calendarEvents.userId, userId)
          )
        );
    } else {
      await db.insert(calendarEvents).values({
        ...eventData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  } catch (error) {
    console.error('[Calendar Sync] Error upserting event:', error);
  }
}
