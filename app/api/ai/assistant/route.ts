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

    // Step 1: Detect if user wants to compose an email
    const openai = getOpenAIClient();
    const isEmailComposition = await detectEmailIntent(openai, message);

    if (isEmailComposition.isEmail) {
      // Generate email content
      const emailContent = await generateEmail(openai, {
        recipient: isEmailComposition.recipient,
        subject: isEmailComposition.subject,
        message: isEmailComposition.message,
        tone: isEmailComposition.tone,
      });

      // Track AI cost for email generation
      await trackAICost({
        userId,
        feature: 'email-composition',
        model: 'gpt-4o',
        inputTokens: emailContent.usage?.prompt_tokens || 0,
        outputTokens: emailContent.usage?.completion_tokens || 0,
      });

      return NextResponse.json({
        success: true,
        response: `I've drafted an email for you. Click the button below to open the composer with the pre-filled content.`,
        actions: [{
          text: 'Open Composer',
          action: 'compose',
          emailData: {
            to: isEmailComposition.recipient,
            subject: isEmailComposition.subject || '',
            body: emailContent.body,
          }
        }],
        usage: {
          promptTokens: emailContent.usage?.prompt_tokens || 0,
          completionTokens: emailContent.usage?.completion_tokens || 0,
          totalTokens: emailContent.usage?.total_tokens || 0,
        },
      });
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
 * Detect if user wants to compose an email
 */
async function detectEmailIntent(openai: OpenAI, message: string): Promise<{
  isEmail: boolean;
  recipient?: string;
  subject?: string;
  message?: string;
  tone?: string;
}> {
  const intentPrompt = `Analyze if the user wants to compose/write an email. Extract recipient, subject, and message details.

Examples:
- "Write an email to john@example.com about the meeting" → isEmail: true, recipient: "john@example.com"
- "Email Sarah about moving the court date to June 10th" → isEmail: true, recipient: "Sarah", message: "moving the court date to June 10th"
- "Draft a professional email to the team about Q4 results" → isEmail: true, recipient: "team", message: "Q4 results", tone: "professional"
- "How do I use AI Write?" → isEmail: false

User message: "${message}"

Respond with JSON only:
{
  "isEmail": boolean,
  "recipient": "email or name",
  "subject": "inferred subject",
  "message": "message content to write about",
  "tone": "professional|casual|formal|friendly"
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: intentPrompt }],
    temperature: 0.2,
    max_tokens: 200,
    response_format: { type: 'json_object' },
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');
  return result;
}

/**
 * Generate email content using GPT-4o
 */
async function generateEmail(openai: OpenAI, params: {
  recipient?: string;
  subject?: string;
  message?: string;
  tone?: string;
}): Promise<{ body: string; usage?: any }> {
  const emailPrompt = `Write a ${params.tone || 'professional'} email with the following details:

Recipient: ${params.recipient || 'recipient'}
Subject: ${params.subject || 'No subject specified'}
Message: ${params.message || 'General correspondence'}

Instructions:
- Write a complete, well-formatted email body (no subject line in body)
- Use appropriate greeting and closing
- Be clear, concise, and ${params.tone || 'professional'}
- Use HTML formatting (paragraphs with <p> tags, line breaks with <br/>)
- Do NOT include the subject line in the email body
- Do NOT include "To:" or "From:" fields in the body

Example format:
<p>Hi [Name],</p>
<p>[Email content here...]</p>
<p>Best regards,<br/>[Sender]</p>

Write the email body now:`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: emailPrompt }],
    temperature: 0.7,
    max_tokens: 500,
  });

  const body = response.choices[0].message.content || '';

  return {
    body,
    usage: response.usage,
  };
}

/**
 * Extract action buttons from AI response text
 * Looks for patterns like [Button Text] and maps to actual actions
 */
function extractActions(responseText: string): Array<{ text: string; action: string; path?: string }> {
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

