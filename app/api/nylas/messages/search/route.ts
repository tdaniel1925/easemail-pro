import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { emails } from '@/lib/db/schema';
import { eq, desc, or, ilike, sql } from 'drizzle-orm';

// GET: Search emails by query
export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get('accountId');
  const query = request.nextUrl.searchParams.get('query');
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '100');
  const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');
  
  if (!accountId) {
    return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
  }
  
  if (!query || query.trim() === '') {
    return NextResponse.json({ success: true, messages: [] });
  }
  
  try {
    const searchPattern = `%${query.trim()}%`;
    
    // Search in subject, from_email, from_name, snippet, and body_text
    const messages = await db
      .select()
      .from(emails)
      .where(
        sql`${emails.accountId} = ${accountId} AND (
          ${emails.subject} ILIKE ${searchPattern} OR
          ${emails.fromEmail} ILIKE ${searchPattern} OR
          ${emails.fromName} ILIKE ${searchPattern} OR
          ${emails.snippet} ILIKE ${searchPattern} OR
          ${emails.bodyText} ILIKE ${searchPattern}
        )`
      )
      .orderBy(desc(emails.receivedAt))
      .limit(limit)
      .offset(offset);
    
    return NextResponse.json({ 
      success: true, 
      messages,
      count: messages.length,
      query: query.trim()
    });
  } catch (error) {
    console.error('Email search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

