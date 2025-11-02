'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, Users, CheckCircle, XCircle } from 'lucide-react';
import InlineMessage from '@/components/ui/inline-message';

interface PricingPlan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  basePriceMonthly: string;
  basePriceAnnual: string;
  minSeats: number;
  maxSeats: number | null;
  isActive: boolean;
}

interface UsagePricing {
  id: string;
  serviceType: string;
  pricingModel: string;
  baseRate: string;
  unit: string;
  description: string;
  freeTierAmount: number;
  isActive: boolean;
}

export default function PricingContent() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [usagePricing, setUsagePricing] = useState<UsagePricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [plansRes, usageRes] = await Promise.all([
        fetch('/api/admin/pricing/plans'),
        fetch('/api/admin/pricing/usage'),
      ]);

      const plansData = await plansRes.json();
      const usageData = await usageRes.json();

      if (plansData.success) setPlans(plansData.plans || []);
      if (usageData.success) setUsagePricing(usageData.usage || []);
    } catch (error) {
      console.error('Failed to fetch pricing data:', error);
      showMessage('error', 'Failed to load pricing data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pricing & Plans</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage pricing plans and usage-based billing
          </p>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Inline Message */}
        {message && (
          <div className="mb-6">
            <InlineMessage type={message.type} message={message.text} />
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Plans</p>
                  <p className="text-2xl font-bold">{plans.length}</p>
                </div>
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Plans</p>
                  <p className="text-2xl font-bold">
                    {plans.filter(p => p.isActive).length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Usage Services</p>
                  <p className="text-2xl font-bold">{usagePricing.length}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Plans */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Subscription Plans</CardTitle>
            <CardDescription>
              Base pricing plans for team subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading plans...</div>
            ) : plans.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No pricing plans configured</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`border rounded-lg p-6 ${plan.isActive ? 'border-primary' : 'border-border'}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold">{plan.displayName}</h3>
                      {plan.isActive ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold">${plan.basePriceMonthly}</span>
                        <span className="text-sm text-muted-foreground">/month</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        or ${plan.basePriceAnnual}/year
                      </div>
                      <div className="pt-4 border-t">
                        <p className="text-sm">
                          <span className="font-medium">Seats:</span> {plan.minSeats} - {plan.maxSeats || '∞'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage-Based Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Usage-Based Pricing</CardTitle>
            <CardDescription>
              Per-use pricing for SMS, AI, storage, and other services
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading usage pricing...</div>
            ) : usagePricing.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No usage pricing configured</div>
            ) : (
              <div className="space-y-4">
                {usagePricing.map((usage) => (
                  <div
                    key={usage.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{usage.serviceType}</h4>
                        {usage.isActive ? (
                          <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded">
                            Active
                          </span>
                        ) : (
                          <span className="text-xs bg-gray-500/20 text-gray-500 px-2 py-0.5 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{usage.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">${usage.baseRate}</div>
                      <div className="text-xs text-muted-foreground">per {usage.unit}</div>
                      {usage.freeTierAmount > 0 && (
                        <div className="text-xs text-green-500 mt-1">
                          {usage.freeTierAmount} free
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

