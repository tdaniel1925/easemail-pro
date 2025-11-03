'use client';

import { Suspense } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import BillingConfigPanel from '@/components/admin/billing/BillingConfigPanel';

export default function BillingConfigPage() {
  return (
    <AdminLayout>
      <Suspense fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading billing configuration...</p>
          </div>
        </div>
      }>
        <BillingConfigPanel />
      </Suspense>
    </AdminLayout>
  );
}

