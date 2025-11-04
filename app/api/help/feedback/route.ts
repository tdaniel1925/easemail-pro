import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { articleId, helpful } = body;

    if (!articleId || typeof helpful !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Insert feedback
    await db.execute(sql`
      INSERT INTO help_feedback (article_id, user_id, helpful)
      VALUES (${articleId}, ${user.id}, ${helpful})
      ON CONFLICT (article_id, user_id) DO UPDATE SET helpful = ${helpful}
    `);

    // Update article stats
    const column = helpful ? 'helpful_count' : 'not_helpful_count';
    await db.execute(sql`
      INSERT INTO help_articles (article_id, title, category, ${sql.raw(column)})
      VALUES (${articleId}, '', '', 1)
      ON CONFLICT (article_id) DO UPDATE SET ${sql.raw(column)} = help_articles.${sql.raw(column)} + 1
    `);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error submitting help feedback:', error);
    return NextResponse.json({ 
      error: 'Failed to submit feedback',
      details: error.message 
    }, { status: 500 });
  }
}

