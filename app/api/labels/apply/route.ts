import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emails, labels, emailLabels } from '@/lib/db/schema';
import { eq, inArray, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// POST /api/labels/apply - Apply labels to one or more emails
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { emailIds, labelIds } = await request.json();

    if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
      return NextResponse.json(
        { error: 'Email IDs are required' },
        { status: 400 }
      );
    }

    // Verify all labels belong to user
    if (labelIds && labelIds.length > 0) {
      const userLabels = await db.query.labels.findMany({
        where: and(
          eq(labels.userId, user.id),
          inArray(labels.id, labelIds)
        ),
      });

      if (userLabels.length !== labelIds.length) {
        return NextResponse.json(
          { error: 'Invalid label IDs' },
          { status: 400 }
        );
      }
    }

    // Delete existing label associations for these emails
    await db.delete(emailLabels)
      .where(inArray(emailLabels.emailId, emailIds));

    // Create new label associations and get label names
    let labelNames: string[] = [];
    if (labelIds && labelIds.length > 0) {
      // Get label names for JSONB field
      const userLabels = await db.query.labels.findMany({
        where: inArray(labels.id, labelIds),
      });
      labelNames = userLabels.map(l => l.name);

      // Create junction table entries
      const associations = [];
      for (const emailId of emailIds) {
        for (const labelId of labelIds) {
          associations.push({
            emailId,
            labelId,
          });
        }
      }

      if (associations.length > 0) {
        await db.insert(emailLabels).values(associations);
      }
    }

    // Also update the JSONB labels field for compatibility
    await db.update(emails)
      .set({
        labels: labelNames,
        updatedAt: new Date(),
      })
      .where(inArray(emails.id, emailIds));

    return NextResponse.json({
      success: true,
      message: `Labels applied to ${emailIds.length} email(s)`,
    });
  } catch (error: any) {
    console.error('Error applying labels:', error);
    return NextResponse.json(
      { error: 'Failed to apply labels', message: error.message },
      { status: 500 }
    );
  }
}

