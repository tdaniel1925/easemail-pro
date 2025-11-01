'use client';

import { useState, useEffect } from 'react';
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
  Calendar
} from 'lucide-react';

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

      setPlans(plansData);
      setUsagePricing(usageData);
      setTiers(tiersData);
      setSettings(settingsData);
      setOverrides(overridesData);
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
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Pricing & Billing Management</h1>
        <p className="text-gray-600">Configure subscription plans, usage-based pricing, and billing settings</p>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <p className={toast.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {toast.message}
          </p>
        </div>
      )}

      {/* Subscription Plans */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Subscription Plans</h2>
          </div>
          <span className="text-sm text-gray-500">{getSetting('annual_discount_percent')}% annual discount</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-lg mb-1">{plan.displayName}</h3>
              <p className="text-sm text-gray-600 mb-3">{formatSeats(plan.minSeats, plan.maxSeats)}</p>
              
              <div className="space-y-2 mb-4">
                <div>
                  <p className="text-2xl font-bold text-gray-900">${plan.basePriceMonthly}</p>
                  <p className="text-xs text-gray-500">per user/month</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-green-600">${plan.basePriceAnnual}</p>
                  <p className="text-xs text-gray-500">per user/year (annual)</p>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4 min-h-[60px]">{plan.description}</p>

              <button
                onClick={() => setEditPlanModal(plan)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Edit Plan
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SMS Pricing */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-semibold">SMS Pricing</h2>
          </div>
          <button
            onClick={() => {
              const smsUsage = usagePricing.find(u => u.serviceType === 'sms');
              if (smsUsage) setAddTierModal(smsUsage.id);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded hover:bg-purple-100"
          >
            <Plus className="w-4 h-4" />
            Add Tier
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
            <div>
              <p className="font-medium">Default Rate</p>
              <p className="text-sm text-gray-600">Base cost per SMS message</p>
            </div>
            <p className="text-2xl font-bold text-purple-700">${getSetting('default_sms_rate')}</p>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Volume Tiers</h3>
            <div className="space-y-2">
              {getSMSTiers().map((tier) => (
                <div key={tier.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium">{tier.tierName}</p>
                    <p className="text-sm text-gray-600">
                      {tier.minQuantity.toLocaleString()} - {tier.maxQuantity ? tier.maxQuantity.toLocaleString() : '∞'} messages
                    </p>
                  </div>
                  <p className="font-bold text-purple-700">${tier.ratePerUnit}/msg</p>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              const smsUsage = usagePricing.find(u => u.serviceType === 'sms');
              if (smsUsage) setEditUsageModal(smsUsage);
            }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            <Edit2 className="w-4 h-4" />
            Edit SMS Pricing
          </button>
        </div>
      </div>

      {/* AI Usage Pricing */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Brain className="w-6 h-6 text-indigo-600" />
          <h2 className="text-xl font-semibold">AI Usage Pricing</h2>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-indigo-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Free Tier</p>
              <p className="text-2xl font-bold text-indigo-700">
                {getSetting('ai_free_requests_monthly')} requests
              </p>
              <p className="text-xs text-gray-500">per user/month</p>
            </div>
            <div className="p-4 bg-indigo-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Overage Rate</p>
              <p className="text-2xl font-bold text-indigo-700">
                ${getSetting('ai_overage_rate')}
              </p>
              <p className="text-xs text-gray-500">per request</p>
            </div>
          </div>

          <button
            onClick={() => {
              const aiUsage = getAIPricing();
              if (aiUsage) setEditUsageModal(aiUsage);
            }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            <Edit2 className="w-4 h-4" />
            Edit AI Pricing
          </button>
        </div>
      </div>

      {/* Storage Pricing */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <HardDrive className="w-6 h-6 text-green-600" />
          <h2 className="text-xl font-semibold">Storage Pricing</h2>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Included Storage</p>
              <p className="text-2xl font-bold text-green-700">
                {getSetting('storage_included_gb')} GB
              </p>
              <p className="text-xs text-gray-500">per user</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Overage Rate</p>
              <p className="text-2xl font-bold text-green-700">
                ${getSetting('storage_overage_rate')}
              </p>
              <p className="text-xs text-gray-500">per GB</p>
            </div>
          </div>

          <button
            onClick={() => {
              const storageUsage = getStoragePricing();
              if (storageUsage) setEditUsageModal(storageUsage);
            }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            <Edit2 className="w-4 h-4" />
            Edit Storage Pricing
          </button>
        </div>
      </div>

      {/* Billing Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-6 h-6 text-gray-600" />
          <h2 className="text-xl font-semibold">Billing Settings</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <Calendar className="w-5 h-5 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">Free Trial Period</p>
            <p className="text-xl font-bold">{getSetting('trial_period_days')} days</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <TrendingUp className="w-5 h-5 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">Annual Discount</p>
            <p className="text-xl font-bold">{getSetting('annual_discount_percent')}%</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <Calendar className="w-5 h-5 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">Grace Period</p>
            <p className="text-xl font-bold">{getSetting('grace_period_days')} days</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <Settings className="w-5 h-5 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">Auto-Suspend</p>
            <p className="text-xl font-bold">{getSetting('auto_suspend_on_failure') === 'true' ? 'Enabled' : 'Disabled'}</p>
          </div>
        </div>

        <button
          onClick={() => setEditSettingsModal(true)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
        >
          <Edit2 className="w-4 h-4" />
          Edit Settings
        </button>
      </div>

      {/* Organization Overrides */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl font-semibold">Organization Overrides</h2>
            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-sm rounded-full">
              {overrides.length}
            </span>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded hover:bg-orange-100">
            <Plus className="w-4 h-4" />
            Add Override
          </button>
        </div>

        {overrides.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No custom pricing overrides</p>
            <p className="text-sm">Add overrides for specific organizations</p>
          </div>
        ) : (
          <div className="space-y-2">
            {overrides.map((override) => (
              <div key={override.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex-1">
                  <p className="font-medium">{override.organizationName}</p>
                  <div className="flex gap-4 mt-1 text-sm text-gray-600">
                    {override.customMonthlyRate && <span>Monthly: ${override.customMonthlyRate}</span>}
                    {override.customSmsRate && <span>SMS: ${override.customSmsRate}</span>}
                    {override.customAiRate && <span>AI: ${override.customAiRate}</span>}
                  </div>
                </div>
                <button
                  onClick={() => setEditOverrideModal(override)}
                  className="px-3 py-1 text-orange-700 hover:bg-orange-50 rounded"
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals will be added next */}
    </div>
  );
}

