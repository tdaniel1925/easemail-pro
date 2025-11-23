'use client';

import { AccountProvider } from '@/contexts/AccountContext';
import GlobalSearch from '@/components/search/GlobalSearch';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AccountProvider>
      {children}
      <GlobalSearch />
    </AccountProvider>
  );
}
