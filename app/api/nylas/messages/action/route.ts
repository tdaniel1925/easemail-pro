/**
 * API Route: Email Actions
 * 
 * Handles email actions with optimistic UI support:
 * - markRead/markUnread
 * - star/unstar
 * - move
 * - delete
 * - archive
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { emails, emailAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { emailId, action, folder } = await request.json();

    if (!emailId || !action) {
      return NextResponse.json({
        success: false,
        error: 'Email ID and action required',
      }, { status: 400 });
    }

    // ✅ Security: Validate user owns this email
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    // Get email and verify ownership
    const email = await db.query.emails.findFirst({
      where: eq(emails.id, emailId),
    });

    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'Email not found',
      }, { status: 404 });
    }

    // Verify account ownership
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, email.accountId),
    });

    if (!account || account.userId !== user.id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
      }, { status: 403 });
    }

    // Perform action
    let updateData: any = {};

    switch (action) {
      case 'markRead':
        updateData = { isRead: true };
        break;
      case 'markUnread':
        updateData = { isRead: false };
        break;
      case 'star':
        updateData = { isStarred: true };
        break;
      case 'unstar':
        updateData = { isStarred: false };
        break;
      case 'move':
        if (!folder) {
          return NextResponse.json({
            success: false,
            error: 'Folder required for move action',
          }, { status: 400 });
        }
        updateData = { folder };
        break;
      case 'delete':
        updateData = { isTrashed: true };
        break;
      case 'archive':
        updateData = { isArchived: true };
        break;
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`,
        }, { status: 400 });
    }

    // Update database
    await db.update(emails)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(emails.id, emailId));

    console.log(`✅ Email action ${action} completed for email ${emailId}`);

    return NextResponse.json({
      success: true,
      action,
      emailId,
    });
  } catch (error) {
    console.error('❌ Email action error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    }, { status: 500 });
  }
}

