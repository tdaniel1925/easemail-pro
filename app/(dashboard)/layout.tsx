import { AccountProvider } from '@/contexts/AccountContext';
import GlobalSearch from '@/components/search/GlobalSearch';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
