/**
 * Email Signatures API
 * GET: List all signatures for current user
 * POST: Create a new signature
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailSignatures, users, emailAccounts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { SignatureService } from '@/lib/signatures/signature-service';
import type { CreateSignatureRequest } from '@/lib/signatures/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
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

    // Get all signatures for this user
    const signatures = await db.query.emailSignatures.findMany({
      where: eq(emailSignatures.userId, dbUser.id),
      orderBy: (signatures, { desc }) => [desc(signatures.isDefault), desc(signatures.createdAt)],
    });

    return NextResponse.json({ signatures });
  } catch (error) {
    console.error('Error fetching signatures:', error);
    return NextResponse.json(
      { error: 'Failed to fetch signatures' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateSignatureRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.contentHtml) {
      return NextResponse.json(
        { error: 'Name and content are required' },
        { status: 400 }
      );
    }

    // Get user from database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If this is marked as default, unset other defaults
    if (body.isDefault) {
      await db.update(emailSignatures)
        .set({ isDefault: false })
        .where(eq(emailSignatures.userId, dbUser.id));
    }

    // Generate plain text version if not provided
    const contentText = body.contentText || SignatureService.htmlToPlainText(body.contentHtml);

    // Create signature
    const [signature] = await db.insert(emailSignatures).values({
      userId: dbUser.id,
      accountId: body.accountId || null,
      name: body.name,
      contentHtml: body.contentHtml,
      contentText,
      isDefault: body.isDefault ?? false,
      isActive: body.isActive ?? true,
      useForReplies: body.useForReplies ?? true,
      useForForwards: body.useForForwards ?? true,
    }).returning();

    return NextResponse.json({ signature });
  } catch (error) {
    console.error('Error creating signature:', error);
    return NextResponse.json(
      { error: 'Failed to create signature' },
      { status: 500 }
    );
  }
}

