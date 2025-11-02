'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  DollarSign, 
  Edit, 
  Save, 
  Plus, 
  Trash2, 
  TrendingUp,
  CheckCircle,
  Percent,
  MessageSquare,
  Brain,
  HardDrive
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
  freeTierAmount?: number;
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
  id?: string;
  settingKey: string;
  settingValue: string;
  dataType: string;
  description: string;
}

export default function PricingContent() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [usagePricing, setUsagePricing] = useState<UsagePricing[]>([]);
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [settings, setSettings] = useState<BillingSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Modal states
  const [editPlanModal, setEditPlanModal] = useState<PricingPlan | null>(null);
  const [editUsageModal, setEditUsageModal] = useState<UsagePricing | null>(null);
  const [editTierModal, setEditTierModal] = useState<{ tier: PricingTier | null; serviceName: string } | null>(null);
  const [addTierModal, setAddTierModal] = useState<{ usagePricingId: string; serviceName: string } | null>(null);

  // Form states
  const [planForm, setPlanForm] = useState({
    displayName: '',
    description: '',
    basePriceMonthly: '',
    basePriceAnnual: '',
    minSeats: 1,
    maxSeats: null as number | null,
    isActive: true,
  });

  const [usageForm, setUsageForm] = useState({
    baseRate: '',
    description: '',
    isActive: true,
  });

  const [tierForm, setTierForm] = useState({
    tierName: '',
    minQuantity: 0,
    maxQuantity: null as number | null,
    ratePerUnit: '',
  });

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [plansRes, usageRes, tiersRes, settingsRes] = await Promise.all([
        fetch('/api/admin/pricing/plans'),
        fetch('/api/admin/pricing/usage'),
        fetch('/api/admin/pricing/tiers'),
        fetch('/api/admin/pricing/settings'),
      ]);

      const plansData = await plansRes.json();
      const usageData = await usageRes.json();
      const tiersData = await tiersRes.json();
      const settingsData = await settingsRes.json();

      if (plansData.success) setPlans(plansData.plans || []);
      if (usageData.success) setUsagePricing(usageData.usage || []);
      if (tiersData.success) setTiers(tiersData.tiers || []);
      if (settingsData.success) setSettings(settingsData.settings || []);
    } catch (error) {
      console.error('Failed to fetch pricing data:', error);
      showMessage('error', 'Failed to load pricing data');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // PLAN MANAGEMENT
  // ============================================================================

  const handleOpenEditPlan = (plan: PricingPlan) => {
    setEditPlanModal(plan);
    setPlanForm({
      displayName: plan.displayName,
      description: plan.description || '',
      basePriceMonthly: plan.basePriceMonthly,
      basePriceAnnual: plan.basePriceAnnual,
      minSeats: plan.minSeats,
      maxSeats: plan.maxSeats,
      isActive: plan.isActive,
    });
  };

  const handleSavePlan = async () => {
    if (!editPlanModal) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/pricing/plans/${editPlanModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planForm),
      });

      if (response.ok) {
        await fetchAllData();
        setEditPlanModal(null);
        showMessage('success', 'Plan updated successfully');
      } else {
        const data = await response.json();
        showMessage('error', data.error || 'Failed to update plan');
      }
    } catch (error) {
      console.error('Error updating plan:', error);
      showMessage('error', 'Failed to update plan');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // USAGE PRICING MANAGEMENT
  // ============================================================================

  const handleOpenEditUsage = (usage: UsagePricing) => {
    setEditUsageModal(usage);
    setUsageForm({
      baseRate: usage.baseRate,
      description: usage.description || '',
      isActive: usage.isActive,
    });
  };

  const handleSaveUsage = async () => {
    if (!editUsageModal) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/pricing/usage/${editUsageModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usageForm),
      });

      if (response.ok) {
        await fetchAllData();
        setEditUsageModal(null);
        showMessage('success', 'Usage pricing updated successfully');
      } else {
        const data = await response.json();
        showMessage('error', data.error || 'Failed to update usage pricing');
      }
    } catch (error) {
      console.error('Error updating usage pricing:', error);
      showMessage('error', 'Failed to update usage pricing');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // TIER MANAGEMENT
  // ============================================================================

  const handleOpenAddTier = (usagePricingId: string, serviceName: string) => {
    setAddTierModal({ usagePricingId, serviceName });
    setTierForm({
      tierName: '',
      minQuantity: 0,
      maxQuantity: null,
      ratePerUnit: '',
    });
  };

  const handleOpenEditTier = (tier: PricingTier, serviceName: string) => {
    setEditTierModal({ tier, serviceName });
    setTierForm({
      tierName: tier.tierName,
      minQuantity: tier.minQuantity,
      maxQuantity: tier.maxQuantity,
      ratePerUnit: tier.ratePerUnit,
    });
  };

  const handleSaveTier = async (isNew: boolean) => {
    setSaving(true);
    try {
      const url = isNew 
        ? '/api/admin/pricing/tiers'
        : `/api/admin/pricing/tiers/${editTierModal?.tier?.id}`;
      
      const method = isNew ? 'POST' : 'PATCH';
      
      const body = isNew 
        ? { ...tierForm, usagePricingId: addTierModal?.usagePricingId }
        : tierForm;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await fetchAllData();
        setAddTierModal(null);
        setEditTierModal(null);
        showMessage('success', `Tier ${isNew ? 'created' : 'updated'} successfully`);
      } else {
        const data = await response.json();
        showMessage('error', data.error || `Failed to ${isNew ? 'create' : 'update'} tier`);
      }
    } catch (error) {
      console.error('Error saving tier:', error);
      showMessage('error', `Failed to ${isNew ? 'create' : 'update'} tier`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTier = async (tierId: string) => {
    if (!confirm('Are you sure you want to delete this tier?')) return;

    try {
      const response = await fetch(`/api/admin/pricing/tiers/${tierId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchAllData();
        showMessage('success', 'Tier deleted successfully');
      } else {
        const data = await response.json();
        showMessage('error', data.error || 'Failed to delete tier');
      }
    } catch (error) {
      console.error('Error deleting tier:', error);
      showMessage('error', 'Failed to delete tier');
    }
  };

  // ============================================================================
  // SETTINGS MANAGEMENT
  // ============================================================================

  const handleUpdateSetting = async (key: string, value: string) => {
    try {
      const response = await fetch('/api/admin/pricing/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settingKey: key, settingValue: value }),
      });

      if (response.ok) {
        await fetchAllData();
        showMessage('success', 'Setting updated successfully');
      } else {
        const data = await response.json();
        showMessage('error', data.error || 'Failed to update setting');
      }
    } catch (error) {
      console.error('Error updating setting:', error);
      showMessage('error', 'Failed to update setting');
    }
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const getServiceIcon = (serviceType: string) => {
    switch (serviceType.toLowerCase()) {
      case 'sms':
        return MessageSquare;
      case 'ai':
        return Brain;
      case 'storage':
        return HardDrive;
      default:
        return DollarSign;
    }
  };

  const getTiersForService = (usagePricingId: string) => {
    return tiers.filter(t => t.usagePricingId === usagePricingId);
  };

  const calculateMarkup = (cost: number, price: number) => {
    if (cost === 0) return 0;
    return ((price - cost) / cost * 100).toFixed(2);
  };

  // Base costs (approximate provider costs)
  const baseCosts: Record<string, number> = {
    sms: 0.01, // Twilio costs ~$0.01/SMS
    ai: 0.0005, // OpenAI costs ~$0.0005/request
    storage: 0.03, // Cloud storage ~$0.03/GB
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pricing Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage subscription plans, usage pricing, markups, and billing settings
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

        <Tabs defaultValue="plans" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
            <TabsTrigger value="usage">Usage Pricing</TabsTrigger>
            <TabsTrigger value="tiers">Volume Tiers</TabsTrigger>
            <TabsTrigger value="settings">Billing Settings</TabsTrigger>
          </TabsList>

          {/* ================================================================ */}
          {/* TAB 1: SUBSCRIPTION PLANS */}
          {/* ================================================================ */}
          <TabsContent value="plans" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Subscription Plans</CardTitle>
                <CardDescription>
                  Base pricing for individual and team subscriptions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading plans...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {plans.map((plan) => (
                      <div
                        key={plan.id}
                        className={`border rounded-lg p-6 ${
                          plan.isActive ? 'border-primary' : 'border-border opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-bold">{plan.displayName}</h3>
                            {!plan.isActive && (
                              <span className="text-xs text-muted-foreground">Inactive</span>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEditPlan(plan)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {plan.description}
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold">${plan.basePriceMonthly}</span>
                            <span className="text-sm text-muted-foreground">/month</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            or ${plan.basePriceAnnual}/year
                          </div>
                          <div className="pt-4 border-t space-y-1">
                            <p className="text-sm">
                              <span className="font-medium">Seats:</span> {plan.minSeats} -{' '}
                              {plan.maxSeats || '∞'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================================================================ */}
          {/* TAB 2: USAGE PRICING */}
          {/* ================================================================ */}
          <TabsContent value="usage" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Usage-Based Pricing</CardTitle>
                <CardDescription>
                  Per-use pricing for SMS, AI, and storage with markup controls
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : (
                  <div className="space-y-4">
                    {usagePricing.map((usage) => {
                      const ServiceIcon = getServiceIcon(usage.serviceType);
                      const baseCost = baseCosts[usage.serviceType.toLowerCase()] || 0;
                      const markup = calculateMarkup(baseCost, parseFloat(usage.baseRate));

                      return (
                        <div
                          key={usage.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <ServiceIcon className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <h4 className="font-medium capitalize">{usage.serviceType}</h4>
                                {!usage.isActive && (
                                  <span className="text-xs text-muted-foreground">Inactive</span>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground ml-13">
                              {usage.description}
                            </p>
                            <div className="mt-2 ml-13 flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Cost: ${baseCost.toFixed(4)}</span>
                              <span className="text-green-600 font-medium flex items-center gap-1">
                                <Percent className="h-3 w-3" />
                                Markup: {markup}%
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold">${usage.baseRate}</div>
                            <div className="text-xs text-muted-foreground">per {usage.unit}</div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2"
                              onClick={() => handleOpenEditUsage(usage)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit Price
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================================================================ */}
          {/* TAB 3: VOLUME TIERS */}
          {/* ================================================================ */}
          <TabsContent value="tiers" className="space-y-4 mt-6">
            {usagePricing.map((usage) => {
              const serviceTiers = getTiersForService(usage.id);
              const ServiceIcon = getServiceIcon(usage.serviceType);

              return (
                <Card key={usage.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ServiceIcon className="h-5 w-5 text-primary" />
                        <div>
                          <CardTitle className="capitalize">{usage.serviceType} Volume Tiers</CardTitle>
                          <CardDescription>
                            Discounted rates based on usage volume
                          </CardDescription>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleOpenAddTier(usage.id, usage.serviceType)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Tier
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {serviceTiers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No volume tiers configured
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {serviceTiers.map((tier) => (
                          <div
                            key={tier.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="font-medium">{tier.tierName}</div>
                              <div className="text-sm text-muted-foreground">
                                {tier.minQuantity.toLocaleString()} -{' '}
                                {tier.maxQuantity ? tier.maxQuantity.toLocaleString() : '∞'}{' '}
                                {usage.unit}s
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="font-bold">${tier.ratePerUnit}</div>
                                <div className="text-xs text-muted-foreground">
                                  per {usage.unit}
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenEditTier(tier, usage.serviceType)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteTier(tier.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* ================================================================ */}
          {/* TAB 4: BILLING SETTINGS */}
          {/* ================================================================ */}
          <TabsContent value="settings" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Global Billing Settings</CardTitle>
                <CardDescription>
                  Configure defaults for trials, discounts, and grace periods
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : (
                  <div className="space-y-6">
                    {settings.map((setting) => (
                      <div key={setting.settingKey} className="flex items-start justify-between">
                        <div className="flex-1">
                          <Label className="text-base">{setting.description}</Label>
                          <div className="text-xs text-muted-foreground mt-1">
                            Key: {setting.settingKey}
                          </div>
                        </div>
                        <div className="w-32">
                          {setting.dataType === 'boolean' ? (
                            <Switch
                              checked={setting.settingValue === 'true'}
                              onCheckedChange={(checked) =>
                                handleUpdateSetting(setting.settingKey, checked.toString())
                              }
                            />
                          ) : (
                            <Input
                              type={setting.dataType === 'number' ? 'number' : 'text'}
                              value={setting.settingValue}
                              onChange={(e) =>
                                handleUpdateSetting(setting.settingKey, e.target.value)
                              }
                              onBlur={() => fetchAllData()}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ================================================================ */}
      {/* MODALS */}
      {/* ================================================================ */}

      {/* Edit Plan Modal */}
      <Dialog open={!!editPlanModal} onOpenChange={() => setEditPlanModal(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit {editPlanModal?.displayName}</DialogTitle>
            <DialogDescription>Update subscription plan pricing and details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                value={planForm.displayName}
                onChange={(e) => setPlanForm({ ...planForm, displayName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={planForm.description}
                onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monthly Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={planForm.basePriceMonthly}
                  onChange={(e) =>
                    setPlanForm({ ...planForm, basePriceMonthly: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Annual Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={planForm.basePriceAnnual}
                  onChange={(e) =>
                    setPlanForm({ ...planForm, basePriceAnnual: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Seats</Label>
                <Input
                  type="number"
                  value={planForm.minSeats}
                  onChange={(e) =>
                    setPlanForm({ ...planForm, minSeats: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Max Seats (blank = unlimited)</Label>
                <Input
                  type="number"
                  value={planForm.maxSeats || ''}
                  onChange={(e) =>
                    setPlanForm({
                      ...planForm,
                      maxSeats: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={planForm.isActive}
                onCheckedChange={(checked) => setPlanForm({ ...planForm, isActive: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPlanModal(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSavePlan} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Usage Modal */}
      <Dialog open={!!editUsageModal} onOpenChange={() => setEditUsageModal(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="capitalize">Edit {editUsageModal?.serviceType} Pricing</DialogTitle>
            <DialogDescription>Update base rate and markup</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Base Rate per {editUsageModal?.unit} ($)</Label>
              <Input
                type="number"
                step="0.0001"
                value={usageForm.baseRate}
                onChange={(e) => setUsageForm({ ...usageForm, baseRate: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                This is what customers will be charged. Set markup above provider cost.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={usageForm.description}
                onChange={(e) => setUsageForm({ ...usageForm, description: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={usageForm.isActive}
                onCheckedChange={(checked) => setUsageForm({ ...usageForm, isActive: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUsageModal(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveUsage} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Tier Modal */}
      <Dialog
        open={!!addTierModal || !!editTierModal}
        onOpenChange={() => {
          setAddTierModal(null);
          setEditTierModal(null);
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {addTierModal ? 'Add' : 'Edit'} {addTierModal?.serviceName || editTierModal?.serviceName}{' '}
              Tier
            </DialogTitle>
            <DialogDescription>Configure volume-based pricing tier</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tier Name</Label>
              <Input
                placeholder="e.g., High Volume"
                value={tierForm.tierName}
                onChange={(e) => setTierForm({ ...tierForm, tierName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Quantity</Label>
                <Input
                  type="number"
                  value={tierForm.minQuantity}
                  onChange={(e) =>
                    setTierForm({ ...tierForm, minQuantity: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Max Quantity (blank = unlimited)</Label>
                <Input
                  type="number"
                  value={tierForm.maxQuantity || ''}
                  onChange={(e) =>
                    setTierForm({
                      ...tierForm,
                      maxQuantity: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rate per Unit ($)</Label>
              <Input
                type="number"
                step="0.0001"
                value={tierForm.ratePerUnit}
                onChange={(e) => setTierForm({ ...tierForm, ratePerUnit: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddTierModal(null);
                setEditTierModal(null);
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={() => handleSaveTier(!!addTierModal)} disabled={saving}>
              {saving ? 'Saving...' : addTierModal ? 'Create Tier' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
