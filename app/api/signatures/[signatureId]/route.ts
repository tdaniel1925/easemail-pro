/**
 * Individual Signature API
 * GET: Get a specific signature
 * PUT: Update a signature
 * DELETE: Delete a signature
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailSignatures, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { SignatureService } from '@/lib/signatures/signature-service';
import type { UpdateSignatureRequest } from '@/lib/signatures/types';

type RouteContext = {
  params: Promise<{ signatureId: string }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { signatureId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get signature
    const signature = await db.query.emailSignatures.findFirst({
      where: and(
        eq(emailSignatures.id, signatureId),
        eq(emailSignatures.userId, dbUser.id)
      ),
    });

    if (!signature) {
      return NextResponse.json({ error: 'Signature not found' }, { status: 404 });
    }

    return NextResponse.json({ signature });
  } catch (error) {
    console.error('Error fetching signature:', error);
    return NextResponse.json(
      { error: 'Failed to fetch signature' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { signatureId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: Partial<UpdateSignatureRequest> = await request.json();

    // Get user from database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify ownership
    const existingSignature = await db.query.emailSignatures.findFirst({
      where: and(
        eq(emailSignatures.id, signatureId),
        eq(emailSignatures.userId, dbUser.id)
      ),
    });

    if (!existingSignature) {
      return NextResponse.json({ error: 'Signature not found' }, { status: 404 });
    }

    // If marking as default, unset other defaults
    if (body.isDefault) {
      await db.update(emailSignatures)
        .set({ isDefault: false })
        .where(and(
          eq(emailSignatures.userId, dbUser.id),
          eq(emailSignatures.id, signatureId)
        ));
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.contentHtml !== undefined) {
      updateData.contentHtml = body.contentHtml;
      updateData.contentText = body.contentText || SignatureService.htmlToPlainText(body.contentHtml);
    }
    if (body.accountId !== undefined) updateData.accountId = body.accountId;
    if (body.isDefault !== undefined) updateData.isDefault = body.isDefault;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.useForReplies !== undefined) updateData.useForReplies = body.useForReplies;
    if (body.useForForwards !== undefined) updateData.useForForwards = body.useForForwards;

    // Update signature
    const [signature] = await db.update(emailSignatures)
      .set(updateData)
      .where(eq(emailSignatures.id, signatureId))
      .returning();

    return NextResponse.json({ signature });
  } catch (error) {
    console.error('Error updating signature:', error);
    return NextResponse.json(
      { error: 'Failed to update signature' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { signatureId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify ownership
    const existingSignature = await db.query.emailSignatures.findFirst({
      where: and(
        eq(emailSignatures.id, signatureId),
        eq(emailSignatures.userId, dbUser.id)
      ),
    });

    if (!existingSignature) {
      return NextResponse.json({ error: 'Signature not found' }, { status: 404 });
    }

    // Delete signature
    await db.delete(emailSignatures)
      .where(eq(emailSignatures.id, signatureId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting signature:', error);
    return NextResponse.json(
      { error: 'Failed to delete signature' },
      { status: 500 }
    );
  }
}

