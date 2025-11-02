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
        signature = defaultSignature.htmlContent || defaultSignature.textContent;
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

    // 8. Track usage
    await trackAIWriteUsage(userId, result.metadata.tokensUsed);

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

