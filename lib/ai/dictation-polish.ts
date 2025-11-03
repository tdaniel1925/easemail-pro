/**
 * Dictation Polish Service
 * 
 * Transforms raw dictated text into professional email format
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-build',
  dangerouslyAllowBrowser: true, // Only for API routes - not exposed to client
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
7. Structure with proper paragraphs
8. Maintain the original intent and meaning
9. Use ${tone} tone
10. DO NOT add information that wasn't in the original text
11. Generate a clear, concise subject line based on the email content

IMPORTANT: Format your response EXACTLY as follows:
SUBJECT: [Your subject line here]

BODY:
[Your polished email body here]`;

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
    const body = bodyMatch?.[1]?.trim() || response;

    return { subject, body };
  } catch (error) {
    console.error('Dictation polish error:', error);
    throw error;
  }
}

