import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import ContactsContent from '@/components/contacts/ContactsContent';

export default function ContactsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <ContactsContent />
    </Suspense>
  );
}
