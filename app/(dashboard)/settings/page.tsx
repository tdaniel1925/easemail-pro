import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import SettingsContent from '@/components/settings/SettingsContent';

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}

