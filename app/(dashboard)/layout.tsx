'use client';

import { AccountProvider } from '@/contexts/AccountContext';
import GlobalSearch from '@/components/search/GlobalSearch';
import { usePathname } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

// Lazy load tab content for better performance
const InboxContent = lazy(() => import('./inbox/page').then(m => ({ default: m.default })));
const CalendarContent = lazy(() => import('./calendar/page'));
const ContactsContent = lazy(() => import('./contacts-v4/page'));
const SettingsContent = lazy(() => import('./settings/page'));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-full">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-terminal-blue" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();

  // Determine which tab should be active based on the current route
  const getActiveTab = () => {
    if (pathname?.startsWith('/calendar')) return 'calendar';
    if (pathname?.startsWith('/contacts')) return 'contacts';
    if (pathname?.startsWith('/settings')) return 'settings';
    if (pathname?.startsWith('/accounts')) return 'settings'; // accounts-v3 page -> settings tab
    return 'inbox'; // default to inbox for / and /inbox
  };

  const activeTab = getActiveTab();

  return (
    <AccountProvider>
      <AppShell
        defaultTab={activeTab}
        inboxContent={
          <Suspense fallback={<LoadingSpinner />}>
            <InboxContent />
          </Suspense>
        }
        calendarContent={
          <Suspense fallback={<LoadingSpinner />}>
            <CalendarContent />
          </Suspense>
        }
        contactsContent={
          <Suspense fallback={<LoadingSpinner />}>
            <ContactsContent />
          </Suspense>
        }
        settingsContent={
          <Suspense fallback={<LoadingSpinner />}>
            <SettingsContent />
          </Suspense>
        }
      >
        <GlobalSearch />
      </AppShell>
    </AccountProvider>
  );
}
