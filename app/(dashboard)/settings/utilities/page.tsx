import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { UtilitiesContent } from '@/components/settings/UtilitiesContent';

export default function UtilitiesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <UtilitiesContent />
    </Suspense>
  );
}
