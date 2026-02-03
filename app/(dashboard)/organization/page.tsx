/**
 * Organization Admin Dashboard
 *
 * Overview page for organization admins
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  Settings,
  CreditCard,
  TrendingUp,
  Mail,
  Calendar,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface OrganizationStats {
  totalMembers: number;
  activeMembers: number;
  maxSeats: number;
  planType: string;
  emailsSentThisMonth: number;
  storageUsed: string;
}

export default function OrganizationDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OrganizationStats | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/organization/stats');
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-muted rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const seatsUsedPercentage = stats
    ? Math.round((stats.totalMembers / stats.maxSeats) * 100)
    : 0;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Organization Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your team, billing, and settings
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/organization/users">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Member
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalMembers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.activeMembers || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Seats Used</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{seatsUsedPercentage}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.totalMembers || 0} of {stats?.maxSeats || 0} seats
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plan</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {stats?.planType || 'Free'}
            </div>
            <Button variant="link" className="px-0 h-auto mt-1" asChild>
              <Link href="/organization/billing">View billing</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activity</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.emailsSentThisMonth || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Emails this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks for managing your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button variant="outline" asChild className="h-auto py-4 justify-start">
              <Link href="/organization/users">
                <div className="flex items-start gap-3">
                  <UserPlus className="h-5 w-5 mt-0.5 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">Add Team Member</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Invite new users to your organization
                    </div>
                  </div>
                </div>
              </Link>
            </Button>

            <Button variant="outline" asChild className="h-auto py-4 justify-start">
              <Link href="/organization/settings">
                <div className="flex items-start gap-3">
                  <Settings className="h-5 w-5 mt-0.5 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">Organization Settings</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Update organization details
                    </div>
                  </div>
                </div>
              </Link>
            </Button>

            <Button variant="outline" asChild className="h-auto py-4 justify-start">
              <Link href="/organization/billing">
                <div className="flex items-start gap-3">
                  <CreditCard className="h-5 w-5 mt-0.5 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">Manage Billing</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      View plans and invoices
                    </div>
                  </div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity (Placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest updates from your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No recent activity to display</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
