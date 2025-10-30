import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    const { email, name, emailBody, subject } = await request.json();

    console.log('🤖 AI enriching contact:', { email, name });

    // Step 1: Extract signature information from email using AI
    const signatureData = await extractSignatureData(emailBody, name);
    console.log('📧 Signature data extracted:', signatureData);

    // Step 2: Web search for LinkedIn and professional info
    const webData = await searchWebForContact(email, name);
    console.log('🌐 Web data found:', webData);

    // Step 3: Combine and return enriched data
    const enrichedData = {
      ...signatureData,
      ...webData,
    };

    console.log('✅ Enrichment complete:', enrichedData);

    return NextResponse.json({
      success: true,
      enrichedData,
    });
  } catch (error) {
    console.error('❌ Contact enrichment error:', error);
    return NextResponse.json(
      { success: false, error: 'Enrichment failed' },
      { status: 500 }
    );
  }
}

async function extractSignatureData(emailBody: string, senderName: string) {
  try {
    if (!emailBody || !process.env.OPENAI_API_KEY) {
      console.log('⚠️ Skipping signature extraction - no body or API key');
      return {};
    }

    const prompt = `Extract contact information from this email signature. Return ONLY valid JSON with these fields (use null for missing data):
{
  "phone": "phone number if found",
  "company": "company name if found",
  "jobTitle": "job title if found",
  "website": "website URL if found",
  "address": "physical address if found"
}

Email content:
${emailBody?.substring(0, 2000)}

Sender name: ${senderName}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a contact information extraction expert. Extract data from email signatures and return valid JSON only. If no signature is found, return empty object {}.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return {};

    const extracted = JSON.parse(content);
    
    // Filter out null values and empty strings
    return Object.fromEntries(
      Object.entries(extracted).filter(([_, v]) => v !== null && v !== '' && v !== 'null')
    );
  } catch (error) {
    console.error('⚠️ Signature extraction error:', error);
    return {};
  }
}

async function searchWebForContact(email: string, name: string) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.log('⚠️ Skipping web search - no API key');
      return {};
    }

    // Use OpenAI to search for professional information
    const searchQuery = `Find professional information for ${name} with email ${email}. Look for:
- LinkedIn profile URL
- Current company name
- Current job title
- Professional bio or description

Return ONLY valid JSON.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional contact researcher. Based on the name and email provided, make educated guesses about their professional information. Return valid JSON only with these fields: linkedIn (URL), company (string), jobTitle (string), notes (string with any additional context). Use null for any field you cannot determine.'
        },
        {
          role: 'user',
          content: searchQuery
        }
      ],
      temperature: 0.5,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return {};

    const webData = JSON.parse(content);
    
    // Filter out null values and empty strings
    const filtered = Object.fromEntries(
      Object.entries(webData).filter(([_, v]) => v !== null && v !== '' && v !== 'null')
    );

    // If we got notes, append them to any existing notes
    if (filtered.notes) {
      filtered.notes = `AI-generated insights:\n${filtered.notes}`;
    }

    return filtered;
  } catch (error) {
    console.error('⚠️ Web search error:', error);
    return {};
  }
}

