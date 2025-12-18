/**
 * Nylas Webhook - Contacts
 * Handles real-time contact updates from Nylas
 * Note: contact.created webhook is NOT supported in Nylas v3
 * Only handles: contact.updated, contact.deleted
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { contacts, contactSyncStatus, emailAccounts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getNylasClient } from '@/lib/nylas-v3/config';
import { verifyWebhookSignature } from '@/lib/nylas-v3/webhooks';

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-nylas-signature') ||
                      request.headers.get('X-Nylas-Signature') || '';

    // Verify webhook signature using centralized, timing-safe verification
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error('[Contact Webhook] Invalid signature', {
        signatureLength: signature.length,
        payloadLength: rawBody.length,
      });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse webhook payload
    const payload = JSON.parse(rawBody);
    console.log('[Contact Webhook] Received:', payload.type);

    // Handle different webhook types
    const { type, data } = payload;

    // Handle contact notifications (only updated and deleted are supported in v3)
    if (type === 'contact.updated' || type === 'contact.deleted') {
      await handleContactWebhook(type, data);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Contact Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleContactWebhook(type: string, data: any) {
  try {
    const { grant_id, object } = data;

    if (!grant_id || !object) {
      console.error('[Contact Webhook] Missing grant_id or object');
      return;
    }

    // Find the account associated with this grant
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.nylasGrantId, grant_id),
    });

    if (!account) {
      console.error('[Contact Webhook] Account not found for grant:', grant_id);
      return;
    }

    const nylas = getNylasClient();

    // Handle contact based on type
    switch (type) {
      case 'contact.updated':
        // Fetch the full contact details from Nylas
        try {
          const contact = await nylas.contacts.find({
            identifier: grant_id,
            contactId: object.id,
            queryParams: {},
          });

          // Upsert contact to database
          await upsertContact(account.userId, grant_id, contact.data);
          console.log('[Contact Webhook] Contact synced:', object.id);
        } catch (error) {
          console.error('[Contact Webhook] Error fetching contact:', error);
        }
        break;

      case 'contact.deleted':
        // Delete contact from database
        await db.delete(contacts).where(
          and(
            eq(contacts.userId, account.userId),
            eq(contacts.providerContactId, object.id)
          )
        );
        console.log('[Contact Webhook] Contact deleted:', object.id);
        break;
    }

    // Update sync status
    await updateSyncStatus(account.userId, account.id, grant_id);
  } catch (error) {
    console.error('[Contact Webhook] Error handling contact:', error);
  }
}

async function upsertContact(userId: string, grantId: string, nylasContact: any) {
  try {
    // Get primary email
    const primaryEmail = nylasContact.emails?.find((e: any) => e.type === 'work' || e.type === 'personal')?.email
      || nylasContact.emails?.[0]?.email;

    const emailLower = primaryEmail ? primaryEmail.toLowerCase() : null;

    // Get primary phone
    const primaryPhone = nylasContact.phoneNumbers?.find((p: any) => p.type === 'work' || p.type === 'mobile')?.number
      || nylasContact.phoneNumbers?.[0]?.number;

    // Build full name
    const firstName = nylasContact.givenName || null;
    const lastName = nylasContact.surname || null;
    const fullName = firstName && lastName
      ? `${firstName} ${lastName}`
      : firstName || lastName || null;
    const displayName = fullName || (emailLower ? emailLower.split('@')[0] : 'Unknown');

    // Prepare contact data
    const contactData: any = {
      userId,
      email: emailLower,
      firstName,
      lastName,
      fullName,
      displayName,
      phone: primaryPhone,
      company: nylasContact.companyName || null,
      jobTitle: nylasContact.jobTitle || null,
      website: nylasContact.webPages?.[0]?.url || null,
      notes: nylasContact.notes ? nylasContact.notes.join('\n') : null,
      tags: nylasContact.groups?.map((g: any) => g.name || g.id) || [],
      provider: 'nylas',
      providerContactId: nylasContact.id,
    };

    // Check if contact exists by provider ID
    const existingContact = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.userId, userId),
        eq(contacts.providerContactId, nylasContact.id)
      ),
    });

    if (existingContact) {
      // Update existing contact
      await db.update(contacts)
        .set({
          ...contactData,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(contacts.userId, userId),
            eq(contacts.providerContactId, nylasContact.id)
          )
        );
    } else {
      // Insert new contact (this can happen if webhook fires before initial sync completes)
      await db.insert(contacts).values({
        ...contactData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  } catch (error) {
    console.error('[Contact Webhook] Error upserting contact:', error);
    throw error;
  }
}

async function updateSyncStatus(userId: string, accountId: string, grantId: string) {
  try {
    const syncStatus = await db.query.contactSyncStatus.findFirst({
      where: and(
        eq(contactSyncStatus.userId, userId),
        eq(contactSyncStatus.emailAccountId, accountId)
      ),
    });

    if (syncStatus) {
      await db.update(contactSyncStatus)
        .set({
          lastSyncAt: new Date(),
          lastSuccessfulSyncAt: new Date(),
          syncStatus: 'idle',
          updatedAt: new Date(),
        })
        .where(eq(contactSyncStatus.id, syncStatus.id));
    } else {
      // Create new sync status
      await db.insert(contactSyncStatus).values({
        userId,
        emailAccountId: accountId,
        provider: 'nylas',
        nylasGrantId: grantId,
        lastSyncAt: new Date(),
        lastSuccessfulSyncAt: new Date(),
        syncStatus: 'idle',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  } catch (error) {
    console.error('[Contact Webhook] Error updating sync status:', error);
  }
}

// Handle webhook verification (for initial setup)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('challenge');

  if (challenge) {
    // Nylas webhook verification
    return new NextResponse(challenge, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  return NextResponse.json({ status: 'ok' });
}
