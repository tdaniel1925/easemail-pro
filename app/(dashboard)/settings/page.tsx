import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import InboxLayout from '@/components/layout/InboxLayout';
import SettingsContent from '@/components/settings/SettingsContent';

function SettingsPageContent() {
  return (
    <InboxLayout>
      <SettingsContent />
    </InboxLayout>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <SettingsPageContent />
    </Suspense>
  );
}

