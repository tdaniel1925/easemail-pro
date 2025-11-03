'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { 
  Mail, 
  Clock, 
  TrendingUp, 
  Zap,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Check for verification success or errors from URL params
  useEffect(() => {
    const verified = searchParams.get('verified');
    const urlError = searchParams.get('error');

    if (verified === 'true') {
      setSuccess('✅ Email verified successfully! You can now log in.');
    } else if (urlError) {
      setError(decodeURIComponent(urlError));
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        setSuccess('Login successful! Redirecting...');
        
        // Check if user needs to change password
        const response = await fetch(`/api/user/${data.user.id}`);
        if (response.ok) {
          const userData = await response.json();
          
          // Update last login time
          await fetch(`/api/user/${data.user.id}/last-login`, {
            method: 'POST',
          });
          
          if (userData.requirePasswordChange) {
            setTimeout(() => router.push('/change-password'), 1000);
            return;
          }
        }
        
        setTimeout(() => router.push('/inbox'), 1000);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
      setSuccess('');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (resetCooldown > 0) {
      setError(`Please wait ${resetCooldown} seconds before requesting another reset email.`);
      return;
    }
    
    setResetLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      setSuccess('Password reset link sent! Check your email (and spam folder).');
      
      // Start 60 second cooldown
      setResetCooldown(60);
      const cooldownInterval = setInterval(() => {
        setResetCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(cooldownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetEmail('');
        setSuccess('');
      }, 5000);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to send reset email');
    } finally {
      setResetLoading(false);
    }
  };

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
          <div className="space-y-4 mb-8">
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
              Take Back Your Time
            </h1>
            <p className="text-lg xl:text-xl text-white/90 leading-relaxed">
              Business professionals save 5+ hours every week with AI-powered email management. Stop drowning in your inbox.
            </p>
          </div>

          {/* Time-Saving Stats */}
          <div className="space-y-3 mb-8">
            <div className="flex items-start gap-3 text-white">
              <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-base">5+ Hours Saved Weekly</h3>
                <p className="text-white/80 text-sm">AI handles routine emails so you can focus on what matters</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-white">
              <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-base">10x Faster Responses</h3>
                <p className="text-white/80 text-sm">Write emails in seconds with intelligent AI assistance</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-white">
              <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Inbox Zero Achievement</h3>
                <p className="text-white/80 text-sm">Smart automation and organization keep your inbox clean</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-white">
              <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Never Miss Important Emails</h3>
                <p className="text-white/80 text-sm">Intelligent prioritization surfaces what needs attention</p>
              </div>
            </div>
          </div>

          {/* Value Proposition */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <p className="text-white text-base leading-relaxed">
              <span className="font-semibold">"The average professional spends 28% of their workday on email."</span>
              <br />
              <span className="text-white/80 text-sm mt-2 block">
                That's 11+ hours per week. EaseMail cuts that in half with AI-powered assistance, smart automation, and unified account management.
              </span>
            </p>
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-6 text-white">
            <div>
              <div className="text-2xl font-bold">5+ hrs</div>
              <div className="text-xs text-white/80">Saved Per Week</div>
            </div>
            <div>
              <div className="text-2xl font-bold">10x</div>
              <div className="text-xs text-white/80">Faster Writing</div>
            </div>
            <div>
              <div className="text-2xl font-bold">99.9%</div>
              <div className="text-xs text-white/80">Uptime SLA</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-white/90">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-7 h-7 rounded-full bg-white/30 border-2 border-primary flex items-center justify-center text-xs font-semibold">
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <p className="text-xs">
              Trusted by busy professionals worldwide
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
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
              {showForgotPassword ? 'Reset Password' : 'Welcome Back'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {showForgotPassword 
                ? 'Enter your email to receive a password reset link'
                : 'Sign in to your EaseMail account'
              }
            </p>
          </div>

          {/* Form Card */}
          <Card className="p-5 shadow-lg">
            {showForgotPassword ? (
              // Forgot Password Form
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reset-email" className="text-sm">Email *</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    disabled={resetLoading}
                    className="h-9"
                  />
                </div>

                {error && (
                  <div className="p-2.5 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-2.5 text-xs text-green-600 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {success}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmail('');
                      setError('');
                      setSuccess('');
                    }}
                    disabled={resetLoading}
                  >
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={resetLoading || resetCooldown > 0}>
                    {resetLoading ? 'Sending...' : resetCooldown > 0 ? `Wait ${resetCooldown}s` : 'Send Link'}
                  </Button>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  Rate limited to prevent abuse (1 request per minute)
                </p>
              </form>
            ) : (
              // Login Form
              <form onSubmit={handleLogin} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm">Password *</Label>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-9"
                  />
                </div>

                {error && (
                  <div className="p-2.5 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-2.5 text-xs text-green-600 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {success}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </form>
            )}
          </Card>

          {/* Sign Up Link */}
          {!showForgotPassword && (
            <p className="text-sm text-center text-muted-foreground">
              Don't have an account?{' '}
              <Link href="/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Wrap in Suspense for useSearchParams
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <Card className="p-6">
          <div className="text-center">
            <div className="text-lg font-semibold">Loading...</div>
          </div>
        </Card>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
