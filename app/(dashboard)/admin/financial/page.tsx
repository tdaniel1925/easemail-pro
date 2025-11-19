import { Metadata } from 'next';
import FinancialReportingDashboard from '@/components/admin/FinancialReportingDashboard';

export const metadata: Metadata = {
  title: 'Financial Reporting | Admin',
  description: 'Comprehensive financial metrics and revenue analytics',
};

export default function FinancialReportPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <FinancialReportingDashboard />
    </div>
  );
}

