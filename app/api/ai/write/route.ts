/**
 * AI Write API Endpoint
 * POST /api/ai/write
 * 
 * Generates email drafts from user input
 */

import { NextRequest, NextResponse } from 'next/server';
import { aiWriteService, type AIWriteInput } from '@/lib/ai/ai-write-service';

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

    // 3. Check authentication (TODO: integrate with your auth)
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 4. Check usage limits (TODO: integrate with your usage tracking)
    const canUse = await checkAIWriteUsage(userId);
    if (!canUse) {
      return NextResponse.json(
        {
          error: 'Usage limit reached',
          message: 'Upgrade to Pro for more AI Write generations',
          upgradeUrl: '/pricing',
        },
        { status: 429 }
      );
    }

    // 5. Generate email
    console.log(`🤖 AI Write request from user ${userId}`);
    const result = await aiWriteService.generateEmail({
      ...body,
      userId,
    });

    // 6. Track usage
    await trackAIWriteUsage(userId, result.metadata.tokensUsed);

    // 7. Return result
    return NextResponse.json({
      success: true,
      email: {
        subject: result.subject,
        body: result.body,
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

// ============================================================================
// Helper Functions (TODO: Move to database service)
// ============================================================================

async function checkAIWriteUsage(userId: string): Promise<boolean> {
  // TODO: Query your database for user's usage
  // For now, allow all requests
  return true;
}

async function trackAIWriteUsage(userId: string, tokensUsed: number): Promise<void> {
  // TODO: Update your database with usage
  console.log(`📊 Tracked ${tokensUsed} tokens for user ${userId}`);
}

