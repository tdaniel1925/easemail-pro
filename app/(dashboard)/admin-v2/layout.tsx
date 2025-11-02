import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export default async function AdminV2Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if user is authenticated
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user is platform admin
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
  });

  if (!dbUser || dbUser.role !== 'platform_admin') {
    // Not a platform admin - redirect to inbox
    redirect('/inbox?error=unauthorized');
  }

  return <>{children}</>;
}

