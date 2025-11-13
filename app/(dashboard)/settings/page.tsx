import { Suspense } from 'react';
import SettingsContent from '@/components/settings/SettingsContent';
import { SettingsCardSkeleton } from '@/components/ui/skeleton';

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsCardSkeleton />}>
      <SettingsContent />
    </Suspense>
  );
}

