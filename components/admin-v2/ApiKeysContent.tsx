'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Key, Eye, EyeOff, Save } from 'lucide-react';
import InlineMessage from '@/components/ui/inline-message';

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

export default function ApiKeysContent() {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/admin/api-keys');
      const data = await response.json();
      
      if (data.success) {
        setApiKeys(data.keys);
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
      showMessage('error', 'Failed to load API keys');
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
        showMessage('success', 'API keys saved successfully');
      } else {
        showMessage('error', data.error || 'Failed to save API keys');
      }
    } catch (error) {
      console.error('Failed to save API keys:', error);
      showMessage('error', 'Failed to save API keys');
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = (keyId: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(keyId)) {
        next.delete(keyId);
      } else {
        next.add(keyId);
      }
      return next;
    });
  };

  const maskKey = (key: string) => {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return `${key.slice(0, 4)}${'•'.repeat(key.length - 8)}${key.slice(-4)}`;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">API Keys Management</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure external service API keys and credentials
            </p>
          </div>
          <Button onClick={handleSaveKeys} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
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

        <Card>
          <CardHeader>
            <CardTitle>Service Credentials</CardTitle>
            <CardDescription>
              Enter API keys and credentials for external services. These are stored securely.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading API keys...</div>
            ) : (
              <div className="space-y-6">
                {API_KEYS_CONFIG.map((config) => (
                  <div key={config.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={config.id} className="flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        {config.name}
                        {config.required && (
                          <span className="text-xs text-red-500">*</span>
                        )}
                      </Label>
                      <button
                        type="button"
                        onClick={() => toggleVisibility(config.id)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {visibleKeys.has(config.id) ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <Input
                      id={config.id}
                      type={visibleKeys.has(config.id) ? 'text' : 'password'}
                      value={visibleKeys.has(config.id) 
                        ? apiKeys[config.id] || '' 
                        : maskKey(apiKeys[config.id] || '')}
                      onChange={(e) => {
                        // Only update when visible
                        if (visibleKeys.has(config.id)) {
                          setApiKeys({ ...apiKeys, [config.id]: e.target.value });
                        }
                      }}
                      placeholder={config.required ? 'Required' : 'Optional'}
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Security Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• API keys are encrypted before storage</p>
              <p>• Only platform administrators can view and modify these keys</p>
              <p>• Changes take effect immediately across the platform</p>
              <p>• Make sure to click "Save Changes" after updating any keys</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

