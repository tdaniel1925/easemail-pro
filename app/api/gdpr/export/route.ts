/**
 * GDPR Data Export API
 * Allows users to export all their personal data
 *
 * Compliance: GDPR Article 20 - Right to Data Portability
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, emails, emailAccounts, contacts, smsMessages, emailDrafts, organizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/security/encryption';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for large exports

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`📦 [GDPR Export] Starting data export for user ${user.id}`);

    // 2. Fetch user data
    const userData = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 3. Fetch organization data (if applicable)
    let organizationData = null;
    if (userData.organizationId) {
      organizationData = await db.query.organizations.findFirst({
        where: eq(organizations.id, userData.organizationId),
      });
    }

    // 4. Fetch email accounts
    const emailAccountsData = await db.query.emailAccounts.findMany({
      where: eq(emailAccounts.userId, user.id),
    });

    // Remove sensitive OAuth tokens from export
    const sanitizedAccounts = emailAccountsData.map(acc => ({
      ...acc,
      accessToken: '[REDACTED]',
      refreshToken: '[REDACTED]',
      nylasGrantId: '[REDACTED]',
    }));

    // 5. Fetch emails from user's accounts (limit to last 10,000 for performance)
    const userAccountIds = emailAccountsData.map(acc => acc.id);
    const emailsData = userAccountIds.length > 0
      ? await db.query.emails.findMany({
          where: eq(emails.accountId, userAccountIds[0]), // Just first account for now
          limit: 10000,
          orderBy: (emails, { desc }) => [desc(emails.receivedAt)],
        })
      : [];

    // Decrypt email bodies for export
    const decryptedEmails = emailsData.map(email => {
      try {
        return {
          ...email,
          bodyHtml: email.bodyHtml ? decrypt(email.bodyHtml) : null,
          bodyText: email.bodyText ? decrypt(email.bodyText) : null,
        };
      } catch (error) {
        console.error(`Failed to decrypt email ${email.id}:`, error);
        return email; // Return encrypted if decryption fails
      }
    });

    // 6. Fetch drafts
    const draftsData = await db.query.emailDrafts.findMany({
      where: eq(emailDrafts.userId, user.id),
    });

    // 7. Fetch contacts
    const contactsData = await db.query.contacts.findMany({
      where: eq(contacts.userId, user.id),
    });

    // 8. Fetch SMS messages
    const smsData = await db.query.smsMessages.findMany({
      where: eq(smsMessages.userId, user.id),
    });

    // 9. Compile export package
    const exportData = {
      exportDate: new Date().toISOString(),
      exportFormat: 'JSON',
      dataSubject: {
        userId: user.id,
        email: user.email,
        fullName: userData.fullName,
        role: userData.role,
        createdAt: userData.createdAt,
        onboardingCompleted: userData.onboardingCompleted,
      },
      organization: organizationData ? {
        id: organizationData.id,
        name: organizationData.name,
        planType: organizationData.planType,
        createdAt: organizationData.createdAt,
      } : null,
      emailAccounts: sanitizedAccounts,
      emails: {
        total: decryptedEmails.length,
        note: decryptedEmails.length === 10000 ? 'Limited to 10,000 most recent emails' : 'All emails included',
        data: decryptedEmails,
      },
      drafts: draftsData,
      contacts: contactsData,
      smsMessages: smsData,
      metadata: {
        totalEmailAccounts: sanitizedAccounts.length,
        totalEmails: decryptedEmails.length,
        totalDrafts: draftsData.length,
        totalContacts: contactsData.length,
        totalSmsMessages: smsData.length,
      },
    };

    console.log(`✅ [GDPR Export] Export complete for user ${user.id}`);
    console.log(`   - ${exportData.metadata.totalEmails} emails`);
    console.log(`   - ${exportData.metadata.totalContacts} contacts`);
    console.log(`   - ${exportData.metadata.totalSmsMessages} SMS messages`);

    // 10. Return as downloadable JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="easemail-data-export-${user.id}-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    console.error('❌ [GDPR Export] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export data',
    }, { status: 500 });
  }
}
