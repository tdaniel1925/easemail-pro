import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardProviders } from '@/components/providers/DashboardProviders';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ✅ AUTHENTICATION ENABLED
  const supabase = createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <DashboardProviders userId={user.id}>
      <div className="flex h-screen bg-background overflow-hidden">
        {children}
      </div>
    </DashboardProviders>
  );
}

