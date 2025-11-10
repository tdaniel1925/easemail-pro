import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import ProfileContent from '@/components/profile/ProfileContent';

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}
