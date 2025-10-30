import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import InboxLayout from '@/components/layout/InboxLayout';
import ContactsList from '@/components/contacts/ContactsList';

function ContactsContent() {
  return (
    <InboxLayout>
      <ContactsList />
    </InboxLayout>
  );
}

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

