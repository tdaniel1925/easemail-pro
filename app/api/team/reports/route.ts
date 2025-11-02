/**
 * Reports & Exports API
 * POST /api/team/reports - Generate usage/billing reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/permissions';
import { db } from '@/lib/db/drizzle';
import { users, smsUsage, aiUsage, storageUsage, invoices } from '@/lib/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

type ReportType = 'usage' | 'billing' | 'invoices' | 'members';
type ReportFormat = 'json' | 'csv';

export async function POST(request: NextRequest) {
  try {
    const context = await requireAuth();
    const body = await request.json();
    
    const {
      reportType,
      format = 'json',
      startDate,
      endDate,
      includeMembers = false,
    } = body as {
      reportType: ReportType;
      format?: ReportFormat;
      startDate?: string;
      endDate?: string;
      includeMembers?: boolean;
    };

    if (!reportType) {
      return NextResponse.json(
        { success: false, error: 'reportType is required' },
        { status: 400 }
      );
    }

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    let reportData: any = {};

    switch (reportType) {
      case 'usage':
        reportData = await generateUsageReport(context, start, end, includeMembers);
        break;
      case 'billing':
        reportData = await generateBillingReport(context, start, end);
        break;
      case 'invoices':
        reportData = await generateInvoicesReport(context, start, end);
        break;
      case 'members':
        reportData = await generateMembersReport(context);
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid report type' },
          { status: 400 }
        );
    }

    if (format === 'csv') {
      const csv = convertToCSV(reportData, reportType);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${reportType}-report-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      report: reportData,
      generatedAt: new Date().toISOString(),
      reportType,
      period: { start, end },
    });
  } catch (error: any) {
    console.error('Failed to generate report:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function generateUsageReport(context: any, start: Date, end: Date, includeMembers: boolean) {
  const orgId = context.organizationId || undefined;
  
  // Get organization users
  const orgUsers = orgId 
    ? await db.query.users.findMany({ where: eq(users.organizationId, orgId) })
    : [await db.query.users.findFirst({ where: eq(users.id, context.userId) })];

  const userIds = orgUsers.map(u => u?.id).filter(Boolean) as string[];

  // SMS Usage
  const smsRecords = await db.query.smsUsage.findMany({
    where: and(
      gte(smsUsage.periodStart, start),
      lte(smsUsage.periodEnd, end)
    ),
  });
  const smsFiltered = smsRecords.filter(r => userIds.includes(r.userId));

  // AI Usage
  const aiRecords = await db.query.aiUsage.findMany({
    where: and(
      gte(aiUsage.periodStart, start),
      lte(aiUsage.periodEnd, end)
    ),
  });
  const aiFiltered = aiRecords.filter(r => userIds.includes(r.userId));

  // Storage Usage
  const storageRecords = await db.query.storageUsage.findMany({
    where: and(
      gte(storageUsage.periodStart, start),
      lte(storageUsage.periodEnd, end)
    ),
  });
  const storageFiltered = storageRecords.filter(r => userIds.includes(r.userId));

  const summary = {
    totalSMS: smsFiltered.reduce((sum, r) => sum + (r.totalMessagesSent || 0), 0),
    totalSMSCost: smsFiltered.reduce((sum, r) => sum + parseFloat(r.totalChargedUsd || '0'), 0),
    totalAIRequests: aiFiltered.reduce((sum, r) => sum + (r.requestCount || 0), 0),
    totalAICost: aiFiltered.reduce((sum, r) => sum + parseFloat(r.totalCostUsd || '0'), 0),
    totalStorage: storageFiltered.reduce((sum, r) => sum + Number(r.totalBytes || 0), 0),
    totalStorageCost: storageFiltered.reduce((sum, r) => sum + parseFloat(r.overageCostUsd || '0'), 0),
  };

  if (includeMembers) {
    const byUser = orgUsers.map(user => {
      if (!user) return null;
      const userSMS = smsFiltered.filter(r => r.userId === user.id);
      const userAI = aiFiltered.filter(r => r.userId === user.id);
      const userStorage = storageFiltered.filter(r => r.userId === user.id);

      return {
        userId: user.id,
        email: user.email,
        name: user.fullName,
        sms: {
          messages: userSMS.reduce((sum, r) => sum + (r.totalMessagesSent || 0), 0),
          cost: userSMS.reduce((sum, r) => sum + parseFloat(r.totalChargedUsd || '0'), 0),
        },
        ai: {
          requests: userAI.reduce((sum, r) => sum + (r.requestCount || 0), 0),
          cost: userAI.reduce((sum, r) => sum + parseFloat(r.totalCostUsd || '0'), 0),
        },
        storage: {
          bytes: userStorage.reduce((sum, r) => sum + Number(r.totalBytes || 0), 0),
          cost: userStorage.reduce((sum, r) => sum + parseFloat(r.overageCostUsd || '0'), 0),
        },
      };
    }).filter(Boolean);

    return { summary, byUser };
  }

  return { summary };
}

async function generateBillingReport(context: any, start: Date, end: Date) {
  const orgId = context.organizationId || undefined;

  const invoiceRecords = await db.query.invoices.findMany({
    where: and(
      orgId ? eq(invoices.organizationId, orgId) : eq(invoices.userId, context.userId),
      gte(invoices.createdAt, start),
      lte(invoices.createdAt, end)
    ),
    orderBy: (inv, { desc }) => [desc(inv.createdAt)],
  });

  const summary = {
    totalInvoices: invoiceRecords.length,
    totalAmount: invoiceRecords.reduce((sum, inv) => sum + parseFloat(inv.totalUsd || '0'), 0),
    paidInvoices: invoiceRecords.filter(inv => inv.status === 'paid').length,
    paidAmount: invoiceRecords
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + parseFloat(inv.totalUsd || '0'), 0),
    unpaidAmount: invoiceRecords
      .filter(inv => inv.status !== 'paid' && inv.status !== 'void')
      .reduce((sum, inv) => sum + parseFloat(inv.totalUsd || '0'), 0),
  };

  return {
    summary,
    invoices: invoiceRecords.map(inv => ({
      invoiceNumber: inv.invoiceNumber,
      amount: parseFloat(inv.totalUsd || '0'),
      status: inv.status,
      dueDate: inv.dueDate,
      paidAt: inv.paidAt,
      createdAt: inv.createdAt,
    })),
  };
}

async function generateInvoicesReport(context: any, start: Date, end: Date) {
  return generateBillingReport(context, start, end);
}

async function generateMembersReport(context: any) {
  if (!context.organizationId) {
    return { error: 'Not part of an organization' };
  }

  const members = await db.query.users.findMany({
    where: eq(users.organizationId, context.organizationId),
  });

  return {
    totalMembers: members.length,
    members: members.map(m => ({
      id: m.id,
      email: m.email,
      name: m.fullName,
      role: m.role,
      createdAt: m.createdAt,
      suspended: m.suspended,
    })),
  };
}

function convertToCSV(data: any, reportType: string): string {
  let rows: string[] = [];

  switch (reportType) {
    case 'usage':
      if (data.byUser) {
        rows.push('Email,Name,SMS Messages,SMS Cost,AI Requests,AI Cost,Storage (Bytes),Storage Cost');
        data.byUser.forEach((user: any) => {
          rows.push(
            `${user.email},${user.name || ''},${user.sms.messages},${user.sms.cost},${user.ai.requests},${user.ai.cost},${user.storage.bytes},${user.storage.cost}`
          );
        });
      } else {
        rows.push('Metric,Value');
        rows.push(`Total SMS,${data.summary.totalSMS}`);
        rows.push(`Total SMS Cost,$${data.summary.totalSMSCost.toFixed(2)}`);
        rows.push(`Total AI Requests,${data.summary.totalAIRequests}`);
        rows.push(`Total AI Cost,$${data.summary.totalAICost.toFixed(2)}`);
        rows.push(`Total Storage (Bytes),${data.summary.totalStorage}`);
        rows.push(`Total Storage Cost,$${data.summary.totalStorageCost.toFixed(2)}`);
      }
      break;

    case 'billing':
    case 'invoices':
      rows.push('Invoice Number,Amount,Status,Due Date,Paid At,Created At');
      data.invoices.forEach((inv: any) => {
        rows.push(
          `${inv.invoiceNumber},${inv.amount},${inv.status},${inv.dueDate || ''},${inv.paidAt || ''},${inv.createdAt}`
        );
      });
      break;

    case 'members':
      rows.push('Email,Name,Role,Created At,Suspended');
      data.members.forEach((member: any) => {
        rows.push(
          `${member.email},${member.name || ''},${member.role},${member.createdAt},${member.suspended || false}`
        );
      });
      break;
  }

  return rows.join('\n');
}

