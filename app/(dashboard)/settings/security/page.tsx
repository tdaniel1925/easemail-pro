'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Shield, CheckCircle, XCircle, Loader2, Copy, Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase/client';

export default function SecuritySettingsPage() {
  const { toast } = useToast();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [setupData, setSetupData] = useState<{
    secret: string;
    qrCode: string;
    recoveryCodes: string[];
  } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  useEffect(() => {
    fetchUserSettings();
  }, []);

  const fetchUserSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('users')
        .select('two_factor_enabled')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setTwoFactorEnabled(data?.two_factor_enabled || false);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetup2FA = async () => {
    setIsSettingUp(true);
    try {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to setup 2FA');
      }

      setSetupData(data);
      setShowSetupDialog(true);

      toast({
        title: '2FA Setup Started',
        description: 'Scan the QR code with your authenticator app',
      });
    } catch (error: any) {
      toast({
        title: 'Setup Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter a 6-digit code',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify code');
      }

      setTwoFactorEnabled(true);
      setShowSetupDialog(false);
      setVerificationCode('');
      setSetupData(null);

      toast({
        title: '2FA Enabled!',
        description: 'Your account is now protected with two-factor authentication',
      });
    } catch (error: any) {
      toast({
        title: 'Verification Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!disablePassword) {
      toast({
        title: 'Password Required',
        description: 'Please enter your password to disable 2FA',
        variant: 'destructive',
      });
      return;
    }

    setIsDisabling(true);
    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: disablePassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disable 2FA');
      }

      setTwoFactorEnabled(false);
      setShowDisableDialog(false);
      setDisablePassword('');

      toast({
        title: '2FA Disabled',
        description: 'Two-factor authentication has been disabled',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to Disable',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDisabling(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Copied to clipboard',
    });
  };

  const downloadRecoveryCodes = () => {
    if (!setupData?.recoveryCodes) return;

    const content = `EaseMail Recovery Codes
Generated: ${new Date().toLocaleString()}

SAVE THESE CODES IN A SAFE PLACE!
Each code can only be used once.

${setupData.recoveryCodes.join('\n')}
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'easemail-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Downloaded',
      description: 'Recovery codes saved to file',
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Security Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your account security and authentication
        </p>
      </div>

      {/* 2FA Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Two-Factor Authentication (2FA)</CardTitle>
              <CardDescription className="mt-2">
                Add an extra layer of security to your account
              </CardDescription>
            </div>
            {twoFactorEnabled ? (
              <Badge className="bg-green-500">
                <CheckCircle className="h-3 w-3 mr-1" />
                Enabled
              </Badge>
            ) : (
              <Badge variant="secondary">
                <XCircle className="h-3 w-3 mr-1" />
                Disabled
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {twoFactorEnabled
                ? 'Your account is protected with two-factor authentication. You\'ll need to enter a code from your authenticator app when signing in.'
                : 'Protect your account by requiring a code from your authenticator app in addition to your password.'}
            </p>

            {twoFactorEnabled ? (
              <Button
                variant="destructive"
                onClick={() => setShowDisableDialog(true)}
              >
                Disable 2FA
              </Button>
            ) : (
              <Button
                onClick={handleSetup2FA}
                disabled={isSettingUp}
                className="gap-2"
              >
                {isSettingUp ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    Enable 2FA
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Setup Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app
            </DialogDescription>
          </DialogHeader>

          {setupData && (
            <div className="space-y-6">
              {/* QR Code */}
              <div className="flex flex-col items-center gap-4">
                {setupData.qrCode && (
                  <img
                    src={setupData.qrCode}
                    alt="2FA QR Code"
                    className="w-64 h-64 border rounded-lg"
                  />
                )}
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Can't scan? Enter this code manually:
                  </p>
                  <div className="flex items-center gap-2 justify-center">
                    <code className="px-3 py-2 bg-muted rounded text-sm">
                      {setupData.secret}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(setupData.secret)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Recovery Codes */}
              <div className="border rounded-lg p-4 bg-yellow-50 dark:bg-yellow-950/20">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Recovery Codes
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Save these codes in a safe place. You can use them to access your account if you lose your authenticator app.
                </p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {setupData.recoveryCodes.map((code, idx) => (
                    <code key={idx} className="px-2 py-1 bg-background rounded text-sm">
                      {code}
                    </code>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadRecoveryCodes}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Codes
                </Button>
              </div>

              {/* Verification */}
              <div className="space-y-3">
                <Label htmlFor="code">Enter code from your app to verify</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="text-center text-lg tracking-widest"
                  />
                  <Button
                    onClick={handleVerify2FA}
                    disabled={isVerifying || verificationCode.length !== 6}
                    className="gap-2"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Disable Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter your password to disable 2FA
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-destructive">
                Warning: Disabling 2FA will make your account less secure.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDisableDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisable2FA}
                disabled={isDisabling || !disablePassword}
              >
                {isDisabling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Disabling...
                  </>
                ) : (
                  'Disable 2FA'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
