'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import Link from 'next/link';
import {
  DollarSign,
  MessageSquare,
  Brain,
  HardDrive,
  Settings,
  Edit2,
  Plus,
  Building2,
  TrendingUp,
  Users,
  Calendar,
  ArrowLeft,
  CheckCircle,
  XCircle,
  X,
  Save
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

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

interface PricingTier {
  id: string;
  usagePricingId: string;
  tierName: string;
  minQuantity: number;
  maxQuantity: number | null;
  ratePerUnit: string;
}

interface BillingSetting {
  settingKey: string;
  settingValue: string;
  dataType: string;
  description: string;
}

interface OrganizationOverride {
  id: string;
  organizationId: string;
  organizationName: string;
  planId: string | null;
  customMonthlyRate: string | null;
  customAnnualRate: string | null;
  customSmsRate: string | null;
  customAiRate: string | null;
  customStorageRate: string | null;
  notes: string | null;
}

export default function AdminPricingPage() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [usagePricing, setUsagePricing] = useState<UsagePricing[]>([]);
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [settings, setSettings] = useState<BillingSetting[]>([]);
  const [overrides, setOverrides] = useState<OrganizationOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [editPlanModal, setEditPlanModal] = useState<PricingPlan | null>(null);
  const [editUsageModal, setEditUsageModal] = useState<UsagePricing | null>(null);
  const [editSettingsModal, setEditSettingsModal] = useState(false);
  const [editOverrideModal, setEditOverrideModal] = useState<OrganizationOverride | null>(null);
  const [addTierModal, setAddTierModal] = useState<string | null>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [plansRes, usageRes, tiersRes, settingsRes, overridesRes] = await Promise.all([
        fetch('/api/admin/pricing/plans'),
        fetch('/api/admin/pricing/usage'),
        fetch('/api/admin/pricing/tiers'),
        fetch('/api/admin/pricing/settings'),
        fetch('/api/admin/pricing/overrides'),
      ]);

      const [plansData, usageData, tiersData, settingsData, overridesData] = await Promise.all([
        plansRes.json(),
        usageRes.json(),
        tiersRes.json(),
        settingsRes.json(),
        overridesRes.json(),
      ]);

      // Extract data from API responses (handle both array and { success, data } formats)
      setPlans(Array.isArray(plansData) ? plansData : plansData.plans || []);
      setUsagePricing(Array.isArray(usageData) ? usageData : usageData.usagePricing || []);
      setTiers(Array.isArray(tiersData) ? tiersData : tiersData.tiers || []);
      setSettings(Array.isArray(settingsData) ? settingsData : settingsData.settings || []);
      setOverrides(Array.isArray(overridesData) ? overridesData : overridesData.overrides || []);
    } catch (error) {
      console.error('Failed to fetch pricing data:', error);
      setToast({ message: 'Failed to load pricing data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getSetting = (key: string): string => {
    return settings.find(s => s.settingKey === key)?.settingValue || '';
  };

  const formatSeats = (min: number, max: number | null) => {
    if (max === null) return `${min}+ users`;
    if (min === max) return `${min} user`;
    return `${min}-${max} users`;
  };

  const getSMSTiers = () => {
    const smsUsage = usagePricing.find(u => u.serviceType === 'sms');
    if (!smsUsage) return [];
    return tiers.filter(t => t.usagePricingId === smsUsage.id);
  };

  const getAIPricing = () => usagePricing.find(u => u.serviceType === 'ai');
  const getStoragePricing = () => usagePricing.find(u => u.serviceType === 'storage');

  if (loading) {
    return (
      <AdminLayout>
        <div className="h-full overflow-y-auto">
          <div className="p-8 max-w-7xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-64 mb-6"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-64 bg-muted rounded"></div>
                <div className="h-64 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Pricing & Billing Management</h1>
          <p className="text-muted-foreground">Configure subscription plans, usage-based pricing, and billing settings</p>
        </div>

        {/* Inline Toast Notification */}
        {toast && (
          <div className={`p-4 rounded-lg border flex items-start gap-3 animate-in slide-in-from-top-2 ${
            toast.type === 'success' ? 'bg-primary/10 border-primary text-primary' :
            'bg-destructive/10 border-destructive text-destructive'
          }`}>
            <div className="flex-shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle className="h-5 w-5" />}
              {toast.type === 'error' && <XCircle className="h-5 w-5" />}
            </div>
            <div className="flex-1">
              <p className="font-medium">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="flex-shrink-0 hover:opacity-70 transition-opacity"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

      {/* Subscription Plans */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">Subscription Plans</h2>
          </div>
          <span className="text-sm text-muted-foreground">{getSetting('annual_discount_percent')}% annual discount</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-lg mb-1">{plan.displayName}</h3>
              <p className="text-sm text-muted-foreground mb-3">{formatSeats(plan.minSeats, plan.maxSeats)}</p>

              <div className="space-y-2 mb-4">
                <div>
                  <p className="text-2xl font-bold text-foreground">${plan.basePriceMonthly}</p>
                  <p className="text-xs text-muted-foreground">per user/month</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-primary">${plan.basePriceAnnual}</p>
                  <p className="text-xs text-muted-foreground">per user/year (annual)</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4 min-h-[60px]">{plan.description}</p>

              <button
                onClick={() => setEditPlanModal(plan)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Edit Plan
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SMS Pricing */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">SMS Pricing</h2>
          </div>
          <button
            onClick={() => {
              const smsUsage = usagePricing.find(u => u.serviceType === 'sms');
              if (smsUsage) setAddTierModal(smsUsage.id);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded hover:bg-primary/20"
          >
            <Plus className="w-4 h-4" />
            Add Tier
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
            <div>
              <p className="font-medium">Default Rate</p>
              <p className="text-sm text-muted-foreground">Base cost per SMS message</p>
            </div>
            <p className="text-2xl font-bold text-primary">${getSetting('default_sms_rate')}</p>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Volume Tiers</h3>
            <div className="space-y-2">
              {getSMSTiers().map((tier) => (
                <div key={tier.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <p className="font-medium">{tier.tierName}</p>
                    <p className="text-sm text-muted-foreground">
                      {tier.minQuantity.toLocaleString()} - {tier.maxQuantity ? tier.maxQuantity.toLocaleString() : '∞'} messages
                    </p>
                  </div>
                  <p className="font-bold text-primary">${tier.ratePerUnit}/msg</p>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              const smsUsage = usagePricing.find(u => u.serviceType === 'sms');
              if (smsUsage) setEditUsageModal(smsUsage);
            }}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded hover:bg-accent"
          >
            <Edit2 className="w-4 h-4" />
            Edit SMS Pricing
          </button>
        </div>
      </div>

      {/* AI Usage Pricing */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <Brain className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">AI Usage Pricing</h2>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-primary/10 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Free Tier</p>
              <p className="text-2xl font-bold text-primary">
                {getSetting('ai_free_requests_monthly')} requests
              </p>
              <p className="text-xs text-muted-foreground">per user/month</p>
            </div>
            <div className="p-4 bg-primary/10 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Overage Rate</p>
              <p className="text-2xl font-bold text-primary">
                ${getSetting('ai_overage_rate')}
              </p>
              <p className="text-xs text-muted-foreground">per request</p>
            </div>
          </div>

          <button
            onClick={() => {
              const aiUsage = getAIPricing();
              if (aiUsage) setEditUsageModal(aiUsage);
            }}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded hover:bg-accent"
          >
            <Edit2 className="w-4 h-4" />
            Edit AI Pricing
          </button>
        </div>
      </div>

      {/* Storage Pricing */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <HardDrive className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">Storage Pricing</h2>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-primary/10 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Included Storage</p>
              <p className="text-2xl font-bold text-primary">
                {getSetting('storage_included_gb')} GB
              </p>
              <p className="text-xs text-muted-foreground">per user</p>
            </div>
            <div className="p-4 bg-primary/10 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Overage Rate</p>
              <p className="text-2xl font-bold text-primary">
                ${getSetting('storage_overage_rate')}
              </p>
              <p className="text-xs text-muted-foreground">per GB</p>
            </div>
          </div>

          <button
            onClick={() => {
              const storageUsage = getStoragePricing();
              if (storageUsage) setEditUsageModal(storageUsage);
            }}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded hover:bg-accent"
          >
            <Edit2 className="w-4 h-4" />
            Edit Storage Pricing
          </button>
        </div>
      </div>

      {/* Billing Settings */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">Billing Settings</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="p-4 border border-border rounded-lg">
            <Calendar className="w-5 h-5 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Free Trial Period</p>
            <p className="text-xl font-bold">{getSetting('trial_period_days')} days</p>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <TrendingUp className="w-5 h-5 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Annual Discount</p>
            <p className="text-xl font-bold">{getSetting('annual_discount_percent')}%</p>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <Calendar className="w-5 h-5 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Grace Period</p>
            <p className="text-xl font-bold">{getSetting('grace_period_days')} days</p>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <Settings className="w-5 h-5 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Auto-Suspend</p>
            <p className="text-xl font-bold">{getSetting('auto_suspend_on_failure') === 'true' ? 'Enabled' : 'Disabled'}</p>
          </div>
        </div>

        <button
          onClick={() => setEditSettingsModal(true)}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded hover:bg-accent"
        >
          <Edit2 className="w-4 h-4" />
          Edit Settings
        </button>
      </div>

      {/* Organization Overrides */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">Organization Overrides</h2>
            <span className="px-2 py-1 bg-primary/10 text-primary text-sm rounded-full">
              {overrides.length}
            </span>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded hover:bg-primary/20">
            <Plus className="w-4 h-4" />
            Add Override
          </button>
        </div>

        {overrides.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p>No custom pricing overrides</p>
            <p className="text-sm">Add overrides for specific organizations</p>
          </div>
        ) : (
          <div className="space-y-2">
            {overrides.map((override) => (
              <div key={override.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent">
                <div className="flex-1">
                  <p className="font-medium">{override.organizationName}</p>
                  <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                    {override.customMonthlyRate && <span>Monthly: ${override.customMonthlyRate}</span>}
                    {override.customSmsRate && <span>SMS: ${override.customSmsRate}</span>}
                    {override.customAiRate && <span>AI: ${override.customAiRate}</span>}
                  </div>
                </div>
                <button
                  onClick={() => setEditOverrideModal(override)}
                  className="px-3 py-1 text-primary hover:bg-primary/10 rounded"
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Plan Modal */}
      {editPlanModal && (
        <Dialog open={!!editPlanModal} onOpenChange={() => setEditPlanModal(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Subscription Plan: {editPlanModal.displayName}</DialogTitle>
              <DialogDescription>
                Update pricing and configuration for this plan
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    defaultValue={editPlanModal.displayName}
                    placeholder="e.g., Pro Plan"
                  />
                </div>
                <div>
                  <Label htmlFor="name">Plan ID</Label>
                  <Input
                    id="name"
                    defaultValue={editPlanModal.name}
                    placeholder="e.g., pro"
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  defaultValue={editPlanModal.description}
                  placeholder="Brief description of the plan features"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="basePriceMonthly">Monthly Price (per user)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">$</span>
                    <Input
                      id="basePriceMonthly"
                      type="number"
                      step="0.01"
                      defaultValue={editPlanModal.basePriceMonthly}
                      placeholder="29.99"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="basePriceAnnual">Annual Price (per user)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">$</span>
                    <Input
                      id="basePriceAnnual"
                      type="number"
                      step="0.01"
                      defaultValue={editPlanModal.basePriceAnnual}
                      placeholder="299.99"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minSeats">Minimum Seats</Label>
                  <Input
                    id="minSeats"
                    type="number"
                    defaultValue={editPlanModal.minSeats}
                    placeholder="1"
                  />
                </div>
                <div>
                  <Label htmlFor="maxSeats">Maximum Seats</Label>
                  <Input
                    id="maxSeats"
                    type="number"
                    defaultValue={editPlanModal.maxSeats || ''}
                    placeholder="Unlimited"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Leave empty for unlimited</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <Label>Plan Active</Label>
                  <p className="text-sm text-muted-foreground">Enable this plan for new subscriptions</p>
                </div>
                <Switch defaultChecked={editPlanModal.isActive} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditPlanModal(null)}>
                Cancel
              </Button>
              <Button onClick={() => {
                setToast({ message: 'Plan updated successfully', type: 'success' });
                setEditPlanModal(null);
              }}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Usage Modal */}
      {editUsageModal && (
        <Dialog open={!!editUsageModal} onOpenChange={() => setEditUsageModal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit {editUsageModal.serviceType.toUpperCase()} Pricing</DialogTitle>
              <DialogDescription>
                Update usage-based pricing configuration
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="baseRate">Base Rate</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    id="baseRate"
                    type="number"
                    step="0.001"
                    defaultValue={editUsageModal.baseRate}
                  />
                  <span className="text-sm text-muted-foreground">per {editUsageModal.unit}</span>
                </div>
              </div>

              <div>
                <Label htmlFor="freeTier">Free Tier Amount</Label>
                <Input
                  id="freeTier"
                  type="number"
                  defaultValue={editUsageModal.freeTierAmount}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Amount included for free per user/month
                </p>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  defaultValue={editUsageModal.description}
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <Label>Active</Label>
                  <p className="text-sm text-muted-foreground">Enable this pricing model</p>
                </div>
                <Switch defaultChecked={editUsageModal.isActive} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditUsageModal(null)}>
                Cancel
              </Button>
              <Button onClick={() => {
                setToast({ message: 'Usage pricing updated', type: 'success' });
                setEditUsageModal(null);
              }}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Billing Settings Modal */}
      {editSettingsModal && (
        <Dialog open={editSettingsModal} onOpenChange={setEditSettingsModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Billing Settings</DialogTitle>
              <DialogDescription>
                Configure system-wide billing parameters
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="trialDays">Free Trial Period (days)</Label>
                  <Input
                    id="trialDays"
                    type="number"
                    defaultValue={getSetting('trial_period_days')}
                  />
                </div>
                <div>
                  <Label htmlFor="graceDays">Grace Period (days)</Label>
                  <Input
                    id="graceDays"
                    type="number"
                    defaultValue={getSetting('grace_period_days')}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="annualDiscount">Annual Discount (%)</Label>
                <Input
                  id="annualDiscount"
                  type="number"
                  step="0.1"
                  defaultValue={getSetting('annual_discount_percent')}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <Label>Auto-Suspend on Payment Failure</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically suspend accounts when payment fails
                  </p>
                </div>
                <Switch defaultChecked={getSetting('auto_suspend_on_failure') === 'true'} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditSettingsModal(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                setToast({ message: 'Billing settings updated', type: 'success' });
                setEditSettingsModal(false);
              }}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Add SMS Tier Modal */}
      {addTierModal && (
        <Dialog open={!!addTierModal} onOpenChange={() => setAddTierModal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add SMS Volume Tier</DialogTitle>
              <DialogDescription>
                Create a new pricing tier for volume discounts
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="tierName">Tier Name</Label>
                <Input
                  id="tierName"
                  placeholder="e.g., High Volume"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minQty">Minimum Quantity</Label>
                  <Input
                    id="minQty"
                    type="number"
                    placeholder="1000"
                  />
                </div>
                <div>
                  <Label htmlFor="maxQty">Maximum Quantity</Label>
                  <Input
                    id="maxQty"
                    type="number"
                    placeholder="10000"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Leave empty for unlimited</p>
                </div>
              </div>

              <div>
                <Label htmlFor="ratePerUnit">Rate per Message</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    id="ratePerUnit"
                    type="number"
                    step="0.001"
                    placeholder="0.015"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddTierModal(null)}>
                Cancel
              </Button>
              <Button onClick={() => {
                setToast({ message: 'Volume tier added', type: 'success' });
                setAddTierModal(null);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Tier
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Organization Override Modal */}
      {editOverrideModal && (
        <Dialog open={!!editOverrideModal} onOpenChange={() => setEditOverrideModal(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Pricing Override: {editOverrideModal.organizationName}</DialogTitle>
              <DialogDescription>
                Set custom pricing for this organization
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customMonthly">Custom Monthly Rate (per user)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">$</span>
                    <Input
                      id="customMonthly"
                      type="number"
                      step="0.01"
                      defaultValue={editOverrideModal.customMonthlyRate || ''}
                      placeholder="Default rate"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="customAnnual">Custom Annual Rate (per user)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">$</span>
                    <Input
                      id="customAnnual"
                      type="number"
                      step="0.01"
                      defaultValue={editOverrideModal.customAnnualRate || ''}
                      placeholder="Default rate"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="customSMS">SMS Rate</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">$</span>
                    <Input
                      id="customSMS"
                      type="number"
                      step="0.001"
                      defaultValue={editOverrideModal.customSmsRate || ''}
                      placeholder="Default"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="customAI">AI Rate</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">$</span>
                    <Input
                      id="customAI"
                      type="number"
                      step="0.001"
                      defaultValue={editOverrideModal.customAiRate || ''}
                      placeholder="Default"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="customStorage">Storage Rate</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">$</span>
                    <Input
                      id="customStorage"
                      type="number"
                      step="0.01"
                      defaultValue={editOverrideModal.customStorageRate || ''}
                      placeholder="Default"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Internal Notes</Label>
                <Textarea
                  id="notes"
                  defaultValue={editOverrideModal.notes || ''}
                  placeholder="Reason for custom pricing, contract details, etc."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOverrideModal(null)}>
                Cancel
              </Button>
              <Button onClick={() => {
                setToast({ message: 'Pricing override updated', type: 'success' });
                setEditOverrideModal(null);
              }}>
                <Save className="h-4 w-4 mr-2" />
                Save Override
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      </div>
    </AdminLayout>
  );
}

