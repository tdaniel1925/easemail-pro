'use client';

/**
 * MS Teams Page
 *
 * Full-page view for MS Teams integration.
 * Provides access to Teams chats, channels, and meetings.
 */

import { useRouter } from 'next/navigation';
import { Users, Calendar, Paperclip, Inbox } from 'lucide-react';
import { TeamsPanel } from '@/components/ms-teams/TeamsPanel';
import EaseMailLogoFull from '@/components/ui/EaseMailLogoFull';
import SettingsMenuNew from '@/components/layout/SettingsMenuNew';
import AccountSwitcher from '@/components/account/AccountSwitcher';
import { createClient } from '@/lib/supabase/client';

export default function TeamsPage() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar - Same as inbox */}
      <div className="w-64 border-r border-border flex flex-col overflow-hidden">
        {/* Sidebar Header - Fixed */}
        <div className="flex-shrink-0 h-14 px-5 flex items-center justify-center border-b border-border">
          <EaseMailLogoFull className="h-8" />
        </div>

        {/* Account Selector - Fixed */}
        <div className="flex-shrink-0 p-3 border-b border-border">
          <AccountSwitcher />
        </div>

        {/* Teams Navigation Section */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-2">
            MS Teams
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-2 py-1.5 text-sm bg-accent rounded-md">
              <Users className="h-4 w-4" />
              Teams & Chats
            </div>
          </div>
        </div>

        {/* Quick Links - Fixed at bottom */}
        <div className="flex-shrink-0 border-t border-border">
          <div className="p-1.5 space-y-0.5">
            <a
              href="/inbox"
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs hover:bg-accent rounded-md transition-colors"
            >
              <Inbox className="h-3 w-3" />
              Inbox
            </a>
            <a
              href="/contacts-v4"
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs hover:bg-accent rounded-md transition-colors"
            >
              <Users className="h-3 w-3" />
              Contacts
            </a>
            <a
              href="/calendar"
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs hover:bg-accent rounded-md transition-colors"
            >
              <Calendar className="h-3 w-3" />
              Calendar
            </a>
            <a
              href="/attachments"
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs hover:bg-accent rounded-md transition-colors"
            >
              <Paperclip className="h-3 w-3" />
              Attachments
            </a>

            {/* Settings Menu */}
            <SettingsMenuNew
              onLogout={handleLogout}
              onNavigate={(path) => router.push(path)}
            />
          </div>
        </div>
      </div>

      {/* Main Content - Teams Panel */}
      <div className="flex-1 overflow-hidden">
        <TeamsPanel className="h-full" />
      </div>
    </div>
  );
}
