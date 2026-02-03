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
import { createClient } from '@/lib/supabase/server';
import { trackAICost } from '@/lib/utils/cost-tracking';
import { trackAiUsage } from '@/lib/billing/track-usage';
import { aiRateLimit, enforceRateLimit } from '@/lib/security/rate-limiter';
import { checkAILimit } from '@/lib/billing/plan-limits';
import { users } from '@/lib/db/schema';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// In-memory cache for v3 messages (session-based)
const summaryCache = new Map<string, { summary: string; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

interface SummaryRequest {
  emailId: string;
  subject?: string;
  snippet?: string;
  fromName?: string;
  bodyText?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Check rate limit
    const rateLimitResult = await enforceRateLimit(aiRateLimit, userId);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: rateLimitResult.error },
        {
          status: 429,
          headers: rateLimitResult.headers
        }
      );
    }

    // Check usage limits
    const limitCheck = await checkAILimit(userId);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Usage limit reached',
          message: limitCheck.message,
          upgradeUrl: limitCheck.upgradeUrl,
          tier: limitCheck.tier,
          used: limitCheck.used,
          limit: limitCheck.limit,
        },
        { status: 429 }
      );
    }

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

    // 🔥 CHECK IN-MEMORY CACHE FIRST (for v3 messages)
    const cached = summaryCache.get(emailId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`✅ Using in-memory cached summary for ${emailId}`);
      return NextResponse.json({
        emailId,
        summary: cached.summary,
        cached: true,
        tokens: 0,
      });
    }

    // 🔥 CHECK DATABASE (for v1 messages)
    try {
      const existingEmail = await db.query.emails.findFirst({
        where: eq(emails.id, emailId),
        columns: { aiSummary: true },
      });

      if (existingEmail?.aiSummary) {
        console.log(`✅ Using database cached summary for ${emailId}`);
        // Also cache in memory for faster access
        summaryCache.set(emailId, { summary: existingEmail.aiSummary, timestamp: Date.now() });
        return NextResponse.json({
          emailId,
          summary: existingEmail.aiSummary,
          cached: true,
          tokens: 0,
        });
      }
    } catch (dbError) {
      // Email not in DB (v3 on-demand) - continue with generation
      console.log(`📧 Email ${emailId} not in database, will generate fresh summary`);
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
          content: `You are a personal assistant summarizing emails in a natural, conversational way.

CRITICAL RULES:
- Write 2-3 sentences maximum in a narrative style
- Speak naturally like you're telling someone about an email
- READ THE FULL EMAIL BODY and understand what it's actually about
- Extract the REAL purpose and key information
- Use the sender's name naturally (e.g., "Brian is reaching out to...")
- Be conversational but concise
- Focus on: what they want, when, why, and any action needed

GOOD Examples:
"Brian Barnes is reaching out to see if you can connect for a call tomorrow at 2pm to discuss the Q4 budget."

"Sarah sent over the final report for review and needs your approval by Friday EOD before she can submit to the board."

"Your Amazon order (#12345) has shipped and should arrive Thursday. Includes the laptop charger and mouse you ordered."

"Mike is confirming the team meeting has been moved from Tuesday to Wednesday at 3pm in Conference Room B. No prep needed."

BAD Examples (DO NOT DO):
"This email is about scheduling" ❌ (too vague)
"The subject is about budget approval" ❌ (just repeating subject)
"Brian sent an email asking about availability" ❌ (not specific enough)
"Email discusses meeting schedule" ❌ (too formal/generic)

Write like a human assistant explaining the email.`
        },
        {
          role: 'user',
          content: `Read this email carefully and tell me what it's about in 2-3 natural sentences:

From: ${fromName || 'Unknown'}
Subject: ${subject}

Email Body:
${content}

What's this email actually about? What does ${fromName || 'the sender'} want or need?`
        }
      ],
      temperature: 0.7,
      max_tokens: 100,
    });

    const summary = completion.choices[0]?.message?.content?.trim() || snippet || 'No summary available';

    // Track AI cost (legacy system)
    await trackAICost({
      userId,
      feature: 'summarize',
      model: 'gpt-3.5-turbo',
      inputTokens: completion.usage?.prompt_tokens || 0,
      outputTokens: completion.usage?.completion_tokens || 0,
    });

    // Track for PayPal billing system
    try {
      const [dbUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const totalTokens = (completion.usage?.prompt_tokens || 0) + (completion.usage?.completion_tokens || 0);
      await trackAiUsage(
        userId,
        dbUser?.organizationId || undefined,
        totalTokens,
        'gpt-3.5-turbo',
        {
          feature: 'summarize',
          emailId,
          promptTokens: completion.usage?.prompt_tokens,
          completionTokens: completion.usage?.completion_tokens,
        }
      );
    } catch (billingError) {
      console.warn('⚠️ Failed to track AI usage for billing:', billingError);
    }

    // 🔥 SAVE TO IN-MEMORY CACHE (for v3 messages)
    summaryCache.set(emailId, { summary, timestamp: Date.now() });
    console.log(`💾 Summary cached in memory for ${emailId}`);

    // 🔥 TRY TO SAVE TO DATABASE (for v1 messages)
    try {
      await db.update(emails)
        .set({
          aiSummary: summary,
          updatedAt: new Date(),
        })
        .where(eq(emails.id, emailId));

      console.log(`💾 Summary also saved to database for ${emailId}`);
    } catch (dbError) {
      // Not in DB (v3 message) - that's fine, in-memory cache works
      console.log(`ℹ️ Email ${emailId} not saved to database (likely v3 message)`);
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

