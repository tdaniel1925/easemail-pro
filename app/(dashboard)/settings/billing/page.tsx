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
  ArrowLeft
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InvoicesTable } from '@/components/billing/InvoicesTable';
import { PaymentMethods } from '@/components/billing/PaymentMethods';
import { UsageChart } from '@/components/charts/UsageChart';
import { UsageBarChart } from '@/components/charts/UsageBarChart';

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

export default function UserBillingPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);

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
      }
    } catch (error) {
      console.error('Failed to fetch billing data:', error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Back Link */}
      <Link
        href="/settings"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Settings
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Billing & Usage</h1>
            <p className="text-muted-foreground mt-1">
              Manage your subscription, payments, and view usage details
            </p>
          </div>
          <Button variant="outline" onClick={handleDownloadStatement}>
            <Download className="h-4 w-4 mr-2" />
            Download Statement
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">
            <TrendingUp className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="subscription">
            <Zap className="h-4 w-4 mr-2" />
            Subscription
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <FileText className="h-4 w-4 mr-2" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="payment">
            <CreditCard className="h-4 w-4 mr-2" />
            Payment Methods
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
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
                <p className="text-xs text-muted-foreground mt-1">
                  This month
                </p>
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
                <p className="text-xs text-muted-foreground mt-1">
                  This month
                </p>
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
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-6">
          {billing?.subscription ? (
            <>
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
            </>
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
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
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
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="payment">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

