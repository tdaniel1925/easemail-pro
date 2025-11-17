/**
 * AI Write Service
 * 
 * Generate complete email drafts from minimal user input using OpenAI GPT-4
 * Supports: prompts, bullet points, templates, and context-aware generation
 */

import OpenAI from 'openai';

// ✅ SECURITY: Ensure this module is NEVER imported client-side
if (typeof window !== 'undefined') {
  throw new Error('ai-write-service must only be imported server-side (contains API keys)');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-build',
});

// ============================================================================
// Types
// ============================================================================

export type ToneType = 'professional' | 'friendly' | 'casual' | 'assertive' | 'empathetic';
export type LengthType = 'brief' | 'normal' | 'detailed';
export type FormalityType = 'casual' | 'professional' | 'formal';

export interface AIWriteInput {
  method: 'prompt' | 'bullets' | 'template';
  content: string;
  templateId?: string;
  context?: {
    threadId?: string;
    recipientEmail?: string;
    recipientName?: string;
    previousEmails?: string[];
    subject?: string;
  };
  preferences?: {
    tone?: ToneType;
    length?: LengthType;
    formality?: FormalityType;
    language?: string;
  };
  userId?: string;
  writingStyle?: string; // User's personal writing style profile
}

export interface GeneratedEmail {
  subject: string;
  body: string;
  metadata: {
    model: string;
    tokensUsed: number;
    generationTime: number;
    confidence: number;
  };
}

// ============================================================================
// Email Templates
// ============================================================================

export const EMAIL_TEMPLATES = {
  'follow-up': {
    id: 'follow-up',
    name: 'Follow-up Email',
    category: 'business',
    description: 'Follow up on a previous conversation or action',
    prompt: `Write a professional follow-up email that:
- References the previous interaction
- Asks for an update or next steps
- Maintains a polite, non-pushy tone
- Includes a clear call-to-action`,
  },
  'thank-you': {
    id: 'thank-you',
    name: 'Thank You',
    category: 'personal',
    description: 'Express gratitude and appreciation',
    prompt: `Write a warm thank-you email that:
- Expresses genuine gratitude
- Mentions specific things you're thankful for
- Maintains an authentic, personal tone
- Ends with a positive note`,
  },
  'introduction': {
    id: 'introduction',
    name: 'Introduction',
    category: 'business',
    description: 'Introduce yourself or make a connection',
    prompt: `Write a professional introduction email that:
- Introduces yourself clearly
- Explains the purpose of reaching out
- Mentions any mutual connections or context
- Suggests a clear next step`,
  },
  'meeting-request': {
    id: 'meeting-request',
    name: 'Meeting Request',
    category: 'business',
    description: 'Request a meeting or call',
    prompt: `Write a professional meeting request that:
- Clearly states the purpose
- Suggests specific times
- Keeps it brief and respectful
- Makes it easy to accept`,
  },
  'apology': {
    id: 'apology',
    name: 'Apology',
    category: 'personal',
    description: 'Apologize and make amends',
    prompt: `Write a sincere apology email that:
- Takes responsibility
- Expresses genuine regret
- Explains (without excuses)
- Offers to make it right`,
  },
  'decline': {
    id: 'decline',
    name: 'Polite Decline',
    category: 'business',
    description: 'Decline a request or invitation gracefully',
    prompt: `Write a polite decline email that:
- Thanks them for the opportunity
- Clearly but gently declines
- Provides brief reasoning (optional)
- Leaves the door open for future`,
  },
};

// ============================================================================
// AI Write Service
// ============================================================================

