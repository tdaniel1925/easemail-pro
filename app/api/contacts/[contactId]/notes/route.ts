/**
 * Contact Notes API Endpoints
 * CRUD operations for timestamped contact notes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { contactNotes } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    contactId: string;
  };
}

// GET: Fetch all notes for a contact
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contactId = params.contactId;

    const notes = await db.query.contactNotes.findMany({
      where: and(
        eq(contactNotes.userId, user.id),
        eq(contactNotes.contactId, contactId)
      ),
      orderBy: [desc(contactNotes.createdAt)],
    });

    return NextResponse.json({ success: true, notes });

  } catch (error: any) {
    console.error('❌ Fetch notes error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes', details: error.message },
      { status: 500 }
    );
  }
}

// POST: Create a new note
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contactId = params.contactId;
    const body = await request.json();
    const { noteText, isPinned = false } = body;

    if (!noteText || noteText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Note text is required' },
        { status: 400 }
      );
    }

    const [note] = await db.insert(contactNotes).values({
      userId: user.id,
      contactId,
      noteText: noteText.trim(),
      isPinned,
    }).returning();

    return NextResponse.json({
      success: true,
      message: 'Note created successfully',
      note,
    });

  } catch (error: any) {
    console.error('❌ Create note error:', error);
    return NextResponse.json(
      { error: 'Failed to create note', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH: Update a note
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { noteId, noteText, isPinned } = body;

    if (!noteId) {
      return NextResponse.json(
        { error: 'Note ID is required' },
        { status: 400 }
      );
    }

    const updates: any = { updatedAt: new Date() };
    if (noteText !== undefined) updates.noteText = noteText.trim();
    if (isPinned !== undefined) updates.isPinned = isPinned;

    const [updatedNote] = await db.update(contactNotes)
      .set(updates)
      .where(and(
        eq(contactNotes.id, noteId),
        eq(contactNotes.userId, user.id)
      ))
      .returning();

    if (!updatedNote) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Note updated successfully',
      note: updatedNote,
    });

  } catch (error: any) {
    console.error('❌ Update note error:', error);
    return NextResponse.json(
      { error: 'Failed to update note', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Delete a note
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('noteId');

    if (!noteId) {
      return NextResponse.json(
        { error: 'Note ID is required' },
        { status: 400 }
      );
    }

    const result = await db.delete(contactNotes)
      .where(and(
        eq(contactNotes.id, noteId),
        eq(contactNotes.userId, user.id)
      ))
      .returning();

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Note deleted successfully',
    });

  } catch (error: any) {
    console.error('❌ Delete note error:', error);
    return NextResponse.json(
      { error: 'Failed to delete note', details: error.message },
      { status: 500 }
    );
  }
}

