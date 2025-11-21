import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { buildSystemContext, QUICK_ACTIONS } from '@/lib/ai/system-knowledge';
import { buildAIContext } from '@/lib/ai/context-builder';
import { AI_TOOLS, executeAITool } from '@/lib/ai/tools';
import { createClient } from '@/lib/supabase/server';
import { trackAICost } from '@/lib/utils/cost-tracking';
import { aiRateLimit, enforceRateLimit } from '@/lib/security/rate-limiter';
import { checkAILimit } from '@/lib/billing/plan-limits';
import { AI_CONFIG } from '@/lib/ai/config';
import { createCompletionWithRetry } from '@/lib/ai/retry';

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

    const { message, conversationHistory, currentPage, accountId } = await request.json();

    if (!message || message.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'Message is required',
      }, { status: 400 });
    }

    // Build AI context to give AI access to user data
    let aiContext = null;
    if (accountId) {
      try {
        aiContext = await buildAIContext(userId, accountId);
        console.log('[AI Assistant] Built context with:', {
          emails: aiContext.emails.recent.length,
          contacts: aiContext.contacts.total,
          upcomingEvents: aiContext.calendar.upcoming.length,
        });
      } catch (error) {
        console.error('[AI Assistant] Failed to build context:', error);
        // Continue without context rather than failing completely
      }
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

    // Build system context with current page info and AI context
    let systemContext = buildSystemContext(currentPage || '/inbox');

    // Enhance system context with user data if available
    if (aiContext) {
      systemContext += `\n\n## USER DATA CONTEXT (SUMMARY ONLY - USE TOOLS FOR DETAILS!)\n\n`;
      systemContext += `⚠️ IMPORTANT: The data below is AGGREGATE SUMMARY only. It does NOT include email subjects, senders, or content.\n`;
      systemContext += `To answer ANY question about emails, contacts, or calendar, you MUST use the search tools!\n\n`;

      systemContext += `### Email Statistics (SUMMARY - not actual emails)\n`;
      systemContext += `- Recent emails count: ${aiContext.emails.recent.length}\n`;
      systemContext += `- Unread count: ${aiContext.emails.unread_count}\n`;
      systemContext += `- Important count: ${aiContext.emails.important.length}\n\n`;

      systemContext += `### Calendar Statistics (SUMMARY - not actual events)\n`;
      systemContext += `- Today's events count: ${aiContext.calendar.today.length}\n`;
      systemContext += `- Upcoming events count: ${aiContext.calendar.upcoming.length}\n`;
      if (aiContext.calendar.next_meeting) {
        systemContext += `- Next meeting: ${aiContext.calendar.next_meeting.title} at ${new Date(aiContext.calendar.next_meeting.start_time * 1000).toLocaleString()}\n`;
      }
      systemContext += `\n`;

      systemContext += `### Contact Statistics (SUMMARY - not actual contacts)\n`;
      systemContext += `- Total contacts: ${aiContext.contacts.total}\n`;
      systemContext += `- Recent contacts count: ${aiContext.contacts.recent.length}\n`;
      systemContext += `- Frequent contacts count: ${aiContext.contacts.frequent.length}\n\n`;

      systemContext += `### Insights (SUMMARY ONLY)\n`;
      systemContext += `- Unread from important senders: ${aiContext.insights.unread_from_important_senders}\n`;
      systemContext += `- Meetings today: ${aiContext.insights.meetings_today}\n`;
      systemContext += `- Deadlines this week: ${aiContext.insights.deadlines_this_week}\n\n`;

      systemContext += `🚨 TO GET ACTUAL EMAIL DETAILS: Use search_emails tool\n`;
      systemContext += `🚨 TO GET ACTUAL CONTACT DETAILS: Use search_contacts tool\n`;
      systemContext += `🚨 TO GET ACTUAL EVENT DETAILS: Use search_events tool\n`;
    }

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

    // Call OpenAI with function calling enabled if accountId is provided
    const completionParams: any = {
      model: AI_CONFIG.models.default,
      messages,
      temperature: AI_CONFIG.temperature.balanced,
      max_tokens: AI_CONFIG.maxTokens.chat,
    };

    // Add tools if we have user context
    if (accountId && aiContext) {
      completionParams.tools = AI_TOOLS;
      completionParams.tool_choice = 'auto';
    }

    let completion = await openai.chat.completions.create(completionParams);

    // Handle tool calls if present
    let toolCallResults: any[] = [];
    if (completion.choices[0].message.tool_calls) {
      const toolCalls = completion.choices[0].message.tool_calls;
      console.log(`[AI Assistant] Executing ${toolCalls.length} tool calls`);

      // Execute all tool calls
      for (const toolCall of toolCalls) {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          const result = await executeAITool(
            toolCall.function.name,
            args,
            { userId, accountId }
          );
          toolCallResults.push({
            tool_call_id: toolCall.id,
            role: 'tool' as const,
            content: JSON.stringify(result),
          });
        } catch (error) {
          console.error(`[AI Assistant] Tool call ${toolCall.function.name} failed:`, error);
          toolCallResults.push({
            tool_call_id: toolCall.id,
            role: 'tool' as const,
            content: JSON.stringify({
              error: 'Tool execution failed',
              tool: toolCall.function.name,
              details: error instanceof Error ? error.message : 'Unknown error',
            }),
          });
        }
      }

      // Add assistant message and tool results to messages
      messages.push(completion.choices[0].message);
      messages.push(...toolCallResults);

      // Call OpenAI again with tool results
      completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages,
        temperature: 0.7,
        max_tokens: 800,
      });
    }

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
    console.error('[AI Assistant] Fatal error:', error);
    console.error('[AI Assistant] Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process request',
      details: error instanceof Error ? error.stack : undefined,
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

