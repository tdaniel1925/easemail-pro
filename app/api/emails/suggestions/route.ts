import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface Suggestion {
  email: string;
  name?: string;
  source: 'contact' | 'recent';
}

/**
 * Check if email is a placeholder email that should be filtered out
 * Placeholder emails follow the pattern: no-email-*@placeholder.local
 */
function isPlaceholderEmail(email: string): boolean {
  if (!email) return true;
  const emailLower = email.toLowerCase();
  return emailLower.includes('@placeholder.local') || emailLower.startsWith('no-email-');
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
    const showRecent = searchParams.get('recent') === 'true';

    const suggestions: Suggestion[] = [];
    const seenEmails = new Set<string>();

    // If no query and recent flag is set, show most recently emailed contacts
    if (!query && showRecent) {
      const { data: recentSentEmails } = await supabase
        .from('emails')
        .select('to_emails, cc_emails, sent_at')
        .eq('folder', 'sent')
        .order('sent_at', { ascending: false })
        .limit(20);

      if (recentSentEmails) {
        for (const email of recentSentEmails) {
          const toEmails = Array.isArray(email.to_emails) ? email.to_emails : [];
          const ccEmails = Array.isArray(email.cc_emails) ? email.cc_emails : [];
          const allRecipients = [...toEmails, ...ccEmails];

          for (const recipient of allRecipients) {
            if (!recipient || typeof recipient !== 'object') continue;
            const recipientEmail = recipient.email?.toLowerCase();
            if (!recipientEmail || seenEmails.has(recipientEmail)) continue;

            // Skip placeholder emails
            if (isPlaceholderEmail(recipientEmail)) continue;

            seenEmails.add(recipientEmail);
            suggestions.push({
              email: recipient.email,
              name: recipient.name || undefined,
              source: 'recent',
            });

            if (suggestions.length >= 8) break;
          }

          if (suggestions.length >= 8) break;
        }
      }

      return NextResponse.json({
        success: true,
        suggestions: suggestions.slice(0, 8),
      });
    }

    if (query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

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

        // Skip placeholder emails
        if (isPlaceholderEmail(emailLower)) continue;

        seenEmails.add(emailLower);
        suggestions.push({
          email: contact.email,
          name: contact.display_name || contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || undefined,
          source: 'contact',
        });
      }
    }

    // 2. Search recipients from SENT emails (folder = 'sent')
    const { data: sentEmails } = await supabase
      .from('emails')
      .select('to_emails, cc_emails, bcc_emails, sent_at')
      .eq('folder', 'sent')
      .or(`to_emails::text.ilike.%${query}%,cc_emails::text.ilike.%${query}%,bcc_emails::text.ilike.%${query}%`)
      .order('sent_at', { ascending: false })
      .limit(50); // Check more sent emails for better history

    if (sentEmails) {
      for (const email of sentEmails) {
        // Extract recipients from to_emails, cc_emails, bcc_emails
        const toEmails = Array.isArray(email.to_emails) ? email.to_emails : [];
        const ccEmails = Array.isArray(email.cc_emails) ? email.cc_emails : [];
        const bccEmails = Array.isArray(email.bcc_emails) ? email.bcc_emails : [];
        const allRecipients = [...toEmails, ...ccEmails, ...bccEmails];

        for (const recipient of allRecipients) {
          if (!recipient || typeof recipient !== 'object') continue;

          const recipientEmail = recipient.email?.toLowerCase();
          if (!recipientEmail) continue;
          if (seenEmails.has(recipientEmail)) continue;

          // Skip placeholder emails
          if (isPlaceholderEmail(recipientEmail)) continue;

          // Check if email or name matches query
          const recipientName = recipient.name?.toLowerCase() || '';
          if (!recipientEmail.includes(query.toLowerCase()) && !recipientName.includes(query.toLowerCase())) {
            continue;
          }

          seenEmails.add(recipientEmail);
          suggestions.push({
            email: recipient.email,
            name: recipient.name || undefined,
            source: 'recent',
          });

          if (suggestions.length >= 15) break;
        }

        if (suggestions.length >= 15) break;
      }
    }

    // 3. Also check FROM addresses in received emails (people who emailed you)
    if (suggestions.length < 15) {
      const { data: receivedEmails } = await supabase
        .from('emails')
        .select('from_email, from_name')
        .neq('folder', 'sent') // Not sent emails
        .or(`from_email.ilike.%${query}%,from_name.ilike.%${query}%`)
        .order('received_at', { ascending: false })
        .limit(20);

      if (receivedEmails) {
        for (const email of receivedEmails) {
          if (!email.from_email) continue;
          const fromEmailLower = email.from_email.toLowerCase();
          if (seenEmails.has(fromEmailLower)) continue;

          // Skip placeholder emails
          if (isPlaceholderEmail(fromEmailLower)) continue;

          seenEmails.add(fromEmailLower);
          suggestions.push({
            email: email.from_email,
            name: email.from_name || undefined,
            source: 'recent',
          });

          if (suggestions.length >= 15) break;
        }
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

