/**
 * Usage Report Export Utilities
 * 
 * Exports usage data to CSV and Excel formats
 */

interface UsageData {
  user: {
    id: string;
    email: string;
    fullName: string | null;
    role: string;
    isPromoUser: boolean;
    subscriptionTier: string | null;
  };
  usage: {
    sms: { messages: number; cost: number };
    ai: { requests: number; cost: number };
    storage: { bytes: number; gb: string; cost: number };
    total: { cost: number };
  };
  billing: {
    hasPaymentMethod: boolean;
    requiresPaymentMethod: boolean;
  };
}

/**
 * Convert usage data to CSV format
 */
export function exportToCSV(data: UsageData[], period: { start: string; end: string }): string {
  const headers = [
    'User ID',
    'Email',
    'Name',
    'Role',
    'Subscription Tier',
    'Is Promo User',
    'SMS Messages',
    'SMS Cost ($)',
    'AI Requests',
    'AI Cost ($)',
    'Storage (GB)',
    'Storage Cost ($)',
    'Total Cost ($)',
    'Has Payment Method',
    'Requires Payment Method',
  ];

  const rows = data.map(item => [
    item.user.id,
    item.user.email,
    item.user.fullName || '',
    item.user.role,
    item.user.subscriptionTier || 'free',
    item.user.isPromoUser ? 'Yes' : 'No',
    item.usage.sms.messages,
    item.usage.sms.cost.toFixed(2),
    item.usage.ai.requests,
    item.usage.ai.cost.toFixed(2),
    item.usage.storage.gb,
    item.usage.storage.cost.toFixed(2),
    item.usage.total.cost.toFixed(2),
    item.billing.hasPaymentMethod ? 'Yes' : 'No',
    item.billing.requiresPaymentMethod ? 'Yes' : 'No',
  ]);

  // Create CSV content
  const csvContent = [
    [`EaseMail Usage Report - ${period.start} to ${period.end}`],
    [`Generated: ${new Date().toISOString()}`],
    [],
    headers,
    ...rows,
    [],
    ['Summary'],
    ['Total Users', data.length],
    ['Total SMS Messages', data.reduce((sum, item) => sum + item.usage.sms.messages, 0)],
    ['Total AI Requests', data.reduce((sum, item) => sum + item.usage.ai.requests, 0)],
    ['Total Revenue ($)', data.reduce((sum, item) => sum + item.usage.total.cost, 0).toFixed(2)],
  ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

  return csvContent;
}

/**
 * Convert usage data to Excel-compatible CSV (with better formatting)
 */
export function exportToExcel(data: UsageData[], period: { start: string; end: string }): string {
  // Excel-friendly CSV with UTF-8 BOM for proper encoding
  const BOM = '\uFEFF';
  const csv = exportToCSV(data, period);
  return BOM + csv;
}

/**
 * Create a download-ready blob for CSV export
 */
export function createCSVBlob(data: UsageData[], period: { start: string; end: string }): Blob {
  const csv = exportToCSV(data, period);
  return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Create a download-ready blob for Excel export
 */
export function createExcelBlob(data: UsageData[], period: { start: string; end: string }): Blob {
  const excel = exportToExcel(data, period);
  return new Blob([excel], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Trigger browser download for CSV file
 */
export function downloadCSV(data: UsageData[], period: { start: string; end: string }, filename?: string): void {
  const blob = createCSVBlob(data, period);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `easemail-usage-${period.start}-to-${period.end}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Trigger browser download for Excel file
 */
export function downloadExcel(data: UsageData[], period: { start: string; end: string }, filename?: string): void {
  const blob = createExcelBlob(data, period);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `easemail-usage-${period.start}-to-${period.end}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export aggregated summary data
 */
export function exportSummaryToCSV(summary: any, period: { start: string; end: string }): string {
  const lines = [
    [`EaseMail Usage Summary - ${period.start} to ${period.end}`],
    [`Generated: ${new Date().toISOString()}`],
    [],
    ['Metric', 'Value'],
    ['Total SMS Messages', summary.sms?.totalMessages || 0],
    ['Total SMS Cost ($)', (summary.sms?.totalCost || 0).toFixed(2)],
    ['Total AI Requests', summary.ai?.totalRequests || 0],
    ['Total AI Cost ($)', (summary.ai?.totalCost || 0).toFixed(2)],
    ['Total Storage (GB)', summary.storage?.totalGb || '0'],
    ['Storage Overage Cost ($)', (summary.storage?.overageCost || 0).toFixed(2)],
    ['Total Revenue ($)', (
      (summary.sms?.totalCost || 0) +
      (summary.ai?.totalCost || 0) +
      (summary.storage?.overageCost || 0)
    ).toFixed(2)],
    [],
    ['AI Features Breakdown'],
    ['Feature', 'Requests', 'Cost ($)'],
  ];

  if (summary.ai?.byFeature && summary.ai.byFeature.length > 0) {
    summary.ai.byFeature.forEach((feature: any) => {
      lines.push([
        feature.feature,
        feature.requests,
        feature.cost.toFixed(2),
      ]);
    });
  }

  return lines.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

/**
 * Download summary report
 */
export function downloadSummary(summary: any, period: { start: string; end: string }): void {
  const csv = exportSummaryToCSV(summary, period);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `easemail-summary-${period.start}-to-${period.end}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

