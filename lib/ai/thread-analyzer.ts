import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

interface ThreadEmail {
  id: string;
  subject: string | null;
  fromName: string | null;
  fromEmail: string | null;
  snippet: string | null;
  bodyPlainText: string | null;
  receivedAt: Date;
}

interface ThreadAnalysis {
  summary: string;
  keyTopics: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

export async function generateThreadSummary(
  emails: ThreadEmail[]
): Promise<ThreadAnalysis> {
  try {
    // Prepare email context for AI
    const emailsContext = emails
      .sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime())
      .map((email, index) => {
        const date = new Date(email.receivedAt).toLocaleString();
        const from = email.fromName || email.fromEmail || 'Unknown';
        const content = email.bodyPlainText || email.snippet || '(No content)';

        return `Email ${index + 1} (${date})
From: ${from}
Subject: ${email.subject || '(No Subject)'}
Content: ${content.substring(0, 500)}${content.length > 500 ? '...' : ''}
---`;
      })
      .join('\n\n');

    const prompt = `Analyze this email thread and provide a comprehensive summary:

${emailsContext}

Please provide:
1. A concise 2-3 sentence summary of the entire conversation
2. Key topics discussed (up to 5 topics as comma-separated values)
3. Overall sentiment (positive, neutral, or negative)

Format your response as JSON:
{
  "summary": "Your 2-3 sentence summary here",
  "keyTopics": ["topic1", "topic2", "topic3"],
  "sentiment": "positive" | "neutral" | "negative"
}`;

    console.log('[Thread Analyzer] Generating summary for', emails.length, 'emails');

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
      temperature: 0.7,
    });

    console.log('[Thread Analyzer] AI Response:', text);

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const analysis = JSON.parse(jsonMatch[0]) as ThreadAnalysis;

    // Validate response
    if (!analysis.summary || !Array.isArray(analysis.keyTopics) || !analysis.sentiment) {
      throw new Error('Invalid AI response format');
    }

    return {
      summary: analysis.summary,
      keyTopics: analysis.keyTopics.slice(0, 5),
      sentiment: analysis.sentiment,
    };
  } catch (error) {
    console.error('[Thread Analyzer] Error:', error);

    // Fallback summary
    return {
      summary: `This thread contains ${emails.length} messages exchanged between ${
        new Set(emails.map((e) => e.fromEmail)).size
      } participants. The conversation started on ${new Date(
        emails[0].receivedAt
      ).toLocaleDateString()} and the latest message was received on ${new Date(
        emails[emails.length - 1].receivedAt
      ).toLocaleDateString()}.`,
      keyTopics: [emails[0].subject || 'General Discussion'].filter(Boolean),
      sentiment: 'neutral',
    };
  }
}
