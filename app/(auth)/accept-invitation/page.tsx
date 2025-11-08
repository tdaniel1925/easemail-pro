'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { 
  Mail, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff,
  Sparkles,
  Target,
  Zap,
  Users
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [userInfo, setUserInfo] = useState<{ email: string; fullName: string | null } | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Verify invitation token on mount
  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    fetch(`/api/invitations/accept?token=${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Invalid invitation');
        }
        return res.json();
      })
      .then((data) => {
        setUserInfo(data.user);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);

    try {
      // Accept invitation and set password
      const res = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to activate account');
      }

      setSuccess(true);

      // Log the user in automatically
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userInfo!.email,
        password: password,
      });

      if (signInError) {
        console.error('Auto-login failed:', signInError);
        // Still redirect to login page
        setTimeout(() => router.push('/login'), 2000);
        return;
      }

      // Success! Redirect to dashboard
      setTimeout(() => router.push('/inbox-v3'), 1500);
    } catch (err: any) {
      console.error('Activation error:', err);
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Card className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-4 h-4 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-4 h-4 bg-primary rounded-full animate-bounce"></div>
          </div>
          <p className="text-center text-muted-foreground mt-4">Verifying invitation...</p>
        </Card>
      </div>
    );
  }

  if (error && !userInfo) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md p-6">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <h2 className="text-xl font-bold">Invalid Invitation</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => router.push('/login')} variant="outline" className="w-full">
              Go to Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md p-6">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <h2 className="text-xl font-bold">Account Activated!</h2>
            <p className="text-sm text-muted-foreground">
              Your account has been activated successfully. Redirecting to your inbox...
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Left Panel - Marketing */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-8 xl:p-10 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }} />
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Logo/Brand */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <span className="text-2xl font-bold text-white">EaseMail</span>
          </div>

          {/* Main Headline */}
          <div className="space-y-3 mb-6">
            <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight">
              Welcome to Your Team
            </h1>
            <p className="text-base xl:text-lg text-white/90 leading-relaxed">
              You've been invited to join your team on EaseMail. Set your password and start collaborating with AI-powered email management.
            </p>
          </div>

          {/* Getting Started Benefits */}
          <div className="space-y-2.5 mb-6">
            <div className="flex items-start gap-2.5 text-white">
              <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm">AI-Powered Assistance</h3>
                <p className="text-white/80 text-xs leading-relaxed">Write emails 10x faster with intelligent AI that learns your style</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-white">
              <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm">Team Collaboration</h3>
                <p className="text-white/80 text-xs leading-relaxed">Shared templates, signatures, and workflows for your entire team</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-white">
              <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Target className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm">Smart Organization</h3>
                <p className="text-white/80 text-xs leading-relaxed">Intelligent threading and prioritization keeps you focused</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-white">
              <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm">Lightning Fast Setup</h3>
                <p className="text-white/80 text-xs leading-relaxed">Connect your email accounts and start working in under 2 minutes</p>
              </div>
            </div>
          </div>

          {/* Value Proposition */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <p className="text-white text-sm leading-relaxed">
              <span className="font-semibold">"EaseMail is built for teams that value efficiency."</span>
              <br />
              <span className="text-white/80 text-xs mt-1.5 block leading-relaxed">
                Unified inbox management, AI writing assistance, SMS integration, and powerful automation — all in one platform designed for modern professionals.
              </span>
            </p>
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-4 text-white">
            <div>
              <div className="text-xl font-bold">2 min</div>
              <div className="text-[10px] text-white/80">Setup Time</div>
            </div>
            <div>
              <div className="text-xl font-bold">10x</div>
              <div className="text-[10px] text-white/80">Faster Writing</div>
            </div>
            <div>
              <div className="text-xl font-bold">100%</div>
              <div className="text-[10px] text-white/80">Secure</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-white/90">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            <p className="text-[10px] leading-relaxed">
              Your data is encrypted and never shared with third parties
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Activation Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-background overflow-y-auto">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-6">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Mail className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">EaseMail</span>
          </div>

          {/* Form Header */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl xl:text-3xl font-bold">
              Welcome to EaseMail!
            </h2>
            <p className="text-sm text-muted-foreground">
              Create your password to activate your account
            </p>
          </div>

          {/* User Info Card */}
          {userInfo && (
            <Card className="p-4 bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{userInfo.fullName}</p>
                  <p className="text-xs text-muted-foreground truncate">{userInfo.email}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Form Card */}
          <Card className="p-5 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm">Create Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-9"
                    placeholder="Enter your password"
                    required
                    minLength={8}
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">At least 8 characters</p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-sm">Confirm Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10 h-9"
                    placeholder="Confirm your password"
                    required
                    minLength={8}
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-2.5 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Activating Account...
                  </>
                ) : (
                  <>
                    Activate Account
                    <CheckCircle2 className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </Card>

          {/* Security Notice */}
          <p className="text-xs text-center text-muted-foreground">
            Your password is encrypted and stored securely. We'll never ask you to share it.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <Card className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-4 h-4 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-4 h-4 bg-primary rounded-full animate-bounce"></div>
          </div>
          <p className="text-center text-muted-foreground mt-4">Loading...</p>
        </Card>
      </div>
    }>
      <AcceptInvitationContent />
    </Suspense>
  );
}

