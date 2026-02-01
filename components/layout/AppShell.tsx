'use client';

import * as React from 'react';
import { useState } from 'react';
import {
  Mail,
  Calendar as CalendarIcon,
  Users,
  Settings as SettingsIcon,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizableLayout } from './ResizableLayout';
import EaseMailLogoFull from '@/components/ui/EaseMailLogoFull';
import AccountSwitcher from '@/components/account/AccountSwitcher';
import SettingsMenuNew from '@/components/layout/SettingsMenuNew';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface AppShellProps {
  children?: React.ReactNode;
  defaultTab?: 'inbox' | 'calendar' | 'contacts' | 'settings';
  inboxContent?: React.ReactNode;
  calendarContent?: React.ReactNode;
  contactsContent?: React.ReactNode;
  settingsContent?: React.ReactNode;
  rightPanel?: React.ReactNode;
}

export function AppShell({
  children,
  defaultTab = 'inbox',
  inboxContent,
  calendarContent,
  contactsContent,
  settingsContent,
  rightPanel,
}: AppShellProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const tabs = [
    {
      value: 'inbox',
      label: 'Inbox',
      icon: Mail,
      content: inboxContent,
    },
    {
      value: 'calendar',
      label: 'Calendar',
      icon: CalendarIcon,
      content: calendarContent,
    },
    {
      value: 'contacts',
      label: 'Contacts',
      icon: Users,
      content: contactsContent,
    },
    {
      value: 'settings',
      label: 'Settings',
      icon: SettingsIcon,
      content: settingsContent,
    },
  ];

  // Sidebar Content Component
  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar-background">
      {/* Logo & Account Switcher */}
      <div className="flex-shrink-0 p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3 mb-4">
          <EaseMailLogoFull className="h-6 flex-1" />
        </div>
        <AccountSwitcher />
      </div>

      {/* Tab Navigation - Icon-only for clean terminal look */}
      <div className="flex-shrink-0 p-2 border-b border-sidebar-border">
        <div className="flex flex-col gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.value}
                onClick={() => {
                  setActiveTab(tab.value as any);
                  setIsMobileSidebarOpen(false);
                }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 text-sm rounded-md transition-all',
                  'hover:bg-terminal-blue/10',
                  activeTab === tab.value
                    ? 'bg-terminal-blue/20 text-terminal-blue border border-terminal-blue/30'
                    : 'text-sidebar-foreground'
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings Menu */}
      <div className="flex-shrink-0 p-2 border-t border-sidebar-border">
        <SettingsMenuNew
          onLogout={handleLogout}
          onNavigate={(path) => router.push(path)}
        />
      </div>
    </div>
  );

  // Main Content Component
  const MainContent = () => (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="h-full flex flex-col">
      {/* Tab Headers - Minimal Chrome */}
      <div className="flex-shrink-0 border-b border-terminal-blue/20 bg-background">
        <div className="flex items-center h-12 px-4">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="md:hidden mr-2"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Tab List - Icon + Label on desktop, Icon only on mobile */}
          <TabsList className="h-9 bg-transparent border border-terminal-blue/20">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    'data-[state=active]:bg-terminal-blue/20',
                    'data-[state=active]:text-terminal-blue',
                    'data-[state=active]:border-b-2',
                    'data-[state=active]:border-terminal-blue',
                    'transition-all'
                  )}
                >
                  <Icon className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {tabs.map((tab) => (
          <TabsContent
            key={tab.value}
            value={tab.value}
            className="h-full m-0 p-0 focus-visible:outline-none focus-visible:ring-0"
          >
            {tab.content || (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">
                  {tab.label} content goes here
                </p>
              </div>
            )}
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );

  return (
    <>
      {/* Desktop Layout */}
      <div className="hidden md:block h-screen overflow-hidden">
        <ResizableLayout
          sidebar={<SidebarContent />}
          main={<MainContent />}
          rightPanel={rightPanel}
          defaultSidebarSize={18}
          minSidebarSize={15}
          defaultRightPanelSize={25}
          minRightPanelSize={20}
        />
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden h-screen flex flex-col overflow-hidden">
        {/* Mobile Sidebar Sheet */}
        <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <SidebarContent />
          </SheetContent>
        </Sheet>

        {/* Mobile Content */}
        <div className="flex-1 overflow-hidden">
          <MainContent />
        </div>
      </div>

      {/* Render any additional children */}
      {children}
    </>
  );
}

export default AppShell;