export class AIWriteService {
  /**
   * Generate email from user input
   */
  async generateEmail(input: AIWriteInput): Promise<GeneratedEmail> {
    const startTime = Date.now();

    try {
      // Build the prompt based on input method
      const systemPrompt = this.buildSystemPrompt(input);
      const userPrompt = this.buildUserPrompt(input);

      // Call OpenAI
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Cost-effective for email generation
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7, // Balanced creativity
        max_tokens: this.getMaxTokens(input.preferences?.length),
        presence_penalty: 0.3,
        frequency_penalty: 0.3,
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error('No content generated');
      }

      // Parse the response (expecting JSON with subject and body)
      const parsed = this.parseEmailResponse(content);

      const generationTime = Date.now() - startTime;

      return {
        subject: parsed.subject,
        body: parsed.body,
        metadata: {
          model: completion.model,
          tokensUsed: completion.usage?.total_tokens || 0,
          generationTime,
          confidence: 0.85,
        },
      };
    } catch (error: any) {
      console.error('AI Write error:', error);
      throw new Error(`Failed to generate email: ${error.message}`);
    }
  }

  /**
   * Build system prompt based on preferences
   */
  private buildSystemPrompt(input: AIWriteInput): string {
    const { tone = 'professional', length = 'normal', formality = 'professional' } = input.preferences || {};

    let systemPrompt = `You are an expert email writer. Generate professional, clear, and engaging emails.

TONE: ${tone}
LENGTH: ${length}
FORMALITY: ${formality}

RULES:
1. Generate emails that sound natural and authentic
2. Match the specified tone and formality level
3. Keep the length appropriate (brief: 2-3 sentences, normal: 1-2 paragraphs, detailed: 3-4 paragraphs)
4. Include a clear subject line
5. Use proper email structure (greeting, body, closing)
6. Be concise and to the point
7. Proofread for grammar and spelling
8. Format emails with clear paragraph breaks (use double line breaks between paragraphs)
9. Each paragraph should address one main idea
10. Use professional spacing for readability`;

    // Add writing style profile if available
    if (input.writingStyle) {
      systemPrompt += `\n\n**IMPORTANT: Write in the user's personal writing style:**\n${input.writingStyle}`;
    }

    systemPrompt += `\n\nRESPONSE FORMAT:
Return ONLY a JSON object with this structure:
{
  "subject": "Email subject line",
  "body": "Email body with greeting\n\nMain content paragraph\n\nClosing paragraph"
}

IMPORTANT: Use double line breaks (\\n\\n) between paragraphs for proper formatting.
Do not include any text outside the JSON object.`;

    return systemPrompt;
  }

  /**
   * Build user prompt based on input method
   */
  private buildUserPrompt(input: AIWriteInput): string {
    let prompt = '';

    // Add context if available
    if (input.context?.recipientName) {
      prompt += `Recipient: ${input.context.recipientName}\n`;
    }
    if (input.context?.recipientEmail) {
      prompt += `Recipient Email: ${input.context.recipientEmail}\n`;
    }
    if (input.context?.subject) {
      prompt += `Subject Context: ${input.context.subject}\n`;
    }
    if (input.context?.previousEmails && input.context.previousEmails.length > 0) {
      prompt += `\nPrevious Email Thread:\n${input.context.previousEmails.join('\n---\n')}\n`;
    }

    prompt += '\n';

    // Add main content based on method
    switch (input.method) {
      case 'prompt':
        prompt += `Generate an email based on this description:\n${input.content}`;
        break;

      case 'bullets':
        prompt += `Generate an email that covers these points:\n${input.content}`;
        break;

      case 'template':
        const template = input.templateId ? EMAIL_TEMPLATES[input.templateId as keyof typeof EMAIL_TEMPLATES] : null;
        if (template) {
          prompt += `${template.prompt}\n\nUser's specific details:\n${input.content}`;
        } else {
          prompt += `Generate an email based on:\n${input.content}`;
        }
        break;
    }

    return prompt;
  }

  /**
   * Parse email response from AI
   */
  private parseEmailResponse(content: string): { subject: string; body: string } {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(content);
      return {
        subject: parsed.subject || 'Your Email',
        body: this.formatEmailBody(parsed.body || content),
      };
    } catch {
      // Fallback: extract subject and body manually
      const lines = content.split('\n').filter(l => l.trim());
      
      // First line is likely the subject
      const subject = lines[0]?.replace(/^Subject:\s*/i, '').trim() || 'Your Email';
      
      // Rest is the body
      const body = lines.slice(1).join('\n').trim() || content;
      
      return { subject, body: this.formatEmailBody(body) };
    }
  }

  /**
   * Format plain text email to HTML with proper paragraph spacing
   */
  private formatEmailBody(body: string): string {
    // If already has HTML tags, return as-is
    if (body.includes('<p>') || body.includes('<br')) {
      return body;
    }

    // Split by double newlines (paragraphs)
    const paragraphs = body
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    // If no paragraphs found (single block of text), split by single newlines
    if (paragraphs.length === 1) {
      const lines = body.split(/\n/).filter(l => l.trim());
      // Wrap entire block as one paragraph with line breaks
      return `<p>${lines.join('<br>')}</p>`;
    }

    // Wrap each paragraph in <p> tags, convert single newlines to <br>
    return paragraphs
      .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  /**
   * Get max tokens based on length preference
   */
  private getMaxTokens(length?: LengthType): number {
    switch (length) {
      case 'brief':
        return 150;
      case 'detailed':
        return 600;
      case 'normal':
      default:
        return 300;
    }
  }

  /**
   * Generate multiple variations
   */
  async generateVariations(
    input: AIWriteInput,
    count: number = 3
  ): Promise<GeneratedEmail[]> {
    const variations: GeneratedEmail[] = [];

    for (let i = 0; i < count; i++) {
      // Slightly adjust temperature for each variation
      const variation = await this.generateEmail({
        ...input,
        preferences: {
          ...input.preferences,
        },
      });
      variations.push(variation);

      // Small delay to avoid rate limiting
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return variations;
  }
}

// ============================================================================
// Singleton instance
// ============================================================================

export const aiWriteService = new AIWriteService();

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Get tone description for UI
 */
export function getToneDescription(tone: ToneType): string {
  const descriptions = {
    professional: 'Formal business tone',
    friendly: 'Warm and approachable',
    casual: 'Relaxed and informal',
    assertive: 'Direct and confident',
    empathetic: 'Understanding and caring',
  };
  return descriptions[tone];
}

/**
 * Get length description for UI
 */
export function getLengthDescription(length: LengthType): string {
  const descriptions = {
    brief: '2-3 sentences',
    normal: '1-2 paragraphs',
    detailed: '3-4 paragraphs',
  };
  return descriptions[length];
}

/**
 * Estimate cost for generation
 */
export function estimateGenerationCost(length: LengthType): number {
  // GPT-4o-mini pricing: ~$0.00015 per 1K tokens (input) + $0.0006 per 1K tokens (output)
  const avgTokens = {
    brief: 200,
    normal: 400,
    detailed: 700,
  };

  const tokens = avgTokens[length];
  const cost = (tokens / 1000) * 0.0006; // Approximate

  return cost; // Returns cost in dollars (e.g., 0.00024)
}

