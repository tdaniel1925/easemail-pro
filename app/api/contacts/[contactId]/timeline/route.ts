/**
 * Contact Communication Timeline API
 * Returns all non-email communications (SMS, calls, meetings, notes)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { contactCommunications, contactNotes } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

interface RouteContext {
  params: {
    contactId: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contactId = params.contactId;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // Filter by type
    const limit = parseInt(searchParams.get('limit') || '100');

    // Query filters
    const filters = [
      eq(contactCommunications.userId, user.id),
      eq(contactCommunications.contactId, contactId),
    ];

    if (type) {
      filters.push(eq(contactCommunications.type, type as any));
    }

    // Fetch communications
    const communications = await db.query.contactCommunications.findMany({
      where: and(...filters),
      orderBy: [desc(contactCommunications.occurredAt)],
      limit,
      with: {
        sms: true, // Include SMS details if available
      },
    });

    // Optionally include notes in timeline (marked separately)
    const notes = await db.query.contactNotes.findMany({
      where: and(
        eq(contactNotes.userId, user.id),
        eq(contactNotes.contactId, contactId)
      ),
      orderBy: [desc(contactNotes.createdAt)],
    });

    // Combine and sort by timestamp
    const timeline = [
      ...communications.map(comm => ({
        id: comm.id,
        type: comm.type,
        direction: comm.direction,
        body: comm.body,
        snippet: comm.snippet,
        status: comm.status,
        metadata: comm.metadata,
        occurredAt: comm.occurredAt,
        sms: comm.sms || null,
        itemType: 'communication',
      })),
      ...notes.map(note => ({
        id: note.id,
        type: 'note',
        body: note.noteText,
        isPinned: note.isPinned,
        occurredAt: note.createdAt,
        itemType: 'note',
      })),
    ].sort((a, b) => 
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    );

    return NextResponse.json({
      success: true,
      timeline,
      stats: {
        totalCommunications: communications.length,
        totalNotes: notes.length,
        byType: communications.reduce((acc, comm) => {
          acc[comm.type] = (acc[comm.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
    });

  } catch (error: any) {
    console.error('❌ Timeline fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timeline', details: error.message },
      { status: 500 }
    );
  }
}

