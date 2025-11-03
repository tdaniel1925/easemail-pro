'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import SystemSettingsContent from '@/components/admin/SystemSettingsContent';

export default function SystemSettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <SystemSettingsContent />
    </Suspense>
  );
}
