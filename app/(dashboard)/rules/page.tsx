'use client';

import { Suspense } from 'react';
import RulesContent from '@/components/rules/RulesContent';
import { Loader2 } from 'lucide-react';

export default function RulesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <RulesContent />
    </Suspense>
  );
}

