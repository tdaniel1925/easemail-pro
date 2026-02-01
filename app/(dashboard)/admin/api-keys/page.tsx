'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Key, Eye, EyeOff, Save, CheckCircle, Ban, X } from 'lucide-react';
import Link from 'next/link';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  description: string;
  required: boolean;
  masked?: boolean;
}

const API_KEYS_CONFIG = [
  {
    id: 'TWILIO_ACCOUNT_SID',
    name: 'Twilio Account SID',
    description: 'Your Twilio Account SID for SMS functionality',
    required: true,
  },
  {
    id: 'TWILIO_AUTH_TOKEN',
    name: 'Twilio Auth Token',
    description: 'Your Twilio authentication token',
    required: true,
  },
  {
    id: 'TWILIO_PHONE_NUMBER',
    name: 'Twilio Phone Number',
    description: 'Your Twilio phone number (E.164 format)',
    required: true,
  },
  {
    id: 'RESEND_API_KEY',
    name: 'Resend API Key',
    description: 'API key for sending emails via Resend',
    required: true,
  },
  {
    id: 'NYLAS_API_KEY',
    name: 'Nylas API Key',
    description: 'API key for Nylas email integration',
    required: true,
  },
  {
    id: 'NYLAS_CLIENT_ID',
    name: 'Nylas Client ID',
    description: 'Your Nylas OAuth client ID',
    required: true,
  },
  {
    id: 'NYLAS_CLIENT_SECRET',
    name: 'Nylas Client Secret',
    description: 'Your Nylas OAuth client secret',
    required: true,
  },
  {
    id: 'OPENAI_API_KEY',
    name: 'OpenAI API Key',
    description: 'API key for AI-powered features (optional)',
    required: false,
  },
];

export default function ApiKeysManagement() {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/admin/api-keys');
      const data = await response.json();

      if (data.success) {
        // Backend now returns masked keys in data.data.keys format
        setApiKeys(data.data?.keys || data.keys || {});
      } else {
        showToast('error', data.error || 'Failed to load API keys');
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
      showToast('error', 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKeys = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: apiKeys }),
      });

      const data = await response.json();

      if (data.success) {
        const message = data.message || 'API keys saved successfully';
        showToast('success', message);
        // Refresh keys to get masked versions
        await fetchApiKeys();
      } else {
        showToast('error', data.error || 'Failed to save API keys');
      }
    } catch (error) {
      console.error('Failed to save API keys:', error);
      showToast('error', 'Failed to save API keys');
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = (keyId: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const maskKey = (key: string) => {
    if (!key || key.length < 8) return key;
    return key.substring(0, 4) + '•'.repeat(key.length - 8) + key.substring(key.length - 4);
  };

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">API Keys Management</h1>
          <p className="text-muted-foreground mt-2">
            Configure API keys for third-party services
          </p>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div className={`mb-6 p-4 rounded-lg border flex items-start gap-3 animate-in slide-in-from-top-2 ${
            toast.type === 'success' ? 'bg-primary/10 border-primary text-primary' :
            'bg-destructive/10 border-destructive text-destructive'
          }`}>
            <div className="flex-shrink-0 mt-0.5">
              {toast.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <Ban className="h-5 w-5" />}
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

        {/* Warning Banner */}
        <div className="bg-muted border border-border p-4 rounded-lg mb-6">
          <div className="flex items-start gap-3">
            <Key className="h-5 w-5 flex-shrink-0 mt-0.5 text-primary" />
            <div>
              <p className="font-semibold mb-1 text-foreground">Security Notice</p>
              <p className="text-sm text-muted-foreground">
                API keys are masked for security. Keys are stored encrypted in the database and only visible when you enter or update them. All access is logged for audit purposes.
              </p>
            </div>
          </div>
        </div>

        {/* API Keys Form */}
        <Card>
          <CardHeader>
            <CardTitle>System API Keys</CardTitle>
            <CardDescription>
              Configure the API keys required for various integrations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
              <div className="space-y-6">
                {API_KEYS_CONFIG.map((config) => (
                  <div key={config.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={config.id} className="flex items-center gap-2">
                        {config.name}
                        {config.required && (
                          <span className="text-xs text-destructive">*</span>
                        )}
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleVisibility(config.id)}
                        className="h-8 w-8 p-0"
                      >
                        {visibleKeys.has(config.id) ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <Input
                      id={config.id}
                      type={visibleKeys.has(config.id) ? 'text' : 'password'}
                      value={apiKeys[config.id] || ''}
                      onChange={(e) =>
                        setApiKeys({ ...apiKeys, [config.id]: e.target.value })
                      }
                      placeholder={`Enter ${config.name.toLowerCase()}`}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                  </div>
                ))}

                <div className="pt-6 border-t flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      fetchApiKeys();
                      showToast('success', 'Changes discarded');
                    }}
                  >
                    Discard Changes
                  </Button>
                  <Button onClick={handleSaveKeys} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save API Keys'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">How to Get API Keys</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">🔹 Twilio (SMS)</h3>
              <p className="text-sm text-muted-foreground">
                Sign up at <a href="https://www.twilio.com/try-twilio" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">twilio.com</a> and get your Account SID, Auth Token, and phone number from the console.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">🔹 Resend (Email)</h3>
              <p className="text-sm text-muted-foreground">
                Sign up at <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">resend.com</a> and create an API key in your dashboard.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">🔹 Nylas (Email Integration)</h3>
              <p className="text-sm text-muted-foreground">
                Sign up at <a href="https://www.nylas.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">nylas.com</a> and get your API key and OAuth credentials from the developer dashboard.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">🔹 OpenAI (AI Features - Optional)</h3>
              <p className="text-sm text-muted-foreground">
                Sign up at <a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">platform.openai.com</a> and create an API key in your account settings.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

