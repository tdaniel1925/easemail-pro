'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Plus, Edit2, Save, X } from 'lucide-react';

interface PricingPlan {
  id: string;
  name: string;
  display_name: string;
  description: string;
  base_price_monthly: string;
  base_price_annual: string;
  min_seats: number;
  max_seats: number | null;
  is_active: boolean;
}

interface UsagePricing {
  id: string;
  service_type: string;
  pricing_model: string;
  base_rate: string;
  unit: string;
  description: string;
  is_active: boolean;
}

export default function PricingContentSimple() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [usage, setUsage] = useState<UsagePricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editingUsage, setEditingUsage] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      setError('');

      // Use direct SQL endpoint instead of Drizzle
      const [plansRes, usageRes] = await Promise.all([
        fetch('/api/admin/pricing/plans/direct'),
        fetch('/api/admin/pricing/usage/direct'),
      ]);

      if (!plansRes.ok || !usageRes.ok) {
        throw new Error('Failed to load pricing data');
      }

      const plansData = await plansRes.json();
      const usageData = await usageRes.json();

      setPlans(plansData.plans || []);
      setUsage(usageData.usage || []);
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function updatePlan(plan: PricingPlan) {
    try {
      const res = await fetch('/api/admin/pricing/plans/direct', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan),
      });

      if (!res.ok) throw new Error('Failed to update plan');

      await fetchData();
      setEditingPlan(null);
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  }

  async function updateUsage(item: UsagePricing) {
    try {
      const res = await fetch('/api/admin/pricing/usage/direct', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });

      if (!res.ok) throw new Error('Failed to update usage pricing');

      await fetchData();
      setEditingUsage(null);
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive font-medium">Error loading pricing data</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
          <button
            onClick={fetchData}
            className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-8 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold mb-1">Pricing & Plans</h1>
          <p className="text-muted-foreground">Manage subscription plans and usage-based pricing</p>
        </div>

        {/* Subscription Plans */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Subscription Plans</h2>
          </div>

          <div className="border border-border rounded-lg divide-y divide-border">
            {plans.map((plan) => (
              <div key={plan.id} className="p-4 hover:bg-accent/50">
                {editingPlan === plan.id ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                        Plan Name
                      </label>
                      <input
                        type="text"
                        value={plan.display_name}
                        onChange={(e) =>
                          setPlans(plans.map((p) => (p.id === plan.id ? { ...p, display_name: e.target.value } : p)))
                        }
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                        placeholder="Display Name"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                          Monthly Price ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={plan.base_price_monthly}
                          onChange={(e) =>
                            setPlans(plans.map((p) => (p.id === plan.id ? { ...p, base_price_monthly: e.target.value } : p)))
                          }
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                          Annual Price ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={plan.base_price_annual}
                          onChange={(e) =>
                            setPlans(plans.map((p) => (p.id === plan.id ? { ...p, base_price_annual: e.target.value } : p)))
                          }
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updatePlan(plan)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm"
                      >
                        <Save className="h-4 w-4" />
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingPlan(null);
                          fetchData();
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg text-sm"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{plan.display_name}</h3>
                      <div className="flex items-center gap-3 mt-2">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Monthly</p>
                          <p className="text-sm font-semibold mt-0.5">${plan.base_price_monthly}</p>
                        </div>
                        <div className="h-8 w-px bg-border"></div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Yearly</p>
                          <p className="text-sm font-semibold mt-0.5">${plan.base_price_annual}</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {plan.min_seats}-{plan.max_seats || '∞'} seats
                      </p>
                    </div>
                    <button
                      onClick={() => setEditingPlan(plan.id)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-accent rounded-lg text-sm hover:bg-accent/80"
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Usage-Based Pricing */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Usage-Based Pricing</h2>
          </div>

          <div className="border border-border rounded-lg divide-y divide-border">
            {usage.map((item) => (
              <div key={item.id} className="p-4 hover:bg-accent/50">
                {editingUsage === item.id ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                        Service Type
                      </label>
                      <input
                        type="text"
                        value={item.service_type}
                        disabled
                        className="w-full px-3 py-2 bg-muted border border-border rounded-lg"
                        placeholder="Service Type"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                          Base Rate ($)
                        </label>
                        <input
                          type="number"
                          step="0.0001"
                          value={item.base_rate}
                          onChange={(e) =>
                            setUsage(usage.map((u) => (u.id === item.id ? { ...u, base_rate: e.target.value } : u)))
                          }
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                          placeholder="0.0000"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                          Unit
                        </label>
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) =>
                            setUsage(usage.map((u) => (u.id === item.id ? { ...u, unit: e.target.value } : u)))
                          }
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                          placeholder="e.g., SMS, token"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                        Description
                      </label>
                      <input
                        type="text"
                        value={item.description || ''}
                        onChange={(e) =>
                          setUsage(usage.map((u) => (u.id === item.id ? { ...u, description: e.target.value } : u)))
                        }
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                        placeholder="Description"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateUsage(item)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm"
                      >
                        <Save className="h-4 w-4" />
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingUsage(null);
                          fetchData();
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg text-sm"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold capitalize">{item.service_type.replace('_', ' ')}</h3>
                      <div className="flex items-center gap-3 mt-2">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rate</p>
                          <p className="text-sm font-semibold mt-0.5">${item.base_rate}</p>
                        </div>
                        <div className="h-8 w-px bg-border"></div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Per</p>
                          <p className="text-sm font-semibold mt-0.5">{item.unit}</p>
                        </div>
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-2">{item.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => setEditingUsage(item.id)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-accent rounded-lg text-sm hover:bg-accent/80"
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

