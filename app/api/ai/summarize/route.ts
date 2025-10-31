/**
 * AI Email Summary API
 * POST /api/ai/summarize
 * Generates a concise summary of an email using OpenAI
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface SummaryRequest {
  emailId: string;
  subject: string;
  snippet: string;
  fromName?: string;
  bodyText?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { emailId, subject, snippet, fromName, bodyText }: SummaryRequest = await request.json();

    // Validate input
    if (!emailId || (!snippet && !bodyText)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if OpenAI key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ OpenAI API key not configured, returning snippet as summary');
      return NextResponse.json({
        emailId,
        summary: snippet || 'No preview available',
        keyPoints: [],
        cached: false,
      });
    }

    // Use snippet or bodyText (prefer snippet for speed)
    const content = snippet || bodyText?.substring(0, 1000) || '';
    
    console.log(`🤖 Generating AI summary for email: ${emailId}`);

    // Generate summary using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an email summarization assistant. Create concise, actionable summaries.
          
Rules:
- ONE sentence only (max 15 words)
- Focus on ACTION ITEMS and KEY INFO
- Start with a verb or key noun
- Be specific and helpful
- No fluff or pleasantries

Examples:
- "Approve Q4 budget by Friday, meeting scheduled for 2pm"
- "Client approved Phase 1, requesting Phase 2 pricing"
- "Server downtime scheduled tonight 11pm-2am, no action needed"
- "Invoice #1234 overdue, payment required within 5 days"`
        },
        {
          role: 'user',
          content: `Summarize this email in ONE sentence:

From: ${fromName || 'Unknown'}
Subject: ${subject}

${content}`
        }
      ],
      temperature: 0.3,
      max_tokens: 50,
    });

    const summary = completion.choices[0]?.message?.content?.trim() || snippet;

    console.log(`✅ Summary generated for ${emailId}: "${summary}"`);

    return NextResponse.json({
      emailId,
      summary,
      cached: false,
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

