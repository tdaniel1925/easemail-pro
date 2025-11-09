/**
 * AI Write API Endpoint
 * POST /api/ai/write
 * 
 * Generates email drafts from user input
 */

import { NextRequest, NextResponse } from 'next/server';
import { aiWriteService, type AIWriteInput } from '@/lib/ai/ai-write-service';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailSignatures, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { trackAICost } from '@/lib/utils/cost-tracking';
import { aiRateLimit, enforceRateLimit } from '@/lib/security/rate-limiter';
import { checkAILimit } from '@/lib/billing/plan-limits';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Parse request body
    const body: AIWriteInput = await req.json();

    // 2. Validate input
    if (!body.content || !body.method) {
      return NextResponse.json(
        { error: 'Missing required fields: content and method' },
        { status: 400 }
      );
    }

    // 3. Authenticate user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // 4. Check rate limit
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

    // 5. Check usage limits
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

    // 6. Generate email
    console.log(`🤖 AI Write request from user ${userId}`);
    const result = await aiWriteService.generateEmail({
      ...body,
      userId,
    });

    // 6. Fetch user's default signature
    let signature = null;
    try {
      const defaultSignature = await db.query.emailSignatures.findFirst({
        where: and(
          eq(emailSignatures.userId, userId),
          eq(emailSignatures.isDefault, true)
        ),
      });
      
      if (defaultSignature) {
        signature = defaultSignature.contentHtml || defaultSignature.contentText;
      }
    } catch (sigError) {
      console.warn('⚠️ Could not fetch signature:', sigError);
      // Continue without signature
    }

    // 7. Append signature to body
    let finalBody = result.body;
    if (signature) {
      // Add signature with proper spacing
      finalBody = `${result.body}\n\n${signature}`;
      console.log('✅ Appended signature to AI-generated email');
    }

    // 8. Track AI cost
    // Estimate token split: typically 30% input, 70% output for email composition
    const totalTokens = result.metadata.tokensUsed || 0;
    const estimatedInputTokens = Math.floor(totalTokens * 0.3);
    const estimatedOutputTokens = Math.floor(totalTokens * 0.7);

    await trackAICost({
      userId,
      feature: 'write',
      model: result.metadata.model,
      inputTokens: estimatedInputTokens,
      outputTokens: estimatedOutputTokens,
    });

    console.log(`✅ Tracked AI cost for user ${userId}: ${result.metadata.tokensUsed} tokens`);

    // 9. Return result
    return NextResponse.json({
      success: true,
      email: {
        subject: result.subject,
        body: finalBody,
      },
      metadata: result.metadata,
    });

  } catch (error: any) {
    console.error('❌ AI Write error:', error);

    // Handle specific errors
    if (error.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'AI service configuration error' },
        { status: 500 }
      );
    }

    if (error.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in a moment.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to generate email',
        message: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}


