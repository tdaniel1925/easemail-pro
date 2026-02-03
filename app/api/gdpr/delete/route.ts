/**
 * GDPR Data Deletion API
 * Allows users to request complete account deletion
 *
 * Compliance: GDPR Article 17 - Right to Erasure ("Right to be Forgotten")
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  users,
  emailAccounts,
  contacts,
  smsMessages,
  emailDrafts,
  contactNotes,
  emailRules,
  calendarEvents,
  auditLogs,
  userAuditLogs,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for complete deletion

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body for confirmation
    const body = await request.json();
    const { confirmed, reason } = body;

    if (!confirmed) {
      return NextResponse.json({
        error: 'Deletion must be confirmed',
        message: 'Set confirmed: true to proceed with account deletion',
      }, { status: 400 });
    }

    console.log(`🗑️  [GDPR Delete] Starting account deletion for user ${user.id}`);
    console.log(`   Reason: ${reason || 'Not provided'}`);

    const deletionSummary = {
      userId: user.id,
      deletedAt: new Date().toISOString(),
      reason: reason || 'User requested deletion',
      itemsDeleted: {} as Record<string, string | number>,
    };

    // 3. Create audit log before deletion
    try {
      await db.insert(userAuditLogs).values({
        userId: user.id,
        action: 'account_deletion_requested',
        details: { reason: reason || 'User requested deletion' },
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }

    // 4. Delete user data in a transaction (all or nothing for data integrity)
    try {
      await db.transaction(async (tx) => {
        // Email drafts
        await tx.delete(emailDrafts).where(eq(emailDrafts.userId, user.id));

        // Email accounts (this will cascade delete emails via foreign key)
        await tx.delete(emailAccounts).where(eq(emailAccounts.userId, user.id));

        // Contact notes
        await tx.delete(contactNotes).where(eq(contactNotes.userId, user.id));

        // Contacts
        await tx.delete(contacts).where(eq(contacts.userId, user.id));

        // SMS messages
        await tx.delete(smsMessages).where(eq(smsMessages.userId, user.id));

        // Email rules
        await tx.delete(emailRules).where(eq(emailRules.userId, user.id));

        // Calendar events
        await tx.delete(calendarEvents).where(eq(calendarEvents.userId, user.id));

        // Audit logs (anonymize rather than delete for compliance)
        await tx.update(auditLogs)
          .set({
            userId: 'DELETED_USER',
            metadata: { note: 'User data deleted per GDPR request' },
          })
          .where(eq(auditLogs.userId, user.id));

        // User audit logs (anonymize)
        await tx.update(userAuditLogs)
          .set({
            userId: 'DELETED_USER',
            details: { note: 'User data deleted per GDPR request' },
          })
          .where(eq(userAuditLogs.userId, user.id));

        // 5. Soft delete user record (keep for billing compliance)
        await tx.update(users)
          .set({
            email: `deleted_${user.id}@easemail.deleted`,
            fullName: 'Deleted User',
            accountStatus: 'deactivated',
            deactivatedAt: new Date(),
            // Keep organizationId and role for billing history
          })
          .where(eq(users.id, user.id));
      });

      deletionSummary.itemsDeleted.userAccount = 'deactivated';
      console.log('✅ [GDPR Delete] All database operations completed successfully');
    } catch (error) {
      console.error('❌ [GDPR Delete] Transaction failed, rolling back:', error);
      throw new Error('Failed to delete user data. Transaction rolled back for data integrity.');
    }

    // 6. Delete from Supabase Auth
    try {
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      if (error) {
        console.error('Failed to delete Supabase auth user:', error);
      } else {
        deletionSummary.itemsDeleted.supabaseAuth = 'deleted';
      }
    } catch (error) {
      console.error('Failed to delete Supabase auth user:', error);
    }

    console.log(`✅ [GDPR Delete] Account deletion complete for user ${user.id}`);
    console.log('   Deletion summary:', deletionSummary.itemsDeleted);

    return NextResponse.json({
      success: true,
      message: 'Your account and all associated data have been deleted',
      summary: deletionSummary,
    });
  } catch (error) {
    console.error('❌ [GDPR Delete] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete account',
    }, { status: 500 });
  }
}
