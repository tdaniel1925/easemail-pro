/**
 * Billing Dashboard
 * Displays subscription, usage, and payment information
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, TrendingUp, DollarSign, Zap, MessageSquare, Database, Mail, AlertCircle } from 'lucide-react';

interface UsageData {
  period: {
    start: string;
    end: string;
  };
  usage: {
    sms: { count: number; cost: number; formatted: string };
    ai: { tokens: number; cost: number; formatted: string };
    storage: { gb: number; cost: number; formatted: string };
    email: { count: number; cost: number; formatted: string };
  };
  total: {
    cost: number;
    formatted: string;
  };
}

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  pricing: {
    monthly: number;
    yearly: number | null;
    currency: string;
  };
  features: string[];
  limits: {
    maxSeats?: number;
    maxEmails?: number;
    maxStorage?: number;
    aiRequests?: number;
    smsMessages?: number;
  };
}

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    loadBillingData();
  }, []);

  async function loadBillingData() {
    try {
      setLoading(true);
      setError(null);

      // Load current usage
      const usageRes = await fetch('/api/billing/usage/current');
      if (usageRes.ok) {
        const usageData = await usageRes.json();
        setUsage(usageData);
      }

      // Load available plans
      const plansRes = await fetch('/api/billing/plans');
      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData.plans || []);
      }
    } catch (err) {
      console.error('Failed to load billing data:', err);
      setError('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Billing & Usage</h1>
        <p className="text-gray-600 mt-1">
          Manage your subscription and track your usage
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="usage" className="space-y-6">
        <TabsList>
          <TabsTrigger value="usage">Current Usage</TabsTrigger>
          <TabsTrigger value="plans">Plans & Pricing</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payment">Payment Methods</TabsTrigger>
        </TabsList>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-6">
          {usage && (
            <>
              {/* Current Period */}
              <Card>
                <CardHeader>
                  <CardTitle>Current Billing Period</CardTitle>
                  <CardDescription>
                    {new Date(usage.period.start).toLocaleDateString()} -{' '}
                    {new Date(usage.period.end).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Usage</span>
                      <span className="text-2xl font-bold">{usage.total.formatted}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Usage Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* SMS Usage */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">SMS Messages</CardTitle>
                      <MessageSquare className="h-4 w-4 text-blue-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{usage.usage.sms.count}</div>
                    <p className="text-xs text-gray-600 mt-1">
                      {usage.usage.sms.formatted} total
                    </p>
                  </CardContent>
                </Card>

                {/* AI Usage */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">AI Requests</CardTitle>
                      <Zap className="h-4 w-4 text-purple-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {usage.usage.ai.tokens.toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {usage.usage.ai.formatted} total
                    </p>
                  </CardContent>
                </Card>

                {/* Storage Usage */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">Storage</CardTitle>
                      <Database className="h-4 w-4 text-green-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {usage.usage.storage.gb.toFixed(2)} GB
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {usage.usage.storage.formatted} total
                    </p>
                  </CardContent>
                </Card>

                {/* Email Usage */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">Emails</CardTitle>
                      <Mail className="h-4 w-4 text-orange-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{usage.usage.email.count}</div>
                    <p className="text-xs text-gray-600 mt-1">
                      {usage.usage.email.formatted} total
                    </p>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">
                      ${plan.pricing.monthly}
                    </span>
                    <span className="text-gray-600">/month</span>
                  </div>
                  {plan.pricing.yearly && (
                    <div className="text-sm text-gray-600">
                      or ${plan.pricing.yearly}/year (save{' '}
                      {Math.round(
                        ((plan.pricing.monthly * 12 - plan.pricing.yearly) /
                          (plan.pricing.monthly * 12)) *
                          100
                      )}
                      %)
                    </div>
                  )}
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2 text-sm">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-green-600 mr-2">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full mt-4" variant="outline">
                    {plan.slug === 'free' ? 'Current Plan' : 'Upgrade'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Invoice History</CardTitle>
              <CardDescription>View and download your past invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-center py-8">
                No invoices yet
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>Manage your payment methods</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-center py-8">
                No payment methods configured
              </p>
              <Button className="w-full mt-4">
                <CreditCard className="h-4 w-4 mr-2" />
                Add Payment Method
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
