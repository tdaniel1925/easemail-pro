import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { buildSystemContext, QUICK_ACTIONS } from '@/lib/ai/system-knowledge';
import { createClient } from '@/lib/supabase/server';
import { trackAICost } from '@/lib/utils/cost-tracking';
import { aiRateLimit, enforceRateLimit } from '@/lib/security/rate-limiter';
import { checkAILimit } from '@/lib/billing/plan-limits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Initialize OpenAI client
function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const userId = user.id;

    // Check rate limit
    const rateLimitResult = await enforceRateLimit(aiRateLimit, userId);
    if (!rateLimitResult.allowed) {
      return NextResponse.json({
        success: false,
        error: rateLimitResult.error,
      }, {
        status: 429,
        headers: rateLimitResult.headers
      });
    }

    // Check usage limits
    const limitCheck = await checkAILimit(userId);
    if (!limitCheck.allowed) {
      return NextResponse.json({
        success: false,
        error: limitCheck.message,
        upgradeUrl: limitCheck.upgradeUrl,
        tier: limitCheck.tier,
        used: limitCheck.used,
        limit: limitCheck.limit,
      }, { status: 429 });
    }

    const { message, conversationHistory, currentPage } = await request.json();

    if (!message || message.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'Message is required',
      }, { status: 400 });
    }

    // Build system context with current page info
    const systemContext = buildSystemContext(currentPage || '/inbox');

    // Prepare messages for OpenAI
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemContext,
      },
    ];

    // Add conversation history if provided
    if (conversationHistory && Array.isArray(conversationHistory)) {
      messages.push(...conversationHistory.slice(-10)); // Keep last 10 messages for context
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: message,
    });

    // Call OpenAI
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages,
      temperature: 0.7,
      max_tokens: 800,
    });

    const responseText = completion.choices[0].message.content || 'I apologize, but I could not generate a response. Please try again.';

    // Track AI cost
    await trackAICost({
      userId,
      feature: 'assistant',
      model: 'gpt-4-turbo-preview',
      inputTokens: completion.usage?.prompt_tokens || 0,
      outputTokens: completion.usage?.completion_tokens || 0,
    });

    // Parse response to extract action buttons
    const actions = extractActions(responseText, message);

    return NextResponse.json({
      success: true,
      response: responseText,
      actions,
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
      },
    });
  } catch (error) {
    console.error('AI Assistant error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process request',
    }, { status: 500 });
  }
}

/**
 * Extract action buttons from AI response text
 * Looks for patterns like [Button Text] and maps to actual actions
 */
function extractActions(responseText: string, userMessage: string): Array<{ text: string; action: string; path?: string }> {
  const actions: Array<{ text: string; action: string; path?: string }> = [];
  
  // Extract [Button Text] patterns
  const buttonPattern = /\[([^\]]+)\]/g;
  const matches = Array.from(responseText.matchAll(buttonPattern));
  
  for (const match of matches) {
    const buttonText = match[1];
    const lowerText = buttonText.toLowerCase();
    
    // Check if this matches a known quick action
    const quickAction = QUICK_ACTIONS[lowerText];
    if (quickAction) {
      actions.push({
        text: buttonText,
        action: quickAction.action,
        path: quickAction.path,
      });
    } else {
      // Try to infer action from button text
      if (lowerText.includes('compose') || lowerText.includes('write email')) {
        actions.push({
          text: buttonText,
          action: 'navigate',
          path: '/inbox?compose=true',
        });
      } else if (lowerText.includes('contact')) {
        actions.push({
          text: buttonText,
          action: 'navigate',
          path: '/contacts',
        });
      } else if (lowerText.includes('calendar')) {
        actions.push({
          text: buttonText,
          action: 'navigate',
          path: '/calendar',
        });
      } else if (lowerText.includes('settings')) {
        actions.push({
          text: buttonText,
          action: 'navigate',
          path: '/settings',
        });
      } else if (lowerText.includes('rule') || lowerText.includes('automation')) {
        actions.push({
          text: buttonText,
          action: 'navigate',
          path: '/rules',
        });
      } else {
        // Generic action - no path
        actions.push({
          text: buttonText,
          action: 'info',
        });
      }
    }
  }
  
  return actions;
}

