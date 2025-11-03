'use client';

import { Suspense } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import UsageAnalyticsDashboard from '@/components/admin/usage/UsageAnalyticsDashboard';

export default function UsageAnalyticsPage() {
  return (
    <AdminLayout>
      <Suspense fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading usage analytics...</p>
          </div>
        </div>
      }>
        <UsageAnalyticsDashboard />
      </Suspense>
    </AdminLayout>
  );
}

