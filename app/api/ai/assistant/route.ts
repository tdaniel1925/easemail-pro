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
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 1500,
    });

    const responseText = completion.choices[0].message.content || 'I apologize, but I could not generate a response. Please try again.';

    // Track AI cost
    await trackAICost({
      userId,
      feature: 'assistant',
      model: 'gpt-4o',
      inputTokens: completion.usage?.prompt_tokens || 0,
      outputTokens: completion.usage?.completion_tokens || 0,
    });

    // Parse response to extract action buttons
    const actions = extractActions(responseText);

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
 * Only extracts valid action buttons to avoid false positives
 */
function extractActions(responseText: string): Array<{ text: string; action: string; path?: string }> {
  const actions: Array<{ text: string; action: string; path?: string }> = [];

  // Extract [Button Text] patterns - only at start of line or after whitespace
  const buttonPattern = /(?:^|\s)\[([^\]]+)\](?:\s|$)/gm;
  const matches = Array.from(responseText.matchAll(buttonPattern));

  for (const match of matches) {
    const buttonText = match[1].trim();
    const lowerText = buttonText.toLowerCase();

    // Skip if it looks like a bracketed note rather than a button (e.g., [Note: ...], [see above])
    if (lowerText.startsWith('note') || lowerText.startsWith('see') || lowerText.startsWith('example')) {
      continue;
    }

    // Check if this matches a known quick action
    const quickAction = QUICK_ACTIONS[lowerText];
    if (quickAction) {
      actions.push({
        text: buttonText,
        action: quickAction.action,
        path: quickAction.path,
      });
    } else {
      // Try to infer action from button text with more specific matching
      const actionKeywords = [
        { keywords: ['compose', 'write email', 'new email'], path: '/inbox?compose=true' },
        { keywords: ['contact', 'view contact', 'add contact'], path: '/contacts' },
        { keywords: ['calendar', 'event', 'schedule'], path: '/calendar' },
        { keywords: ['settings', 'preferences', 'configure'], path: '/settings' },
        { keywords: ['rule', 'automation', 'filter'], path: '/rules' },
        { keywords: ['inbox', 'emails'], path: '/inbox' },
        { keywords: ['attachment'], path: '/attachments' },
        { keywords: ['sms', 'text message'], path: '/sms' },
      ];

      let matched = false;
      for (const { keywords, path } of actionKeywords) {
        if (keywords.some(keyword => lowerText.includes(keyword))) {
          actions.push({
            text: buttonText,
            action: 'navigate',
            path,
          });
          matched = true;
          break;
        }
      }

      // Only add as generic action if it seems like a button (action verbs, short text)
      if (!matched && buttonText.length <= 30 && /^[A-Z]/.test(buttonText)) {
        actions.push({
          text: buttonText,
          action: 'info',
        });
      }
    }
  }

  return actions;
}

