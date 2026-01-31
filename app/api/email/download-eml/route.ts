import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';


export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');
    const accountId = searchParams.get('accountId');

    if (!messageId || !accountId) {
      return NextResponse.json(
        { error: 'Message ID and Account ID are required' },
        { status: 400 }
      );
    }

    // Fetch the full message from Nylas or database
    // For now, we'll construct an EML from the available data
    const messageResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/nylas-v3/messages/${messageId}?accountId=${accountId}`,
      {
        headers: {
          Cookie: request.headers.get('cookie') || '',
        },
      }
    );

    if (!messageResponse.ok) {
      throw new Error('Failed to fetch message');
    }

    const { message } = await messageResponse.json();

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Build EML content
    const emlContent = buildEmlContent(message);

    // Generate filename from subject
    const safeSubject = (message.subject || 'email')
      .replace(/[^a-z0-9]/gi, '_')
      .substring(0, 50);
    const filename = `${safeSubject}.eml`;

    // Return as downloadable file
    return new NextResponse(emlContent, {
      headers: {
        'Content-Type': 'message/rfc822',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error downloading email:', error);
    return NextResponse.json(
      { error: 'Failed to download email' },
      { status: 500 }
    );
  }
}

function buildEmlContent(message: any): string {
  const lines: string[] = [];
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Date
  const date = message.date
    ? new Date(typeof message.date === 'number' ? message.date * 1000 : message.date)
    : new Date();
  lines.push(`Date: ${date.toUTCString()}`);

  // From
  if (message.from && message.from.length > 0) {
    const from = message.from[0];
    lines.push(`From: ${from.name ? `"${from.name}" <${from.email}>` : from.email}`);
  }

  // To
  if (message.to && message.to.length > 0) {
    const to = message.to.map((r: any) =>
      r.name ? `"${r.name}" <${r.email}>` : r.email
    ).join(', ');
    lines.push(`To: ${to}`);
  }

  // CC
  if (message.cc && message.cc.length > 0) {
    const cc = message.cc.map((r: any) =>
      r.name ? `"${r.name}" <${r.email}>` : r.email
    ).join(', ');
    lines.push(`Cc: ${cc}`);
  }

  // Subject
  lines.push(`Subject: ${message.subject || '(No Subject)'}`);

  // Message-ID
  if (message.messageId) {
    lines.push(`Message-ID: <${message.messageId}>`);
  } else {
    lines.push(`Message-ID: <${message.id}@easemail.app>`);
  }

  // Thread-ID
  if (message.threadId) {
    lines.push(`X-Thread-Id: ${message.threadId}`);
  }

  // MIME headers
  lines.push('MIME-Version: 1.0');

  const hasHtml = !!message.body || !!message.bodyHtml;
  const hasText = !!message.bodyText || !!message.snippet;

  if (hasHtml && hasText) {
    // Multipart message
    lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    lines.push('');

    // Text part
    lines.push(`--${boundary}`);
    lines.push('Content-Type: text/plain; charset=utf-8');
    lines.push('Content-Transfer-Encoding: quoted-printable');
    lines.push('');
    lines.push(encodeQuotedPrintable(message.bodyText || message.snippet || ''));
    lines.push('');

    // HTML part
    lines.push(`--${boundary}`);
    lines.push('Content-Type: text/html; charset=utf-8');
    lines.push('Content-Transfer-Encoding: quoted-printable');
    lines.push('');
    lines.push(encodeQuotedPrintable(message.body || message.bodyHtml || ''));
    lines.push('');

    lines.push(`--${boundary}--`);
  } else if (hasHtml) {
    lines.push('Content-Type: text/html; charset=utf-8');
    lines.push('Content-Transfer-Encoding: quoted-printable');
    lines.push('');
    lines.push(encodeQuotedPrintable(message.body || message.bodyHtml || ''));
  } else {
    lines.push('Content-Type: text/plain; charset=utf-8');
    lines.push('Content-Transfer-Encoding: quoted-printable');
    lines.push('');
    lines.push(encodeQuotedPrintable(message.bodyText || message.snippet || ''));
  }

  return lines.join('\r\n');
}

function encodeQuotedPrintable(str: string): string {
  return str
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      if (
        (code >= 33 && code <= 60) ||
        (code >= 62 && code <= 126) ||
        code === 9 ||
        code === 32
      ) {
        return char;
      }
      if (code === 10 || code === 13) {
        return char;
      }
      return '=' + code.toString(16).toUpperCase().padStart(2, '0');
    })
    .join('')
    .replace(/(.{75})/g, '$1=\r\n');
}
