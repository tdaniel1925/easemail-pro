/**
 * AI Remix API Endpoint
 * POST /api/ai/remix
 * 
 * Transforms and improves existing email drafts
 */

import { NextRequest, NextResponse } from 'next/server';
import { aiRemixService, type RemixOptions } from '@/lib/ai/ai-remix-service';
import { createClient } from '@/lib/supabase/server';
import { trackAICost } from '@/lib/utils/cost-tracking';
import { aiRateLimit, enforceRateLimit } from '@/lib/security/rate-limiter';
import { checkAILimit } from '@/lib/billing/plan-limits';

export async function POST(req: NextRequest) {
  try {
    // 1. Parse request body
    const body: { content: string; options: RemixOptions } = await req.json();

    // 2. Validate input
    if (!body.content) {
      return NextResponse.json(
        { error: 'Missing required field: content' },
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

    // 6. Remix email
    console.log(`🎨 AI Remix request from user ${userId}`);
    
    // Check if generating variations
    if (body.options.variationCount && body.options.variationCount > 1) {
      const variations = await aiRemixService.generateVariations(
        body.content,
        body.options
      );

      return NextResponse.json({
        success: true,
        variations,
      });
    }

    // Single remix
    const result = await aiRemixService.remixEmail(body.content, body.options);

    // 7. Track AI cost
    if (result.metadata) {
      await trackAICost({
        userId,
        feature: 'remix',
        model: result.metadata.model,
        inputTokens: result.metadata.inputTokens,
        outputTokens: result.metadata.outputTokens,
      });
      console.log(`✅ Tracked AI cost for user ${userId}: ${result.metadata.totalTokens} tokens`);
    }

    // 8. Return result
    return NextResponse.json({
      success: true,
      email: {
        body: result.body,
      },
      changes: result.changes,
      confidence: result.confidence,
      metadata: result.metadata,
    });

  } catch (error: any) {
    console.error('❌ AI Remix error:', error);

    if (error.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in a moment.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to remix email',
        message: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}


