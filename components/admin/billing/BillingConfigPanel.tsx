'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Play,
  Save,
  RefreshCw,
  DollarSign,
  Clock,
  Bell,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useConfirm } from '@/components/ui/confirm-dialog';
import BillingRunHistory from './BillingRunHistory';
import PendingChargesPreview from './PendingChargesPreview';

export default function BillingConfigPanel() {
  const { confirm, Dialog } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [config, setConfig] = useState({
    enabled: false,
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly',
    dayOfWeek: 1,
    dayOfMonth: 1,
    hourOfDay: 2,
    autoRetry: true,
    maxRetries: 3,
    retryDelayHours: 24,
    notifyOnSuccess: false,
    notifyOnFailure: true,
    notificationEmail: '',
    smsChargeThresholdUsd: 1.00,
    aiChargeThresholdUsd: 5.00,
    minimumChargeUsd: 0.50,
    gracePeriodDays: 3,
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/billing/config');
      const data = await response.json();

      if (data.success) {
        setConfig(data.config);
      }
    } catch (error) {
      console.error('Failed to fetch billing config:', error);
      setMessage({ type: 'error', text: 'Failed to load configuration' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const response = await fetch('/api/admin/billing/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Configuration saved successfully' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save configuration' });
      }
    } catch (error) {
      console.error('Failed to save billing config:', error);
      setMessage({ type: 'error', text: 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const handleRunBilling = async () => {
    const confirmed = await confirm({
      title: 'Run Billing Process',
      message: 'Are you sure you want to run the billing process now? This will charge all accounts with pending usage.',
      variant: 'danger',
    });

    if (!confirmed) {
      return;
    }

    try {
      setProcessing(true);
      setMessage(null);

      const response = await fetch('/api/admin/billing/process', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: `Billing completed: ${data.result.chargesSuccessful} successful, ${data.result.chargesFailed} failed`
        });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to process billing' });
      }
    } catch (error) {
      console.error('Failed to run billing:', error);
      setMessage({ type: 'error', text: 'Failed to process billing' });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 w-full h-full overflow-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing Configuration</h1>
          <p className="text-muted-foreground mt-2">
            Configure automated billing, payment processing, and retry logic
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunBilling}
            disabled={processing}
          >
            {processing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Run Billing Now
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <Alert className={`mb-6 ${message.type === 'success' ? 'border-green-500' : 'border-red-500'}`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Configuration Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              General Settings
            </CardTitle>
            <CardDescription>
              Enable automated billing and set the schedule
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Automated Billing</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically charge accounts on schedule
                </p>
              </div>
              <Switch
                checked={config.enabled}
                onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select
                value={config.frequency}
                onValueChange={(value: any) => setConfig({ ...config, frequency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {config.frequency === 'weekly' && (
              <div className="space-y-2">
                <Label>Day of Week</Label>
                <Select
                  value={config.dayOfWeek.toString()}
                  onValueChange={(value) => setConfig({ ...config, dayOfWeek: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sunday</SelectItem>
                    <SelectItem value="1">Monday</SelectItem>
                    <SelectItem value="2">Tuesday</SelectItem>
                    <SelectItem value="3">Wednesday</SelectItem>
                    <SelectItem value="4">Thursday</SelectItem>
                    <SelectItem value="5">Friday</SelectItem>
                    <SelectItem value="6">Saturday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {config.frequency === 'monthly' && (
              <div className="space-y-2">
                <Label>Day of Month</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={config.dayOfMonth}
                  onChange={(e) => setConfig({ ...config, dayOfMonth: parseInt(e.target.value) })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Hour of Day (UTC)</Label>
              <Input
                type="number"
                min="0"
                max="23"
                value={config.hourOfDay}
                onChange={(e) => setConfig({ ...config, hourOfDay: parseInt(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                Time in 24-hour format (0-23)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Charge Thresholds
            </CardTitle>
            <CardDescription>
              Set minimum amounts before charging
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Minimum Charge Amount</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={config.minimumChargeUsd}
                  onChange={(e) => setConfig({ ...config, minimumChargeUsd: parseFloat(e.target.value) })}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Don't charge if total is less than this amount
              </p>
            </div>

            <div className="space-y-2">
              <Label>SMS Charge Threshold</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={config.smsChargeThresholdUsd}
                  onChange={(e) => setConfig({ ...config, smsChargeThresholdUsd: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>AI Charge Threshold</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={config.aiChargeThresholdUsd}
                  onChange={(e) => setConfig({ ...config, aiChargeThresholdUsd: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Grace Period (Days)</Label>
              <Input
                type="number"
                min="0"
                max="30"
                value={config.gracePeriodDays}
                onChange={(e) => setConfig({ ...config, gracePeriodDays: parseInt(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                Days before suspending service for non-payment
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Retry Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Retry Settings
            </CardTitle>
            <CardDescription>
              Configure automatic retry for failed charges
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Auto Retry</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically retry failed charges
                </p>
              </div>
              <Switch
                checked={config.autoRetry}
                onCheckedChange={(checked) => setConfig({ ...config, autoRetry: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label>Max Retry Attempts</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={config.maxRetries}
                onChange={(e) => setConfig({ ...config, maxRetries: parseInt(e.target.value) })}
                disabled={!config.autoRetry}
              />
            </div>

            <div className="space-y-2">
              <Label>Retry Delay (Hours)</Label>
              <Input
                type="number"
                min="1"
                max="168"
                value={config.retryDelayHours}
                onChange={(e) => setConfig({ ...config, retryDelayHours: parseInt(e.target.value) })}
                disabled={!config.autoRetry}
              />
              <p className="text-xs text-muted-foreground">
                Time to wait before retrying a failed charge
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Email notifications for billing events
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Notification Email</Label>
              <Input
                type="email"
                placeholder="admin@easemail.app"
                value={config.notificationEmail}
                onChange={(e) => setConfig({ ...config, notificationEmail: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Notify on Success</Label>
                <p className="text-sm text-muted-foreground">
                  Send email when billing completes successfully
                </p>
              </div>
              <Switch
                checked={config.notifyOnSuccess}
                onCheckedChange={(checked) => setConfig({ ...config, notifyOnSuccess: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Notify on Failure</Label>
                <p className="text-sm text-muted-foreground">
                  Send email when charges fail
                </p>
              </div>
              <Switch
                checked={config.notifyOnFailure}
                onCheckedChange={(checked) => setConfig({ ...config, notifyOnFailure: checked })}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Charges Preview */}
      <div className="mb-6">
        <PendingChargesPreview />
      </div>

      {/* Billing Run History */}
      <div>
        <BillingRunHistory />
      </div>

      {/* Confirm Dialog */}
      <Dialog />
    </div>
  );
}

