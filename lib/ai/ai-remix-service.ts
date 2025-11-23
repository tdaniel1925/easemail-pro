/**
 * AI Remix Service
 * 
 * Transform and improve existing email drafts
 * Supports: tone adjustment, length modification, style transformation
 */

import OpenAI from 'openai';
import type { ToneType } from './ai-write-types';

// ✅ SECURITY: Ensure this module is NEVER imported client-side
if (typeof window !== 'undefined') {
  throw new Error('ai-remix-service must only be imported server-side (contains API keys)');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-build',
});

// ============================================================================
// Types
// ============================================================================

export interface RemixOptions {
  tone?: ToneType;
  lengthAdjustment?: 'shorter' | 'same' | 'longer';
  style?: 'bullets' | 'paragraph' | 'executive' | 'same';
  fixes?: ('grammar' | 'clarity' | 'conciseness' | 'flow')[];
  variationCount?: number;
}

export interface RemixedEmail {
  body: string;
  changes: string[];
  confidence: number;
  metadata?: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

// ============================================================================
// AI Remix Service
// ============================================================================

export class AIRemixService {
  /**
   * Remix an existing email draft
   */
  async remixEmail(
    originalContent: string,
    options: RemixOptions
  ): Promise<RemixedEmail> {
    try {
      const systemPrompt = this.buildRemixPrompt(options);
      const userPrompt = `Original email:\n\n${originalContent}\n\nPlease transform this email according to the specifications.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error('No content generated');
      }

      // Format the content with proper HTML paragraphs
      const formattedContent = this.formatEmailBody(content.trim());

      return {
        body: formattedContent,
        changes: this.identifyChanges(options),
        confidence: 0.9,
        metadata: {
          model: completion.model,
          inputTokens: completion.usage?.prompt_tokens || 0,
          outputTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
      };
    } catch (error: any) {
      console.error('AI Remix error:', error);
      throw new Error(`Failed to remix email: ${error.message}`);
    }
  }

  /**
   * Generate multiple variations
   */
  async generateVariations(
    originalContent: string,
    options: RemixOptions
  ): Promise<RemixedEmail[]> {
    const count = options.variationCount || 3;
    const variations: RemixedEmail[] = [];

    const toneOptions: ToneType[] = ['professional', 'friendly', 'assertive'];

    for (let i = 0; i < count; i++) {
      const variation = await this.remixEmail(originalContent, {
        ...options,
        tone: toneOptions[i] || options.tone,
      });
      
      variations.push(variation);

      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return variations;
  }

  /**
   * Build remix prompt
   */
  private buildRemixPrompt(options: RemixOptions): string {
    let prompt = 'You are an expert email editor. Transform the provided email according to these specifications:\n\n';

    if (options.tone) {
      prompt += `TONE: Adjust to ${options.tone} tone\n`;
    }

    if (options.lengthAdjustment && options.lengthAdjustment !== 'same') {
      const adjustment = options.lengthAdjustment === 'shorter' 
        ? 'Make 30-50% shorter while keeping key points'
        : 'Expand with more detail and context';
      prompt += `LENGTH: ${adjustment}\n`;
    }

    if (options.style && options.style !== 'same') {
      prompt += `STYLE: Convert to ${options.style} format\n`;
    }

    if (options.fixes && options.fixes.length > 0) {
      prompt += `FIXES: ${options.fixes.join(', ')}\n`;
    }

    prompt += `\nFORMATTING REQUIREMENTS:
1. Use double line breaks (\\n\\n) to separate paragraphs - these will be converted to HTML <p> tags
2. Each paragraph should address one main idea
3. Use single line breaks (\\n) only for line breaks within a paragraph
4. Salutation line (e.g., "Best regards,") should be in its own final paragraph
5. Do NOT add extra blank paragraphs after the salutation
6. Ensure professional spacing between sections

CONTENT RULES:
1. Preserve the core message and intent
2. Keep all important facts and figures
3. Maintain the overall structure (greeting, body, closing with salutation)
4. Return ONLY the transformed email text (plain text, not HTML)
5. Do not add commentary or explanations

Return the transformed email with professional formatting:`;

    return prompt;
  }

  /**
   * Format email body with proper HTML paragraphs
   */
  private formatEmailBody(text: string): string {
    if (!text || text.trim().length === 0) {
      return '';
    }

    // If already contains HTML tags, assume it's formatted
    if (text.includes('<p>') || text.includes('<br')) {
      return text;
    }

    // Split by double newlines (paragraphs)
    const paragraphs = text
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    // Wrap each paragraph in <p> tags
    // CSS margin-bottom on <p> tags will provide spacing
    const formatted = paragraphs
      .map(p => {
        const withBreaks = p.replace(/\n/g, '<br>');
        return `<p>${withBreaks}</p>`;
      })
      .join('');

    return formatted;
  }

  /**
   * Identify what changes were made
   */
  private identifyChanges(options: RemixOptions): string[] {
    const changes: string[] = [];

    if (options.tone) {
      changes.push(`Adjusted tone to ${options.tone}`);
    }
    if (options.lengthAdjustment !== 'same') {
      changes.push(`Made ${options.lengthAdjustment}`);
    }
    if (options.style && options.style !== 'same') {
      changes.push(`Converted to ${options.style} format`);
    }
    if (options.fixes && options.fixes.length > 0) {
      changes.push(`Fixed: ${options.fixes.join(', ')}`);
    }

    return changes;
  }
}

// ============================================================================
// Singleton instance
// ============================================================================

export const aiRemixService = new AIRemixService();

