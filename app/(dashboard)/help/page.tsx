import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import HelpCenter from '@/components/help/HelpCenter';

export default function HelpPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <HelpCenter />
    </Suspense>
  );
}

