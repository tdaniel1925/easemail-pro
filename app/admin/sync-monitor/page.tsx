import { SyncStatusMonitor } from '@/components/admin/SyncStatusMonitor';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Sync Monitor | Admin',
  description: 'Monitor email synchronization status across all accounts',
};

export default async function SyncMonitorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // TODO: Add admin role check
  // For now, this is accessible to all authenticated users
  // You should add role-based access control here:
  // const isAdmin = await checkAdminRole(user.id);
  // if (!isAdmin) redirect('/inbox');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Sync Monitor</h1>
          <p className="text-muted-foreground">
            Real-time monitoring of email synchronization across all accounts
          </p>
        </div>

        <SyncStatusMonitor isAdmin={true} />
      </div>
    </div>
  );
}
