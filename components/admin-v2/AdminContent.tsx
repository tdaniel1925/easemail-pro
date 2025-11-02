'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  DollarSign, 
  Key, 
  Settings, 
  ArrowLeft, 
  LogOut,
  Shield
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import UsersContent from './UsersContent';
import OrganizationsContent from './OrganizationsContent';
import PricingContentSimple from './PricingContentSimple';
import ApiKeysContent from './ApiKeysContent';
import SettingsContent from './SettingsContent';

type Section = 'users' | 'organizations' | 'pricing' | 'api-keys' | 'settings';

export default function AdminContent() {
  const [activeSection, setActiveSection] = useState<Section>('users');
  const [userEmail, setUserEmail] = useState('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserEmail(user.email || '');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const sections = [
    { id: 'users' as Section, name: 'User Management', icon: Users },
    { id: 'organizations' as Section, name: 'Organizations', icon: Building2 },
    { id: 'pricing' as Section, name: 'Pricing & Plans', icon: DollarSign },
    { id: 'api-keys' as Section, name: 'API Keys', icon: Key },
    { id: 'settings' as Section, name: 'System Settings', icon: Settings },
  ];

  return (
    <div className="flex w-full h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card overflow-y-auto flex-shrink-0">
        <div className="p-4">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Admin Panel</h2>
            </div>
            <a 
              href="/inbox"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Inbox
            </a>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    activeSection === section.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{section.name}</span>
                </button>
              );
            })}
          </nav>

          {/* User Info & Sign Out */}
          <div className="mt-8 pt-6 border-t border-border">
            <div className="px-3 mb-3">
              <p className="text-xs text-muted-foreground mb-1">Signed in as</p>
              <p className="text-sm font-medium text-foreground truncate">{userEmail}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden">
        {activeSection === 'users' && <UsersContent />}
        {activeSection === 'organizations' && <OrganizationsContent />}
              {activeSection === 'pricing' && <PricingContentSimple />}
        {activeSection === 'api-keys' && <ApiKeysContent />}
        {activeSection === 'settings' && <SettingsContent />}
      </main>
    </div>
  );
}

