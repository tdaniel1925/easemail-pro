/**
 * SMS Inbox API
 * Fetches all inbound SMS messages for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { smsMessages, contacts } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch all inbound SMS messages for this user
    const messages = await db
      .select({
        id: smsMessages.id,
        fromPhone: smsMessages.fromPhone,
        toPhone: smsMessages.toPhone,
        messageBody: smsMessages.messageBody,
        sentAt: smsMessages.sentAt,
        deliveredAt: smsMessages.deliveredAt,
        twilioStatus: smsMessages.twilioStatus,
        isRead: smsMessages.isRead,
        createdAt: smsMessages.createdAt,
        // Contact info
        contactId: smsMessages.contactId,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
        contactEmail: contacts.email,
        contactPhone: contacts.phone,
      })
      .from(smsMessages)
      .leftJoin(contacts, eq(smsMessages.contactId, contacts.id))
      .where(
        and(
          eq(smsMessages.userId, user.id),
          eq(smsMessages.direction, 'inbound')
        )
      )
      .orderBy(desc(smsMessages.sentAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const totalResult = await db
      .select({ count: smsMessages.id })
      .from(smsMessages)
      .where(
        and(
          eq(smsMessages.userId, user.id),
          eq(smsMessages.direction, 'inbound')
        )
      );

    const total = totalResult.length;

    // Format messages
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      from: msg.fromPhone,
      to: msg.toPhone,
      body: msg.messageBody,
      receivedAt: msg.sentAt,
      message: msg.messageBody,
      sentAt: msg.sentAt,
      deliveredAt: msg.deliveredAt,
      status: msg.twilioStatus,
      isRead: msg.isRead ?? false,
      contact: msg.contactId ? {
        id: msg.contactId,
        name: msg.contactFirstName && msg.contactLastName
          ? `${msg.contactFirstName} ${msg.contactLastName}`
          : msg.contactFirstName || msg.contactLastName || msg.contactEmail || 'Unknown',
        email: msg.contactEmail,
        phone: msg.contactPhone,
      } : null,
    }));

    return NextResponse.json({
      success: true,
      messages: formattedMessages,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });

  } catch (error: any) {
    console.error('❌ SMS inbox fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SMS messages', details: error.message },
      { status: 500 }
    );
  }
}

