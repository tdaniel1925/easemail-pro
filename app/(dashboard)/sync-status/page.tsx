import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/drizzle';
import { emailAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import SyncDashboard from '@/components/email/SyncDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Email Sync Status | EaseMail',
  description: 'Monitor email sync progress and status',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SyncStatusPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get all accounts for this user
  const accounts = await db.query.emailAccounts.findMany({
    where: eq(emailAccounts.userId, user.id),
    orderBy: (accounts, { desc }) => [desc(accounts.createdAt)],
  });

  if (accounts.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>No Email Accounts</CardTitle>
            <CardDescription>
              You need to connect an email account first to see sync status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/accounts">
                Connect Email Account
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/inbox">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Email Sync Status</h1>
          <p className="text-muted-foreground">
            Monitor real-time sync progress for all your connected accounts
          </p>
        </div>
      </div>

      {/* Dashboard for Each Account */}
      {accounts.map((account) => (
        <SyncDashboard
          key={account.id}
          accountId={account.id}
          emailAddress={account.emailAddress}
        />
      ))}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Understanding Sync Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <h4 className="font-semibold text-foreground mb-1">Syncing</h4>
            <p>Emails are actively being downloaded from your email provider. This may take several hours for large mailboxes.</p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-1">Completed</h4>
            <p>All emails have been successfully synced. New emails will be synced automatically via webhooks.</p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-1">Error</h4>
            <p>Sync encountered an error. Check the error message and try restarting the sync. You may need to reconnect your account.</p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-1">Continuations</h4>
            <p>
              Due to serverless function timeouts, long syncs are split into multiple "continuation" jobs.
              Each continuation runs for ~4 minutes before triggering the next one.
              Maximum 100 continuations allowed (~6.6 hours of syncing).
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-1">Need Help?</h4>
            <p>
              If sync is stuck or showing errors for more than 30 minutes, try stopping and restarting it.
              If problems persist, <Link href="/support" className="text-primary hover:underline">contact support</Link>.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
