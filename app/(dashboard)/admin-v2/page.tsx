'use client';

import { Suspense } from 'react';
import AdminContent from '@/components/admin-v2/AdminContent';
import { Loader2 } from 'lucide-react';

export default function AdminV2Page() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AdminContent />
    </Suspense>
  );
}

