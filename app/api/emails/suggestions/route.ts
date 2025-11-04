import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface Suggestion {
  email: string;
  name?: string;
  source: 'contact' | 'recent';
}

export const dynamic = 'force-dynamic';

// GET /api/emails/suggestions?query=john
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query')?.toLowerCase() || '';

    if (query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const suggestions: Suggestion[] = [];
    const seenEmails = new Set<string>();

    // 1. Search contacts first (higher priority)
    const { data: contacts } = await supabase
      .from('contacts')
      .select('email, first_name, last_name, display_name, full_name')
      .eq('user_id', user.id)
      .or(`email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(10);

    if (contacts) {
      for (const contact of contacts) {
        if (!contact.email) continue;
        const emailLower = contact.email.toLowerCase();
        if (seenEmails.has(emailLower)) continue;

        seenEmails.add(emailLower);
        suggestions.push({
          email: contact.email,
          name: contact.display_name || contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || undefined,
          source: 'contact',
        });
      }
    }

    // 2. Search recent email recipients (to/cc/bcc from sent emails)
    const { data: sentEmails } = await supabase
      .from('emails')
      .select('to_emails, cc_emails, from_email, from_name')
      .eq('account_id', user.id)
      .or(`to_emails::text.ilike.%${query}%,cc_emails::text.ilike.%${query}%,from_email.ilike.%${query}%`)
      .order('sent_at', { ascending: false })
      .limit(20);

    if (sentEmails) {
      for (const email of sentEmails) {
        // Extract recipients from to_emails
        const toEmails = Array.isArray(email.to_emails) ? email.to_emails : [];
        const ccEmails = Array.isArray(email.cc_emails) ? email.cc_emails : [];
        const allRecipients = [...toEmails, ...ccEmails];

        for (const recipient of allRecipients) {
          if (!recipient || typeof recipient !== 'object') continue;
          
          const recipientEmail = recipient.email?.toLowerCase();
          if (!recipientEmail) continue;
          if (seenEmails.has(recipientEmail)) continue;
          if (!recipientEmail.includes(query.toLowerCase())) continue;

          seenEmails.add(recipientEmail);
          suggestions.push({
            email: recipient.email,
            name: recipient.name || undefined,
            source: 'recent',
          });

          if (suggestions.length >= 15) break;
        }

        // Also check from_email for received emails
        if (email.from_email && !seenEmails.has(email.from_email.toLowerCase())) {
          const fromEmailLower = email.from_email.toLowerCase();
          if (fromEmailLower.includes(query.toLowerCase())) {
            seenEmails.add(fromEmailLower);
            suggestions.push({
              email: email.from_email,
              name: email.from_name || undefined,
              source: 'recent',
            });
          }
        }

        if (suggestions.length >= 15) break;
      }
    }

    // Sort: contacts first, then by name/email
    suggestions.sort((a, b) => {
      if (a.source !== b.source) {
        return a.source === 'contact' ? -1 : 1;
      }
      const aText = (a.name || a.email).toLowerCase();
      const bText = (b.name || b.email).toLowerCase();
      return aText.localeCompare(bText);
    });

    return NextResponse.json({
      success: true,
      suggestions: suggestions.slice(0, 10), // Limit to 10 results
    });
  } catch (error: any) {
    console.error('Error fetching email suggestions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch suggestions' },
      { status: 500 }
    );
  }
}

