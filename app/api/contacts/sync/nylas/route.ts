import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { contacts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import Nylas from 'nylas';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Increase timeout for syncing many contacts

// Helper to send SSE (Server-Sent Events) progress updates
function sendProgress(encoder: TextEncoder, controller: ReadableStreamDefaultController, data: any) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(encoder.encode(message));
}

/**
 * Sync contacts from Nylas (Gmail/Outlook/etc) to local database with streaming progress
 * POST /api/contacts/sync/nylas?stream=true - Streaming mode (SSE)
 * POST /api/contacts/sync/nylas - Legacy mode (full response at end)
 * Body: { grantId: string, accountName?: string }
 */
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const isStreaming = searchParams.get('stream') === 'true';

  if (isStreaming) {
    return streamingSync(request);
  } else {
    return legacySync(request);
  }
}

// Streaming sync with real-time progress updates
async function streamingSync(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          sendProgress(encoder, controller, { type: 'error', error: 'Unauthorized' });
          controller.close();
          return;
        }

        const body = await request.json();
        const { grantId, accountName } = body;

        if (!grantId) {
          sendProgress(encoder, controller, { type: 'error', error: 'Grant ID is required' });
          controller.close();
          return;
        }

        console.log('🔄 Starting streaming contact sync for grant:', grantId);

        // Send initial status
        sendProgress(encoder, controller, {
          type: 'start',
          accountName: accountName || 'Email Account',
          status: 'Connecting to email provider...'
        });

        // Initialize Nylas client
        const nylas = new Nylas({
          apiKey: process.env.NYLAS_API_KEY!,
          apiUri: process.env.NYLAS_API_URI || 'https://api.us.nylas.com',
        });

        // Fetch contacts from Nylas with progress
        let allNylasContacts: any[] = [];
        let pageToken: string | undefined = undefined;
        let hasMore = true;

        sendProgress(encoder, controller, {
          type: 'fetching',
          status: 'Fetching contacts from provider...'
        });

        while (hasMore) {
          const response = await nylas.contacts.list({
            identifier: grantId,
            queryParams: {
              limit: 50,
              ...(pageToken && { pageToken }),
            },
          });

          allNylasContacts = allNylasContacts.concat(response.data);
          hasMore = !!response.nextCursor;
          pageToken = response.nextCursor;

          sendProgress(encoder, controller, {
            type: 'fetching',
            total: allNylasContacts.length,
            status: `Fetched ${allNylasContacts.length} contacts...`
          });
        }

        const totalContacts = allNylasContacts.length;
        console.log(`✅ Retrieved ${totalContacts} contacts from Nylas`);

        sendProgress(encoder, controller, {
          type: 'processing',
          total: totalContacts,
          current: 0,
          percentage: 0,
          status: `Processing ${totalContacts} contacts...`
        });

        // Process and insert contacts
        let imported = 0;
        let skipped = 0;
        let errors = 0;

        for (let i = 0; i < allNylasContacts.length; i++) {
          const nylasContact = allNylasContacts[i];

          try {
            // Get primary email
            const primaryEmail = nylasContact.emails?.find((e: any) => e.type === 'work' || e.type === 'personal')?.email
              || nylasContact.emails?.[0]?.email;

            // Get primary phone
            const primaryPhone = nylasContact.phoneNumbers?.find((p: any) => p.type === 'work' || p.type === 'mobile')?.number
              || nylasContact.phoneNumbers?.[0]?.number;

            // Skip contacts without both email AND phone (at least one is required)
            if (!primaryEmail && !primaryPhone) {
              skipped++;
              continue;
            }

            const emailLower = primaryEmail ? primaryEmail.toLowerCase() : null;

            // Check if contact already exists
            const existingByProvider = await db.query.contacts.findFirst({
              where: and(
                eq(contacts.userId, user.id),
                eq(contacts.providerContactId, nylasContact.id)
              ),
            });

            const existingByEmail = !existingByProvider && emailLower ? await db.query.contacts.findFirst({
              where: and(
                eq(contacts.userId, user.id),
                eq(contacts.email, emailLower)
              ),
            }) : null;

            const existing = existingByProvider || existingByEmail;

            if (existing) {
              skipped++;
            } else {
              // Get contact details
              const company = nylasContact.companyName || null;
              const jobTitle = nylasContact.jobTitle || null;
              const firstName = nylasContact.givenName || null;
              const lastName = nylasContact.surname || null;
              const fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || null;
              const displayName = fullName ||
                (emailLower ? emailLower.split('@')[0] : null) ||
                (primaryPhone ? `Contact ${primaryPhone}` : 'Unknown Contact');
              const website = nylasContact.webPages?.[0]?.url || null;
              const notes = nylasContact.notes ? nylasContact.notes.join('\n') : null;
              const tags = nylasContact.groups?.map((g: any) => g.name || g.id) || [];

              // Insert contact
              await db.insert(contacts).values({
                userId: user.id,
                email: emailLower,
                firstName,
                lastName,
                fullName,
                displayName,
                phone: primaryPhone,
                company,
                jobTitle,
                website,
                notes,
                tags,
                provider: 'nylas',
                providerContactId: nylasContact.id,
              });

              imported++;
            }
          } catch (error: any) {
            console.error('Error importing contact:', error);
            errors++;
          }

          // Send progress update every contact
          const current = i + 1;
          const percentage = Math.round((current / totalContacts) * 100);

          sendProgress(encoder, controller, {
            type: 'progress',
            total: totalContacts,
            current,
            percentage,
            imported,
            skipped,
            errors,
            status: `Syncing: ${current} / ${totalContacts} (${percentage}%)`
          });
        }

        // Send completion
        console.log(`✅ Sync complete: ${imported} imported, ${skipped} skipped, ${errors} errors`);

        sendProgress(encoder, controller, {
          type: 'complete',
          total: totalContacts,
          imported,
          skipped,
          errors,
          percentage: 100,
          status: 'Sync complete!'
        });

        controller.close();

      } catch (error: any) {
        console.error('❌ Streaming sync error:', error);
        sendProgress(encoder, controller, {
          type: 'error',
          error: error.message || 'Failed to sync contacts'
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Legacy sync (original behavior)
async function legacySync(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { grantId } = await request.json();

    if (!grantId) {
      console.error('❌ No grant ID provided in request');
      return NextResponse.json(
        { error: 'Grant ID is required' },
        { status: 400 }
      );
    }

    console.log('🔄 Starting Nylas contact sync for grant:', grantId);

    // Initialize Nylas client
    const nylas = new Nylas({
      apiKey: process.env.NYLAS_API_KEY!,
      apiUri: process.env.NYLAS_API_URI || 'https://api.us.nylas.com',
    });

    // Fetch contacts from Nylas
    let allNylasContacts: any[] = [];
    let pageToken: string | undefined = undefined;
    let hasMore = true;

    while (hasMore) {
      const response = await nylas.contacts.list({
        identifier: grantId,
        queryParams: {
          limit: 50,
          ...(pageToken && { pageToken }),
        },
      });

      allNylasContacts = allNylasContacts.concat(response.data);
      hasMore = !!response.nextCursor;
      pageToken = response.nextCursor;

      console.log(`📥 Fetched ${response.data.length} contacts (total: ${allNylasContacts.length})`);
    }

    console.log(`✅ Retrieved ${allNylasContacts.length} contacts from Nylas`);

    // Process and insert contacts
    const imported = [];
    const skipped = [];
    const errors = [];

    for (const nylasContact of allNylasContacts) {
      try {
        const primaryEmail = nylasContact.emails?.find((e: any) => e.type === 'work' || e.type === 'personal')?.email
          || nylasContact.emails?.[0]?.email;

        const primaryPhone = nylasContact.phoneNumbers?.find((p: any) => p.type === 'work' || p.type === 'mobile')?.number
          || nylasContact.phoneNumbers?.[0]?.number;

        // Skip contacts without both email AND phone (at least one is required)
        if (!primaryEmail && !primaryPhone) {
          skipped.push({ contact: nylasContact, reason: 'No email or phone' });
          continue;
        }

        const emailLower = primaryEmail ? primaryEmail.toLowerCase() : null;

        const existingByProvider = await db.query.contacts.findFirst({
          where: and(
            eq(contacts.userId, user.id),
            eq(contacts.providerContactId, nylasContact.id)
          ),
        });

        const existingByEmail = !existingByProvider && emailLower ? await db.query.contacts.findFirst({
          where: and(
            eq(contacts.userId, user.id),
            eq(contacts.email, emailLower)
          ),
        }) : null;

        const existing = existingByProvider || existingByEmail;

        if (existing) {
          skipped.push({ contact: nylasContact, reason: 'Already exists', existingId: existing.id });
          continue;
        }

        const company = nylasContact.companyName || null;
        const jobTitle = nylasContact.jobTitle || null;
        const firstName = nylasContact.givenName || null;
        const lastName = nylasContact.surname || null;
        const fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || null;
        const displayName = fullName ||
          (emailLower ? emailLower.split('@')[0] : null) ||
          (primaryPhone ? `Contact ${primaryPhone}` : 'Unknown Contact');
        const website = nylasContact.webPages?.[0]?.url || null;
        const notes = nylasContact.notes ? nylasContact.notes.join('\n') : null;
        const tags = nylasContact.groups?.map((g: any) => g.name || g.id) || [];

        const newContact = await db.insert(contacts).values({
          userId: user.id,
          email: emailLower,
          firstName,
          lastName,
          fullName,
          displayName,
          phone: primaryPhone,
          company,
          jobTitle,
          website,
          notes,
          tags,
          provider: 'nylas',
          providerContactId: nylasContact.id,
        }).returning();

        imported.push(newContact[0]);
      } catch (error: any) {
        console.error('Error importing contact:', error);
        errors.push({
          contact: nylasContact,
          error: error.message || 'Unknown error'
        });
      }
    }

    console.log(`✅ Sync complete: ${imported.length} imported, ${skipped.length} skipped, ${errors.length} errors`);

    return NextResponse.json({
      success: true,
      total: allNylasContacts.length,
      imported: imported.length,
      skipped: skipped.length,
      errors: errors.length,
      details: {
        importedContacts: imported,
        skippedReasons: skipped.slice(0, 10),
        errorDetails: errors.slice(0, 10),
      },
    });
  } catch (error: any) {
    console.error('❌ Nylas contact sync error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync contacts from Nylas',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * Get sync status for an account
 * GET /api/contacts/sync/nylas?grantId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const grantId = searchParams.get('grantId');

    if (!grantId) {
      return NextResponse.json(
        { error: 'Grant ID is required' },
        { status: 400 }
      );
    }

    // Count synced contacts for this grant
    const syncedContacts = await db.query.contacts.findMany({
      where: and(
        eq(contacts.userId, user.id),
        eq(contacts.provider, 'nylas')
      ),
    });

    return NextResponse.json({
      success: true,
      grantId,
      syncedCount: syncedContacts.length,
      lastSync: syncedContacts.length > 0
        ? Math.max(...syncedContacts.map(c => new Date(c.updatedAt).getTime()))
        : null,
    });
  } catch (error: any) {
    console.error('❌ Get sync status error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}
