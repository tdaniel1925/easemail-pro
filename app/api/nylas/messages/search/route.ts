import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { emails } from '@/lib/db/schema';
import { eq, desc, or, ilike, sql } from 'drizzle-orm';

// GET: Search emails by query
export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get('accountId');
  const query = request.nextUrl.searchParams.get('query');
  const folder = request.nextUrl.searchParams.get('folder');
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
    
    // Determine which date field to sort by based on folder
    const isSentFolder = folder?.toLowerCase().includes('sent');
    const sortByDate = isSentFolder ? emails.sentAt : emails.receivedAt;
    
    // Build where clause with optional folder filter
    // Search in: subject, from (name/email), to (contacts), snippet, body, and AI summary
    const whereClause = folder 
      ? sql`${emails.accountId} = ${accountId} AND ${emails.folder} = ${folder} AND (
          ${emails.subject} ILIKE ${searchPattern} OR
          ${emails.fromEmail} ILIKE ${searchPattern} OR
          ${emails.fromName} ILIKE ${searchPattern} OR
          ${emails.snippet} ILIKE ${searchPattern} OR
          ${emails.bodyText} ILIKE ${searchPattern} OR
          ${emails.aiSummary} ILIKE ${searchPattern} OR
          ${emails.toEmails}::text ILIKE ${searchPattern}
        )`
      : sql`${emails.accountId} = ${accountId} AND (
          ${emails.subject} ILIKE ${searchPattern} OR
          ${emails.fromEmail} ILIKE ${searchPattern} OR
          ${emails.fromName} ILIKE ${searchPattern} OR
          ${emails.snippet} ILIKE ${searchPattern} OR
          ${emails.bodyText} ILIKE ${searchPattern} OR
          ${emails.aiSummary} ILIKE ${searchPattern} OR
          ${emails.toEmails}::text ILIKE ${searchPattern}
        )`;
    
    // Search in subject, from, to (contacts), snippet, body, and AI summary
    const messages = await db
      .select()
      .from(emails)
      .where(whereClause)
      .orderBy(desc(sortByDate))
      .limit(limit)
      .offset(offset);
    
    console.log(`🔍 Search found ${messages.length} emails for query: "${query}"`);
    console.log(`📅 Sorting by: ${isSentFolder ? 'sentAt' : 'receivedAt'}`);
    console.log(`🔎 Searched fields: subject, from (name/email), to (contacts), snippet, body, AI summary`);
    
    return NextResponse.json({ 
      success: true, 
      messages,
      count: messages.length,
      query: query.trim(),
      searchedFields: ['subject', 'fromEmail', 'fromName', 'toEmails', 'snippet', 'bodyText', 'aiSummary']
    });
  } catch (error) {
    console.error('Email search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

