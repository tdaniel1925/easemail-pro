import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { SMSInbox } from '@/components/sms/SMSInbox';

export default function SMSPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <div className="h-full">
        <SMSInbox />
      </div>
    </Suspense>
  );
}
