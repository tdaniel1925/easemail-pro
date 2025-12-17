import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { TeamsPanel } from '@/components/teams';

export const metadata = {
  title: 'Teams | EaseMail',
  description: 'Microsoft Teams chat integration',
};

export default function TeamsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <div className="h-[calc(100vh-4rem)]">
        <TeamsPanel />
      </div>
    </Suspense>
  );
}
