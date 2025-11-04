/**
 * Dictation Polish Service
 * 
 * Transforms raw dictated text into professional email format
 */

import OpenAI from 'openai';

// ✅ SECURITY: Ensure this module is NEVER imported client-side
if (typeof window !== 'undefined') {
  throw new Error('dictation-polish must only be imported server-side (contains API keys)');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-build',
});

export interface PolishOptions {
  text: string;
  recipientName?: string;
  tone?: 'professional' | 'friendly' | 'casual';
}

export interface PolishedResult {
  subject: string;
  body: string;
}

export async function polishDictation(options: PolishOptions): Promise<PolishedResult> {
  const { text, recipientName, tone = 'professional' } = options;

  const systemPrompt = `You are an expert email writing assistant. Transform raw dictated speech into a polished, professional email with a subject line.

RULES:
1. Fix grammar, spelling, and punctuation
2. Add proper capitalization
3. Remove filler words ("um", "uh", "like", "you know")
4. Add appropriate greeting if missing (use recipient name if provided)
5. Add professional closing if missing ("Best regards,", "Thanks,", etc.)
6. Convert casual speech patterns into formal writing
7. Structure with proper paragraphs using HTML formatting
8. Maintain the original intent and meaning
9. Use ${tone} tone
10. DO NOT add information that wasn't in the original text
11. Generate a clear, concise subject line based on the email content
12. Format email body with <p> tags for paragraphs and <br> for line breaks within paragraphs
13. Each paragraph should address one main idea with clear spacing

IMPORTANT: Format your response EXACTLY as follows:
SUBJECT: [Your subject line here]

BODY:
<p>[First paragraph with greeting]</p>

<p>[Main content paragraph]</p>

<p>[Closing paragraph]</p>`;

  const userPrompt = recipientName
    ? `Recipient: ${recipientName}\n\nDictated text:\n${text}`
    : `Dictated text:\n${text}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const response = completion.choices[0]?.message?.content?.trim();
    
    if (!response) {
      throw new Error('Failed to generate polished text');
    }

    // Parse the response to extract subject and body
    const subjectMatch = response.match(/SUBJECT:\s*(.+?)(?:\n|$)/i);
    const bodyMatch = response.match(/BODY:\s*([\s\S]+)/i);

    const subject = subjectMatch?.[1]?.trim() || 'No Subject';
    let body = bodyMatch?.[1]?.trim() || response;

    // Format body to HTML if it's not already formatted
    body = formatEmailBody(body);

    return { subject, body };
  } catch (error) {
    console.error('Dictation polish error:', error);
    throw error;
  }
}

/**
 * Format plain text email to HTML with proper paragraph spacing
 */
function formatEmailBody(body: string): string {
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

