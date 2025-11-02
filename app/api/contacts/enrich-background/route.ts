/**
 * Background Contact Enrichment API
 * Enriches a contact and saves directly to database
 * Can run independently of the frontend modal
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { contacts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contactId, email, name, emailBody, subject } = await request.json();

    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact ID is required' },
        { status: 400 }
      );
    }

    console.log('🔄 Starting background enrichment for contact:', contactId);

    // Mark enrichment as in progress
    await db.update(contacts)
      .set({ 
        notes: 'Enriching contact information...',
        updatedAt: new Date() 
      })
      .where(eq(contacts.id, contactId));

    // Step 1: Extract signature data
    const signatureData = await extractSignatureData(emailBody, name);
    console.log('📧 Signature data extracted:', signatureData);

    // Step 2: Web search for professional info
    const webData = await searchWebForContact(email, name);
    console.log('🌐 Web data found:', webData);

    // Step 3: Combine enriched data
    const enrichedData = {
      ...signatureData,
      ...webData,
    };

    // Step 4: Update contact in database
    const updateData: any = {};
    
    if (enrichedData.phone) updateData.phone = enrichedData.phone;
    if (enrichedData.company) updateData.company = enrichedData.company;
    if (enrichedData.jobTitle) updateData.jobTitle = enrichedData.jobTitle;
    if (enrichedData.website) updateData.website = enrichedData.website;
    if (enrichedData.linkedIn) updateData.linkedinUrl = enrichedData.linkedIn;
    if (enrichedData.twitter) updateData.twitterHandle = enrichedData.twitter;
    if (enrichedData.address) updateData.location = enrichedData.address;
    
    // Update notes with AI insights
    if (enrichedData.notes) {
      updateData.notes = enrichedData.notes;
    } else {
      // Clear the "enriching" message
      updateData.notes = null;
    }
    
    updateData.updatedAt = new Date();

    // Only update if we have data to update
    if (Object.keys(updateData).length > 1) { // More than just updatedAt
      await db.update(contacts)
        .set(updateData)
        .where(eq(contacts.id, contactId));

      console.log('✅ Background enrichment complete for contact:', contactId);

      return NextResponse.json({
        success: true,
        enrichedData,
        fieldsUpdated: Object.keys(updateData).filter(k => k !== 'updatedAt').length,
      });
    } else {
      // No data found
      await db.update(contacts)
        .set({ 
          notes: null,
          updatedAt: new Date() 
        })
        .where(eq(contacts.id, contactId));

      console.log('⚠️ No enrichment data found for contact:', contactId);

      return NextResponse.json({
        success: true,
        enrichedData: {},
        fieldsUpdated: 0,
      });
    }
  } catch (error: any) {
    console.error('❌ Background enrichment error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Enrichment failed' },
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

