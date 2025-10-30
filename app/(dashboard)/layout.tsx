// AUTH DISABLED FOR TESTING
// import { createClient } from '@/lib/supabase/server';
// import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // AUTH DISABLED - Uncomment below to enable
  /*
  const supabase = createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }
  */

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {children}
    </div>
  );
}

