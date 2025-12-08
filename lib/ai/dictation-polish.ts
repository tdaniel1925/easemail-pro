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

  const systemPrompt = `You are an expert email writing assistant. Transform raw dictated speech into a polished, send-ready email with a subject line.

RULES:
1. Fix grammar, spelling, and punctuation
2. Add proper capitalization
3. Remove filler words ("um", "uh", "like", "you know")
4. Add appropriate greeting if missing (use recipient name if provided)
5. Add professional closing if missing
6. Convert casual speech patterns into ${tone} writing
7. Maintain the original intent and meaning
8. DO NOT add information that wasn't in the original text
9. Generate a clear, concise subject line

EXACT EMAIL STRUCTURE (follow precisely):
1. GREETING LINE: "Hi [Name]," or "Dear [Name]," - standalone on its own line
2. BLANK LINE after greeting (exactly one)
3. BODY PARAGRAPHS: Main content with proper paragraph breaks between distinct ideas
4. BLANK LINE before closing
5. CLOSING SENTENCE: A final sentence (if appropriate)
6. BLANK LINE before salutation
7. SALUTATION: "Thank you!" or "Best regards," or "Thanks," - standalone on its own line

EXAMPLE OUTPUT:
Hi John,

Good morning. I wanted to follow up on our discussion from yesterday. The project timeline looks good and I think we can move forward with the proposed schedule.

Please let me know if you have any questions or concerns. I am available to discuss this further at your convenience.

Thank you!

Best regards,

RESPONSE FORMAT:
SUBJECT: [Your subject line here]

BODY:
Hi [Name],

[Body paragraph 1]

[Body paragraph 2 if needed]

[Closing sentence]

[Salutation]

CRITICAL:
- Use \\n\\n between ALL sections
- NO wall of text - break up long content into paragraphs
- NO extra blank lines beyond the structure above`;

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
 * Uses <p><br></p> between sections to create visible blank lines in TipTap editor
 *
 * Email structure:
 * 1. Greeting (e.g., "Hi John,")
 * 2. BLANK LINE
 * 3. Body paragraphs
 * 4. BLANK LINE
 * 5. Salutation (e.g., "Best regards,")
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

  // Build HTML with proper blank lines between sections
  // Each double newline in the source text becomes a <p><br></p> (empty paragraph)
  // This creates visible blank lines in TipTap editor
  const result: string[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const pWithBreaks = p.replace(/\n/g, '<br>');
    result.push(`<p>${pWithBreaks}</p>`);

    // Add blank line after each paragraph except the last
    if (i < paragraphs.length - 1) {
      result.push('<p><br></p>');
    }
  }

  return result.join('');
}

