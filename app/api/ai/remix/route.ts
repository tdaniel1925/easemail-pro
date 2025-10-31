/**
 * AI Remix API Endpoint
 * POST /api/ai/remix
 * 
 * Transforms and improves existing email drafts
 */

import { NextRequest, NextResponse } from 'next/server';
import { aiRemixService, type RemixOptions } from '@/lib/ai/ai-remix-service';

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

    // 3. Check authentication
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 4. Check usage limits
    const canUse = await checkAIRemixUsage(userId);
    if (!canUse) {
      return NextResponse.json(
        {
          error: 'Usage limit reached',
          message: 'Upgrade to Pro for more AI Remix generations',
          upgradeUrl: '/pricing',
        },
        { status: 429 }
      );
    }

    // 5. Remix email
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

    // 6. Track usage
    await trackAIRemixUsage(userId);

    // 7. Return result
    return NextResponse.json({
      success: true,
      email: {
        body: result.body,
      },
      changes: result.changes,
      confidence: result.confidence,
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

async function checkAIRemixUsage(userId: string): Promise<boolean> {
  // TODO: Query your database for user's usage
  return true;
}

async function trackAIRemixUsage(userId: string): Promise<void> {
  // TODO: Update your database with usage
  console.log(`📊 Tracked AI Remix for user ${userId}`);
}

