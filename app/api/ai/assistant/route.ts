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
  console.log('🚀🚀🚀 [AI Assistant] POST endpoint HIT!!! 🚀🚀🚀');
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

    // Lookup the database account ID from the Nylas Grant ID
    // accountId from the frontend is the nylasGrantId, but we need the database ID for tool queries
    let dbAccountId: string | null = null;
    if (accountId) {
      try {
        const { db } = await import('@/lib/db/drizzle');
        const { emailAccounts } = await import('@/lib/db/schema');
        const { eq } = await import('drizzle-orm');

        const account = await db.query.emailAccounts.findFirst({
          where: eq(emailAccounts.nylasGrantId, accountId),
        });

        if (account) {
          dbAccountId = account.id;
          console.log(`[AI Assistant] Resolved nylasGrantId ${accountId} to dbAccountId ${dbAccountId}`);
        } else {
          console.error(`[AI Assistant] Account not found for nylasGrantId ${accountId}`);
        }
      } catch (error) {
        console.error('[AI Assistant] Failed to lookup database account ID:', error);
      }
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
    // IMPORTANT: Keep only last 2 messages to avoid hitting OpenAI's 128k token limit
    // With dynamic tool filtering, 2 messages should be enough while staying under token limit
    if (conversationHistory && Array.isArray(conversationHistory)) {
      messages.push(...conversationHistory.slice(-2)); // Keep last 2 messages for context
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
      // OPTIMIZATION: Only send relevant tools based on user's message to reduce token usage
      // This prevents hitting the 128k token limit
      const lowerMessage = message.toLowerCase();
      const relevantTools = AI_TOOLS.filter(tool => {
        const toolName = tool.function.name.toLowerCase();

        // Email tools
        if (lowerMessage.includes('email') || lowerMessage.includes('inbox') || lowerMessage.includes('sender') || lowerMessage.includes('from')) {
          if (toolName.includes('email')) return true;
        }

        // Calendar tools
        if (lowerMessage.includes('calendar') || lowerMessage.includes('meeting') || lowerMessage.includes('event') || lowerMessage.includes('schedule') || lowerMessage.includes('appointment')) {
          if (toolName.includes('calendar') || toolName.includes('event')) return true;
        }

        // Contact tools
        if (lowerMessage.includes('contact') || lowerMessage.includes('people') || lowerMessage.includes('person')) {
          if (toolName.includes('contact')) return true;
        }

        // Always include search tool for general queries
        if (toolName === 'search_emails') return true;

        return false;
      });

      // If no specific tools matched, include all tools (fallback)
      completionParams.tools = relevantTools.length > 0 ? relevantTools : AI_TOOLS;

      // Force tool usage for data queries AND actions by detecting keywords in user message
      const dataQueryKeywords = ['email', 'inbox', 'from', 'sender', 'contact', 'meeting', 'event', 'calendar', 'how many', 'do i have', 'show me', 'find', 'search', 'are there', 'any'];
      const actionKeywords = ['set', 'create', 'schedule', 'make', 'add', 'book', 'send', 'reply', 'delete', 'remove', 'archive', 'mark', 'star', 'unstar', 'update', 'edit', 'change'];

      const isDataQuery = dataQueryKeywords.some(keyword => lowerMessage.includes(keyword));
      const isAction = actionKeywords.some(keyword => lowerMessage.includes(keyword));

      // If this looks like a data query OR action, strongly prefer using tools
      // OpenAI will see 'required' and MUST make at least one tool call
      if (isDataQuery || isAction) {
        console.log(`[AI Assistant] 🔧 FORCING tool usage - detected ${isDataQuery ? 'data query' : 'action'} keywords in: "${message}"`);
        completionParams.tool_choice = 'required';
      } else {
        console.log(`[AI Assistant] Using tool_choice='auto' for: "${message}"`);
        completionParams.tool_choice = 'auto';
      }

      console.log(`[AI Assistant] ✅ Tools enabled. tool_choice=${completionParams.tool_choice}, relevant_tools=${relevantTools.length}/${AI_TOOLS.length}`);
    } else {
      console.log(`[AI Assistant] ❌ Tools DISABLED. accountId=${accountId}, hasContext=${!!aiContext}`);
    }

    console.log(`[AI Assistant] 📤 Calling OpenAI with model=${completionParams.model}, tool_choice=${completionParams.tool_choice}`);
    let completion = await openai.chat.completions.create(completionParams);
    console.log(`[AI Assistant] 📥 OpenAI response received. has_tool_calls=${!!completion.choices[0].message.tool_calls}`);

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
            { userId, accountId: accountId } // Use Nylas Grant ID for API calls
          );

          // Log what the tool returned
          console.log(`[AI Assistant] ✅ Tool ${toolCall.function.name} returned:`);
          console.log(`  - Type: ${result.constructor.name}`);
          console.log(`  - Keys: ${Object.keys(result).join(', ')}`);
          console.log(`  - Email count: ${result.emails?.length || 0}`);
          console.log(`  - Total: ${result.total}`);
          if (result.emails && result.emails.length > 0) {
            console.log(`  - First email: ${JSON.stringify(result.emails[0])}`);
          } else {
            console.log(`  - No emails returned!`);
          }

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
  const emailPrompt = `Write a ${params.tone || 'professional'} email that is SEND-READY.

Recipient: ${params.recipient || 'recipient'}
Subject: ${params.subject || 'No subject specified'}
Message: ${params.message || 'General correspondence'}

EMAIL STRUCTURE:
1. Greeting: "Hi [Name],"
2. Body paragraphs (break up long content into separate paragraphs)
3. Closing sentence
4. Salutation: "Best regards,"

HTML FORMAT - wrap each section in <p> tags, NO blank lines between paragraphs:
<p>Hi ${params.recipient || '[Name]'},</p>
<p>First paragraph of content here.</p>
<p>Second paragraph if needed.</p>
<p>Thank you for your time!</p>
<p>Best regards,</p>

RULES:
- Each section is its own <p> tag
- NO <p><br></p> or empty paragraphs - just consecutive <p> tags
- NO wall of text - break up content into logical paragraphs
- Be clear, concise, and ${params.tone || 'professional'}
- Do NOT include subject line, "To:", or "From:" in the body

Write the HTML email body now:`;

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

