import { Suspense } from 'react';
import ContactsV4List from '@/components/contacts-v4/ContactsV4List';
import { ContactListSkeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: 'Contacts | EaseMail',
  description: 'Manage your contacts with real-time sync',
};

export default function ContactsV4Page() {
  return (
    <div className="flex flex-col h-full">
      <Suspense fallback={<ContactListSkeleton />}>
        <ContactsV4List />
      </Suspense>
    </div>
  );
}
