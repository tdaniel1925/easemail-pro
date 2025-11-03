'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Settings, Database, Activity, Mail, Zap, Key, Building2, DollarSign, BarChart3, CreditCard } from 'lucide-react';
import Link from 'next/link';

interface AdminStats {
  totalUsers: number;
  totalAccounts: number;
  totalEmails: number;
  totalContacts: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalAccounts: 0,
    totalEmails: 0,
    totalContacts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage users, settings, and system configuration
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : stats.totalUsers.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Registered accounts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Email Accounts</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : stats.totalAccounts.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Connected accounts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Emails</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : stats.totalEmails.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Synced messages</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contacts</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : stats.totalContacts.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Total contacts</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/admin/users">
            <Card className="hover:bg-accent cursor-pointer transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
                <CardDescription>
                  View, edit, and manage user accounts and permissions
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/admin/organizations">
            <Card className="hover:bg-accent cursor-pointer transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Team Organizations
                </CardTitle>
                <CardDescription>
                  Create and manage team accounts and organizations
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/admin/pricing">
            <Card className="hover:bg-accent cursor-pointer transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Pricing & Billing
                </CardTitle>
                <CardDescription>
                  Configure plans, usage pricing, and billing settings
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/admin/api-keys">
            <Card className="hover:bg-accent cursor-pointer transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  API Keys
                </CardTitle>
                <CardDescription>
                  Configure API keys for Twilio, Resend, Nylas, and more
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/admin/settings">
            <Card className="hover:bg-accent cursor-pointer transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System Settings
                </CardTitle>
                <CardDescription>
                  Configure system-wide settings and preferences
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/admin/usage-analytics">
            <Card className="hover:bg-accent cursor-pointer transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Usage Analytics
                </CardTitle>
                <CardDescription>
                  Monitor SMS, AI, and storage usage across all users
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/admin/billing-config">
            <Card className="hover:bg-accent cursor-pointer transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Billing Automation
                </CardTitle>
                <CardDescription>
                  Configure automated billing and payment processing
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Card className="hover:bg-accent cursor-pointer transition-colors opacity-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activity Logs
                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                  Coming Soon
                </span>
              </CardTitle>
              <CardDescription>
                Monitor system activity and user actions
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:bg-accent cursor-pointer transition-colors opacity-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                System Health
                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                  Coming Soon
                </span>
              </CardTitle>
              <CardDescription>
                View system performance and health metrics
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

