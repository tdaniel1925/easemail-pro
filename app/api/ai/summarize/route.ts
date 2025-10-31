/**
 * AI Email Summary API
 * POST /api/ai/summarize
 * Generates a concise summary of an email using OpenAI
 * SAVES TO DATABASE for permanent caching
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { db } from '@/lib/db/drizzle';
import { emails } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface SummaryRequest {
  emailId: string;
  subject?: string;
  snippet?: string;
  fromName?: string;
  bodyText?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { emailId, subject, snippet, fromName, bodyText }: SummaryRequest = await request.json();

    // Log the request for debugging
    console.log('📨 Summarize request:', { emailId, hasSubject: !!subject, hasSnippet: !!snippet, hasBody: !!bodyText });

    // Validate input - need at least emailId and some content
    if (!emailId) {
      console.error('❌ Missing emailId');
      return NextResponse.json(
        { error: 'Missing emailId' },
        { status: 400 }
      );
    }

    // 🔥 CHECK DATABASE FIRST - One-time generation!
    const existingEmail = await db.query.emails.findFirst({
      where: eq(emails.id, emailId),
      columns: { aiSummary: true },
    });

    if (existingEmail?.aiSummary) {
      console.log(`✅ Using cached summary from database for ${emailId}`);
      return NextResponse.json({
        emailId,
        summary: existingEmail.aiSummary,
        cached: true, // From database!
        tokens: 0, // No OpenAI cost
      });
    }

    // Use snippet, bodyText, or subject as content (in order of preference)
    const content = snippet || bodyText?.substring(0, 1000) || subject || '';
    
    if (!content) {
      console.warn('⚠️ No content available for email:', emailId);
      return NextResponse.json({
        emailId,
        summary: '(No content available)',
        cached: false,
      });
    }

    // Check if OpenAI key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ OpenAI API key not configured, returning snippet as summary');
      return NextResponse.json({
        emailId,
        summary: content,
        keyPoints: [],
        cached: false,
      });
    }
    
    console.log(`🤖 Generating NEW AI summary for email: ${emailId}`);

    // Generate summary using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a helpful personal assistant summarizing emails for your boss.
          
Rules:
- Write like you're talking to a friend - casual and natural
- ONE sentence only (max 20 words)
- Use simple, plain English (no corporate jargon)
- Focus on what matters: WHO wants WHAT
- Be conversational and friendly

Examples:
- "Roger wants to know if you want seafood tonight?"
- "Sarah needs you to approve the Q4 budget by Friday"
- "Your doctor appointment is confirmed for Thursday at 3pm"
- "John sent the report you asked for, it's attached"
- "Netflix subscription payment of $15.99 went through"
- "Server maintenance tonight 11pm-2am, nothing you need to do"
- "Mom sent photos from the wedding"

BAD Examples (too formal):
- "Approval required for Q4 financial budget allocation" ❌
- "Payment confirmation: Invoice #1234 processed" ❌
- "Meeting invitation: Q4 Planning Discussion" ❌`
        },
        {
          role: 'user',
          content: `Summarize this email like you're my assistant telling me about it:

From: ${fromName || 'Unknown'}
Subject: ${subject}

${content}`
        }
      ],
      temperature: 0.5,
      max_tokens: 60,
    });

    const summary = completion.choices[0]?.message?.content?.trim() || snippet;

    // 🔥 SAVE TO DATABASE - Never generate again!
    try {
      await db.update(emails)
        .set({
          aiSummary: summary,
          updatedAt: new Date(),
        })
        .where(eq(emails.id, emailId));
      
      console.log(`💾 Summary saved to database for ${emailId}`);
    } catch (dbError) {
      console.error('⚠️ Failed to save summary to database:', dbError);
      // Continue anyway - at least return the summary
    }

    console.log(`✅ Summary generated for ${emailId}: "${summary}"`);

    return NextResponse.json({
      emailId,
      summary,
      cached: false, // First generation
      tokens: completion.usage?.total_tokens || 0,
    });

  } catch (error: any) {
    console.error('❌ AI summary error:', error);

    // Fallback to snippet on error
    const { snippet, emailId } = await request.json();
    
    return NextResponse.json({
      emailId,
      summary: snippet || 'Failed to generate summary',
      error: error.message,
      cached: false,
    });
  }
}

