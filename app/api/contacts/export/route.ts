import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { contacts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * Export contacts to CSV format
 * GET /api/contacts/export?format=csv
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';

    // Get all user contacts (limit to 10,000 to prevent OOM)
    const MAX_EXPORT = 10000;
    const allContacts = await db.query.contacts.findMany({
      where: eq(contacts.userId, user.id),
      orderBy: (contacts, { desc }) => [desc(contacts.createdAt)],
      limit: MAX_EXPORT,
    });

    console.log(`📤 Exporting ${allContacts.length} contacts as ${format}`);

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'First Name',
        'Last Name',
        'Email',
        'Phone',
        'Company',
        'Job Title',
        'Department',
        'Location',
        'Website',
        'LinkedIn',
        'Twitter',
        'Tags',
        'Notes',
      ];

      const rows = allContacts.map(contact => [
        contact.firstName || '',
        contact.lastName || '',
        contact.email || '',
        contact.phone || '',
        contact.company || '',
        contact.jobTitle || '',
        contact.department || '',
        contact.location || '',
        contact.website || '',
        contact.linkedinUrl || '',
        contact.twitterHandle || '',
        Array.isArray(contact.tags) ? contact.tags.join(', ') : '',
        contact.notes || '',
      ]);

      // Escape CSV values
      const escapeCsvValue = (value: string) => {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(escapeCsvValue).join(','))
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="easemail-contacts-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    } else if (format === 'json') {
      // Export as JSON
      return new NextResponse(JSON.stringify(allContacts, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="easemail-contacts-${new Date().toISOString().split('T')[0]}.json"`,
        },
      });
    } else if (format === 'vcard') {
      // Export as vCard format (for importing into other apps)
      const vcards = allContacts.map(contact => {
        const lines = [
          'BEGIN:VCARD',
          'VERSION:3.0',
        ];

        if (contact.fullName) {
          lines.push(`FN:${contact.fullName}`);
        }
        if (contact.firstName || contact.lastName) {
          lines.push(`N:${contact.lastName || ''};${contact.firstName || ''};;;`);
        }
        if (contact.email) {
          lines.push(`EMAIL;TYPE=INTERNET:${contact.email}`);
        }
        if (contact.phone) {
          lines.push(`TEL;TYPE=CELL:${contact.phone}`);
        }
        if (contact.company) {
          lines.push(`ORG:${contact.company}`);
        }
        if (contact.jobTitle) {
          lines.push(`TITLE:${contact.jobTitle}`);
        }
        if (contact.website) {
          lines.push(`URL:${contact.website}`);
        }
        if (contact.notes) {
          lines.push(`NOTE:${contact.notes.replace(/\n/g, '\\n')}`);
        }

        lines.push('END:VCARD');
        return lines.join('\n');
      });

      const vcardContent = vcards.join('\n\n');

      return new NextResponse(vcardContent, {
        headers: {
          'Content-Type': 'text/vcard',
          'Content-Disposition': `attachment; filename="easemail-contacts-${new Date().toISOString().split('T')[0]}.vcf"`,
        },
      });
    }

    return NextResponse.json(
      { error: 'Unsupported format. Use csv, json, or vcard' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('❌ Export error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export contacts' },
      { status: 500 }
    );
  }
}
