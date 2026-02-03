/**
 * Organization Admin Layout
 *
 * Layout for organization admins and owners to manage their organization
 */

'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Users,
  Settings,
  LayoutDashboard,
  CreditCard,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrganizationData {
  id: string;
  name: string;
  role: string;
}

export default function OrganizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      // Fetch current user's organization details
      const response = await fetch('/api/user/profile');
      const data = await response.json();

      if (!data.success || !data.user?.organizationId) {
        router.push('/'); // Redirect if no organization
        return;
      }

      // Check if user has org_admin or owner role
      if (data.user.role !== 'org_admin' && data.user.role !== 'platform_admin') {
        router.push('/'); // Redirect if not an org admin
        return;
      }

      setOrganization({
        id: data.user.organizationId,
        name: data.user.organizationName || 'Organization',
        role: data.user.role,
      });
    } catch (error) {
      console.error('Error checking access:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const navigation = [
    {
      name: 'Dashboard',
      href: '/organization',
      icon: LayoutDashboard,
      current: pathname === '/organization',
    },
    {
      name: 'Team Members',
      href: '/organization/users',
      icon: Users,
      current: pathname?.startsWith('/organization/users'),
    },
    {
      name: 'Billing',
      href: '/organization/billing',
      icon: CreditCard,
      current: pathname?.startsWith('/organization/billing'),
    },
    {
      name: 'Settings',
      href: '/organization/settings',
      icon: Settings,
      current: pathname?.startsWith('/organization/settings'),
    },
  ];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 lg:relative lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              <div>
                <h2 className="font-semibold text-sm">{organization?.name}</h2>
                <p className="text-xs text-muted-foreground capitalize">{organization?.role?.replace('_', ' ')}</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    item.current
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-border p-4">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Back to Main App
            </Link>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center h-16 px-4 border-b border-border bg-card">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="ml-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">{organization?.name}</h1>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
