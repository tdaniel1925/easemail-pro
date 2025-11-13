import { Suspense } from 'react';
import ContactsList from '@/components/contacts/ContactsList';
import { ContactListSkeleton } from '@/components/ui/skeleton';

export default function ContactsPage() {
  return (
    <Suspense fallback={<ContactListSkeleton />}>
      <ContactsList />
    </Suspense>
  );
}
