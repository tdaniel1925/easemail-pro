'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  AlertCircle,
  CreditCard,
  FileText,
  BarChart3,
  Settings,
  Download
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InvoicesTable } from '@/components/billing/InvoicesTable';
import { PaymentMethods } from '@/components/billing/PaymentMethods';
import { UsageChart } from '@/components/charts/UsageChart';
import { UsageBarChart } from '@/components/charts/UsageBarChart';

interface TeamStats {
  memberCount: number;
  activeSeats: number;
  totalSeats: number;
  currentMonthCost: number;
  subscription: {
    planName: string;
    billingCycle: string;
    nextBillingDate: string;
  };
  usage: {
    sms: { messages: number; cost: number };
    ai: { requests: number; cost: number };
    storage: { totalGb: number; cost: number };
  };
}

export default function TeamAdminPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [usageHistory, setUsageHistory] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchTeamStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'billing') {
      fetchInvoices();
      fetchPaymentMethods();
    }
  }, [activeTab]);

  const fetchInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const res = await fetch('/api/team/billing/invoices');
      const data = await res.json();
      if (data.success) {
        setInvoices(data.invoices || []);
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const fetchPaymentMethods = async () => {
    setLoadingPaymentMethods(true);
    try {
      const res = await fetch('/api/team/billing/payment-methods');
      const data = await res.json();
      if (data.success) {
        setPaymentMethods(data.paymentMethods || []);
      }
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  const fetchTeamStats = async () => {
    try {
      // Fetch team members
      const membersRes = await fetch('/api/team/members');
      const membersData = await membersRes.json();
      
      // Fetch usage
      const usageRes = await fetch('/api/team/usage');
      const usageData = await usageRes.json();
      
      // Combine data
      setStats({
        memberCount: membersData.members?.length || 0,
        activeSeats: membersData.members?.filter((m: any) => m.isActive).length || 0,
        totalSeats: 10, // TODO: Get from subscription
        currentMonthCost: usageData.usage?.totalCost || 0,
        subscription: {
          planName: 'Team',
          billingCycle: 'monthly',
          nextBillingDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        },
        usage: usageData.usage || {
          sms: { messages: 0, cost: 0 },
          ai: { requests: 0, cost: 0 },
          storage: { totalGb: 0, cost: 0 },
        },
      });
    } catch (error) {
      console.error('Failed to fetch team stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Team Administration</h1>
            <p className="text-muted-foreground mt-1">
              Manage your team, billing, and usage analytics
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Button onClick={() => router.push('/team')}>
              <Users className="h-4 w-4 mr-2" />
              Manage Members
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="billing">
            <DollarSign className="h-4 w-4 mr-2" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="usage">
            <TrendingUp className="h-4 w-4 mr-2" />
            Usage
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="h-4 w-4 mr-2" />
            Members
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.memberCount || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.activeSeats} / {stats?.totalSeats} seats used
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Current Month Cost</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${stats?.currentMonthCost.toFixed(2) || '0.00'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Next billing: {stats?.subscription.nextBillingDate 
                    ? new Date(stats.subscription.nextBillingDate).toLocaleDateString()
                    : 'N/A'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">SMS Usage</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.usage.sms.messages || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  ${stats?.usage.sms.cost.toFixed(2) || '0.00'} this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">AI Requests</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.usage.ai.requests || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  ${stats?.usage.ai.cost.toFixed(2) || '0.00'} overage
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-24 flex-col" onClick={() => router.push('/team')}>
                <Users className="h-6 w-6 mb-2" />
                <span>Invite Team Member</span>
              </Button>
              <Button variant="outline" className="h-24 flex-col" onClick={() => setActiveTab('billing')}>
                <CreditCard className="h-6 w-6 mb-2" />
                <span>View Invoices</span>
              </Button>
              <Button variant="outline" className="h-24 flex-col" onClick={() => setActiveTab('usage')}>
                <BarChart3 className="h-6 w-6 mb-2" />
                <span>Usage Analytics</span>
              </Button>
            </CardContent>
          </Card>

          {/* Alerts */}
          {stats && stats.activeSeats >= stats.totalSeats * 0.9 && (
            <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <CardTitle className="text-yellow-900 dark:text-yellow-100">
                    Seat Capacity Warning
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-yellow-800 dark:text-yellow-200">
                  You're using {stats.activeSeats} of {stats.totalSeats} seats. 
                  Consider upgrading your plan to add more team members.
                </p>
                <Button variant="default" className="mt-4">
                  Upgrade Plan
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          {/* Subscription Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Current Subscription</CardTitle>
              <CardDescription>Your team's active subscription plan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats?.subscription.planName || 'Team Plan'}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    Billed {stats?.subscription.billingCycle || 'monthly'}
                  </p>
                </div>
                <Button variant="outline">Upgrade Plan</Button>
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <PaymentMethods
            paymentMethods={paymentMethods}
            isLoading={loadingPaymentMethods}
            onAddPaymentMethod={() => {
              // TODO: Open add payment method dialog
              alert('Add payment method dialog - coming soon!');
            }}
            onRemovePaymentMethod={async (methodId) => {
              try {
                const res = await fetch(`/api/team/billing/payment-methods/${methodId}`, {
                  method: 'DELETE',
                });
                if (res.ok) {
                  fetchPaymentMethods();
                }
              } catch (error) {
                console.error('Failed to remove payment method:', error);
              }
            }}
            onSetDefault={async (methodId) => {
              try {
                const res = await fetch(`/api/team/billing/payment-methods/${methodId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ isDefault: true }),
                });
                if (res.ok) {
                  fetchPaymentMethods();
                }
              } catch (error) {
                console.error('Failed to set default payment method:', error);
              }
            }}
          />

          {/* Invoices */}
          <InvoicesTable
            invoices={invoices}
            isLoading={loadingInvoices}
            onViewInvoice={(invoiceId) => {
              // TODO: Open invoice detail view
              router.push(`/team/admin/invoice/${invoiceId}`);
            }}
            onDownloadInvoice={async (invoiceId) => {
              // TODO: Download invoice PDF
              alert(`Download invoice ${invoiceId} - PDF generation coming soon!`);
            }}
            onSendInvoice={async (invoiceId) => {
              try {
                const res = await fetch(`/api/team/billing/invoices/${invoiceId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'send' }),
                });
                if (res.ok) {
                  fetchInvoices();
                }
              } catch (error) {
                console.error('Failed to send invoice:', error);
              }
            }}
          />
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-6">
          {/* Usage Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total SMS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.usage.sms.messages || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  ${stats?.usage.sms.cost.toFixed(2) || '0.00'} cost
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">AI Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.usage.ai.requests || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  ${stats?.usage.ai.cost.toFixed(2) || '0.00'} overage
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Storage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.usage.storage.totalGb.toFixed(2) || '0.00'} GB
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  ${stats?.usage.storage.cost.toFixed(2) || '0.00'} overage
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Usage Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <UsageChart
              title="SMS Usage Trend"
              description="Messages sent over time"
              data={[
                { date: '2024-01', value: 450 },
                { date: '2024-02', value: 520 },
                { date: '2024-03', value: 480 },
                { date: '2024-04', value: 610 },
                { date: '2024-05', value: 580 },
                { date: '2024-06', value: stats?.usage.sms.messages || 0 },
              ]}
              valueSuffix=" msgs"
              color="#3b82f6"
            />

            <UsageChart
              title="AI Request Trend"
              description="AI requests over time"
              data={[
                { date: '2024-01', value: 1200 },
                { date: '2024-02', value: 1450 },
                { date: '2024-03', value: 1380 },
                { date: '2024-04', value: 1620 },
                { date: '2024-05', value: 1590 },
                { date: '2024-06', value: stats?.usage.ai.requests || 0 },
              ]}
              valueSuffix=" requests"
              color="#10b981"
            />
          </div>

          {/* Usage by Feature */}
          <UsageBarChart
            title="Usage by Feature"
            description="Breakdown of usage across different features"
            data={[
              { label: 'Email Summaries', value: 850, color: '#3b82f6' },
              { label: 'Smart Compose', value: 620, color: '#8b5cf6' },
              { label: 'Voice Transcription', value: 340, color: '#f59e0b' },
              { label: 'Reminders', value: 280, color: '#10b981' },
              { label: 'Contact Enrichment', value: 150, color: '#ef4444' },
            ]}
            valueSuffix=" uses"
          />

          {/* Per-User Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Usage by Team Member</CardTitle>
              <CardDescription>Individual usage breakdown for the current month</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Per-user usage analytics coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Manage roles and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push('/team')}>
                Go to Team Management
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Team Settings</CardTitle>
              <CardDescription>Configure team preferences and billing information</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Settings coming in Phase 3...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

