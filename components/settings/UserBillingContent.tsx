'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  DollarSign, 
  TrendingUp, 
  FileText,
  CreditCard,
  Download,
  Calendar,
  Zap,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { InvoicesTable } from '@/components/billing/InvoicesTable';
import { PaymentMethods } from '@/components/billing/PaymentMethods';
import { UsageChart } from '@/components/charts/UsageChart';
import { UsageBarChart } from '@/components/charts/UsageBarChart';

type Tab = 'overview' | 'subscription' | 'invoices' | 'payment';

interface BillingData {
  subscription: {
    planName: string;
    billingCycle: string;
    pricePerMonth: number;
    seats: number;
    status: string;
    currentPeriodEnd: Date | string;
    cancelAtPeriodEnd: boolean;
  } | null;
  currentMonth: {
    periodStart: Date | string;
    periodEnd: Date | string;
    subscription: number;
    sms: {
      messages: number;
      cost: number;
    };
    ai: {
      requests: number;
      cost: number;
      byFeature: Record<string, number>;
    };
    storage: {
      totalGb: number;
      overageGb: number;
      cost: number;
    };
    total: number;
  };
  recentInvoices: any[];
}

export default function UserBillingContent() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);

  const sections = [
    { id: 'overview' as Tab, name: 'Overview', icon: TrendingUp },
    { id: 'subscription' as Tab, name: 'Subscription', icon: Zap },
    { id: 'invoices' as Tab, name: 'Invoices', icon: FileText },
    { id: 'payment' as Tab, name: 'Payment Methods', icon: CreditCard },
  ];

  useEffect(() => {
    fetchBillingData();
  }, []);

  useEffect(() => {
    if (activeTab === 'payment') {
      fetchPaymentMethods();
    }
  }, [activeTab]);

  const fetchBillingData = async () => {
    try {
      const res = await fetch('/api/user/billing');
      const data = await res.json();
      if (data.success) {
        setBilling(data.billing);
      } else {
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        setBilling({
          subscription: null,
          currentMonth: {
            periodStart: periodStart.toISOString(),
            periodEnd: periodEnd.toISOString(),
            subscription: 0,
            sms: { messages: 0, cost: 0 },
            ai: { requests: 0, cost: 0, byFeature: {} },
            storage: { totalGb: 0, overageGb: 0, cost: 0 },
            total: 0,
          },
          recentInvoices: [],
        });
      }
    } catch (error) {
      console.error('Failed to fetch billing data:', error);
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      setBilling({
        subscription: null,
        currentMonth: {
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          subscription: 0,
          sms: { messages: 0, cost: 0 },
          ai: { requests: 0, cost: 0, byFeature: {} },
          storage: { totalGb: 0, overageGb: 0, cost: 0 },
          total: 0,
        },
        recentInvoices: [],
      });
    } finally {
      setLoading(false);
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

  const handleDownloadStatement = async () => {
    try {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const res = await fetch('/api/team/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: 'billing',
          format: 'csv',
          startDate,
          endDate,
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `billing-statement-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to download statement');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download statement');
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="flex w-full h-full">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card p-4 overflow-y-auto flex-shrink-0">
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-3 text-foreground">Billing & Usage</h2>
          <a 
            href="/settings"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 19-7-7 7-7"/>
              <path d="M19 12H5"/>
            </svg>
            Back to Settings
          </a>
        </div>
        <nav className="space-y-1">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveTab(section.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  activeTab === section.id
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
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                {sections.find(s => s.id === activeTab)?.name}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {activeTab === 'overview' && 'View your usage and billing summary'}
                {activeTab === 'subscription' && 'Manage your subscription plan'}
                {activeTab === 'invoices' && 'Download and view past invoices'}
                {activeTab === 'payment' && 'Manage payment methods'}
              </p>
            </div>
            {activeTab === 'overview' && (
              <Button variant="outline" onClick={handleDownloadStatement}>
                <Download className="h-4 w-4 mr-2" />
                Download Statement
              </Button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="max-w-6xl space-y-6">
                  {/* Current Month Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Current Month Billing</CardTitle>
                      <CardDescription>
                        {billing?.currentMonth.periodStart && 
                          `${formatDate(billing.currentMonth.periodStart)} - ${formatDate(billing.currentMonth.periodEnd)}`
                        }
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Subscription</span>
                          <span className="font-semibold">
                            ${billing?.currentMonth.subscription.toFixed(2) || '0.00'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">SMS Messages</span>
                          <span className="font-semibold">
                            ${billing?.currentMonth.sms.cost.toFixed(2) || '0.00'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">AI Usage</span>
                          <span className="font-semibold">
                            ${billing?.currentMonth.ai.cost.toFixed(2) || '0.00'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Storage Overage</span>
                          <span className="font-semibold">
                            ${billing?.currentMonth.storage.cost.toFixed(2) || '0.00'}
                          </span>
                        </div>
                        <div className="h-px bg-border"></div>
                        <div className="flex items-center justify-between text-lg">
                          <span className="font-semibold">Total</span>
                          <span className="font-bold text-primary">
                            ${billing?.currentMonth.total.toFixed(2) || '0.00'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Usage Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">SMS Messages</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {billing?.currentMonth.sms.messages || 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">This month</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">AI Requests</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {billing?.currentMonth.ai.requests || 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">This month</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {billing?.currentMonth.storage.totalGb.toFixed(2) || '0.00'} GB
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {billing?.currentMonth.storage.overageGb && billing.currentMonth.storage.overageGb > 0
                            ? `${billing.currentMonth.storage.overageGb.toFixed(2)} GB over limit`
                            : 'Within limit'
                          }
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Usage Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <UsageChart
                      title="SMS Usage Trend"
                      description="Messages sent over the last 6 months"
                      data={[
                        { date: '2024-01', value: 120 },
                        { date: '2024-02', value: 145 },
                        { date: '2024-03', value: 135 },
                        { date: '2024-04', value: 160 },
                        { date: '2024-05', value: 152 },
                        { date: '2024-06', value: billing?.currentMonth.sms.messages || 0 },
                      ]}
                      valueSuffix=" msgs"
                      color="#3b82f6"
                    />

                    <UsageChart
                      title="AI Request Trend"
                      description="AI requests over the last 6 months"
                      data={[
                        { date: '2024-01', value: 320 },
                        { date: '2024-02', value: 380 },
                        { date: '2024-03', value: 360 },
                        { date: '2024-04', value: 420 },
                        { date: '2024-05', value: 410 },
                        { date: '2024-06', value: billing?.currentMonth.ai.requests || 0 },
                      ]}
                      valueSuffix=" requests"
                      color="#10b981"
                    />
                  </div>

                  {/* AI Usage by Feature */}
                  {billing?.currentMonth.ai.byFeature && Object.keys(billing.currentMonth.ai.byFeature).length > 0 && (
                    <UsageBarChart
                      title="AI Usage by Feature"
                      description="Breakdown of AI usage across different features"
                      data={Object.entries(billing.currentMonth.ai.byFeature).map(([feature, count]) => ({
                        label: feature,
                        value: count as number,
                        color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
                      }))}
                      valueSuffix=" uses"
                    />
                  )}
                </div>
              )}

              {activeTab === 'subscription' && (
                <div className="max-w-4xl space-y-6">
                  {billing?.subscription ? (
                    <Card>
                      <CardHeader>
                        <CardTitle>Current Plan</CardTitle>
                        <CardDescription>Your active subscription details</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-2xl font-bold">{billing.subscription.planName}</p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {billing.subscription.billingCycle} billing
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold">
                              ${billing.subscription.pricePerMonth.toFixed(2)}
                            </p>
                            <p className="text-sm text-muted-foreground">/month</p>
                          </div>
                        </div>
                        
                        <div className="h-px bg-border"></div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Status</span>
                            <span className="capitalize font-medium">{billing.subscription.status}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Renewal Date</span>
                            <span className="font-medium">
                              <Calendar className="w-4 h-4 inline mr-1" />
                              {formatDate(billing.subscription.currentPeriodEnd)}
                            </span>
                          </div>
                          {billing.subscription.cancelAtPeriodEnd && (
                            <div className="flex items-center justify-between text-sm text-yellow-600">
                              <span>Cancels at period end</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="h-px bg-border"></div>
                        
                        <div className="flex gap-2">
                          <Button variant="default" className="flex-1" onClick={() => alert('Plan upgrades coming soon!')}>
                            Upgrade Plan
                          </Button>
                          <Button variant="outline" className="flex-1" onClick={() => alert('Subscription management coming soon!')}>
                            Manage Subscription
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>No Active Subscription</CardTitle>
                        <CardDescription>Choose a plan to get started</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button onClick={() => alert('Plan selection coming soon!')}>Browse Plans</Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {activeTab === 'invoices' && (
                <div className="max-w-6xl">
                  <InvoicesTable
                    invoices={billing?.recentInvoices || []}
                    isLoading={loading}
                    onViewInvoice={(invoiceId) => {
                      window.open(`/billing/invoice/${invoiceId}`, '_blank');
                    }}
                    onDownloadInvoice={async (invoiceId) => {
                      alert(`Download invoice ${invoiceId} - PDF generation coming soon!`);
                    }}
                  />
                </div>
              )}

              {activeTab === 'payment' && (
                <div className="max-w-4xl">
                  <PaymentMethods
                    paymentMethods={paymentMethods}
                    isLoading={loadingPaymentMethods}
                    onAddPaymentMethod={() => {
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
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

