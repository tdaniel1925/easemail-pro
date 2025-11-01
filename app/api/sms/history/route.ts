/**
 * SMS History API Endpoint
 * Returns SMS messages with filters and pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { smsMessages } from '@/lib/db/schema';
import { eq, desc, and, gte, lte, or, like } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const direction = searchParams.get('direction');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Build query filters
    const filters = [eq(smsMessages.userId, user.id)];

    if (contactId) {
      filters.push(eq(smsMessages.contactId, contactId));
    }

    if (startDate) {
      filters.push(gte(smsMessages.sentAt, new Date(startDate)));
    }

    if (endDate) {
      filters.push(lte(smsMessages.sentAt, new Date(endDate)));
    }

    if (status) {
      filters.push(eq(smsMessages.twilioStatus, status));
    }

    if (direction) {
      filters.push(eq(smsMessages.direction, direction as 'inbound' | 'outbound'));
    }

    // Query messages
    const messages = await db.query.smsMessages.findMany({
      where: and(...filters),
      orderBy: [desc(smsMessages.sentAt)],
      limit: limit,
      offset: offset,
      with: {
        contact: true,
      },
    });

    // Get total count for pagination
    const totalMessages = await db.select({ count: smsMessages.id })
      .from(smsMessages)
      .where(and(...filters));

    return NextResponse.json({
      success: true,
      messages,
      pagination: {
        page,
        limit,
        total: totalMessages.length,
        pages: Math.ceil(totalMessages.length / limit),
      },
    });

  } catch (error: any) {
    console.error('❌ SMS history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SMS history', details: error.message },
      { status: 500 }
    );
  }
}

