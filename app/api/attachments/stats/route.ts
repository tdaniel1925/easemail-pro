/**
 * Attachments API Route - Statistics
 * GET /api/attachments/stats
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { attachments } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Default test user ID (same as contacts)
    const userId = '00000000-0000-0000-0000-000000000000';

    // Get basic stats
    const [statsResult] = await db
      .select({
        totalAttachments: sql<number>`count(*)::int`,
        totalSizeBytes: sql<number>`sum(${attachments.fileSizeBytes})::bigint`,
        aiProcessedCount: sql<number>`count(*) filter (where ${attachments.aiProcessed} = true)::int`,
        invoiceCount: sql<number>`count(*) filter (where ${attachments.documentType} = 'invoice')::int`,
        receiptCount: sql<number>`count(*) filter (where ${attachments.documentType} = 'receipt')::int`,
        contractCount: sql<number>`count(*) filter (where ${attachments.documentType} = 'contract')::int`,
        imageCount: sql<number>`count(*) filter (where ${attachments.documentType} = 'image')::int`,
      })
      .from(attachments)
      .where(eq(attachments.userId, userId));

    // Get file type counts
    const fileTypeCounts = await db
      .select({
        extension: attachments.fileExtension,
        count: sql<number>`count(*)::int`,
      })
      .from(attachments)
      .where(eq(attachments.userId, userId))
      .groupBy(attachments.fileExtension);

    const fileTypeMap: Record<string, number> = {};
    fileTypeCounts.forEach((row) => {
      if (row.extension) {
        fileTypeMap[row.extension] = row.count;
      }
    });

    // Get top senders
    const topSenders = await db
      .select({
        email: attachments.senderEmail,
        name: attachments.senderName,
        count: sql<number>`count(*)::int`,
      })
      .from(attachments)
      .where(eq(attachments.userId, userId))
      .groupBy(attachments.senderEmail, attachments.senderName)
      .orderBy(sql`count(*) desc`)
      .limit(10);

    return NextResponse.json({
      stats: {
        totalAttachments: statsResult?.totalAttachments || 0,
        totalSizeBytes: Number(statsResult?.totalSizeBytes || 0),
        aiProcessedCount: statsResult?.aiProcessedCount || 0,
        documentTypeCounts: {
          invoice: statsResult?.invoiceCount || 0,
          receipt: statsResult?.receiptCount || 0,
          contract: statsResult?.contractCount || 0,
          image: statsResult?.imageCount || 0,
          other: (statsResult?.totalAttachments || 0) - 
            (statsResult?.invoiceCount || 0) - 
            (statsResult?.receiptCount || 0) - 
            (statsResult?.contractCount || 0) - 
            (statsResult?.imageCount || 0),
        },
        fileTypeCounts: fileTypeMap,
        categoryCounts: {
          document: 0, // TODO: Calculate
          image: statsResult?.imageCount || 0,
          spreadsheet: 0,
          presentation: 0,
          archive: 0,
          other: 0,
        },
        financialSummary: {
          totalInvoices: statsResult?.invoiceCount || 0,
          totalInvoiceAmount: 0,
          unpaidInvoices: 0,
          unpaidAmount: 0,
          totalReceipts: statsResult?.receiptCount || 0,
          totalReceiptAmount: 0,
        },
        topSenders: topSenders.map(s => ({
          email: s.email || '',
          name: s.name || '',
          count: s.count,
        })),
        largestFiles: [],
      },
    });
  } catch (error: any) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

