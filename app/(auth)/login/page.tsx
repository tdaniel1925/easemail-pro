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
  ArrowRight,
  Sparkles,
  Shield,
  Users
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

      if (error) {
        console.error('Login error:', error);
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials and try again. If you just received your temporary password, make sure you copied it exactly as shown in the email (no extra spaces).');
        }
        throw error;
      }

      if (data.user) {
        setSuccess('Login successful! Redirecting...');

        const response = await fetch(`/api/user/${data.user.id}`);
        if (response.ok) {
          const userData = await response.json();

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
      <div className="hidden lg:flex lg:w-1/2 relative p-6 xl:p-8 flex-col justify-between bg-primary overflow-hidden">
        {/* Decorative subtle pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Logo/Brand */}
          <div className="flex items-center gap-2.5 mb-6 animate-in fade-in slide-in-from-bottom duration-700">
            <div className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <span className="text-2xl font-bold text-white drop-shadow-lg">EaseMail</span>
          </div>

          {/* Main Headline */}
          <div className="space-y-3 mb-6 animate-in fade-in slide-in-from-bottom duration-700 delay-150">
            <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight drop-shadow-lg">
              Take Back Your Time
            </h1>
            <p className="text-base xl:text-lg text-white/95 leading-relaxed font-medium">
              Join 10,000+ professionals who save 5+ hours every week with AI-powered email management.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="space-y-2.5 mb-6 animate-in fade-in slide-in-from-bottom duration-700 delay-300">
            <div className="flex items-start gap-3 text-white bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
              <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base mb-0.5">5+ Hours Saved Weekly</h3>
                <p className="text-white/90 text-xs leading-relaxed">AI handles routine emails so you can focus on what matters</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-white bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
              <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base mb-0.5">10x Faster Responses</h3>
                <p className="text-white/90 text-xs leading-relaxed">Write professional emails in seconds with intelligent AI</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-white bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
              <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base mb-0.5">Never Miss Important Emails</h3>
                <p className="text-white/90 text-xs leading-relaxed">Intelligent prioritization surfaces what needs attention</p>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 animate-in fade-in slide-in-from-bottom duration-700 delay-500">
            <p className="text-white text-sm leading-relaxed mb-2">
              <span className="font-bold text-base">"The average professional spends 28% of their workday on email."</span>
            </p>
            <p className="text-white/90 text-xs leading-relaxed">
              That's 11+ hours per week. EaseMail cuts that in half with AI-powered assistance.
            </p>
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="relative z-10 space-y-3 animate-in fade-in duration-700 delay-700">
          <div className="flex items-center gap-6 text-white">
            <div className="text-center">
              <div className="text-2xl font-bold mb-0.5">5+ hrs</div>
              <div className="text-xs text-white/80 font-medium">Saved Per Week</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold mb-0.5">10x</div>
              <div className="text-xs text-white/80 font-medium">Faster Writing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold mb-0.5">99.9%</div>
              <div className="text-xs text-white/80 font-medium">Uptime SLA</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-white/95">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center text-xs font-bold shadow-lg">
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <p className="text-xs font-medium">
              Trusted by busy professionals worldwide
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 bg-background overflow-hidden">
        <div className="w-full max-w-md space-y-3 my-auto">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-2.5 mb-3 animate-in fade-in duration-500">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg">
              <Mail className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">EaseMail</span>
          </div>

          {/* Form Header */}
          <div className="text-center space-y-1 animate-in fade-in slide-in-from-bottom duration-700">
            <h2 className="text-xl xl:text-2xl font-bold">
              {showForgotPassword ? 'Reset Password' : 'Welcome Back'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {showForgotPassword
                ? 'Enter your email to receive a password reset link'
                : 'Sign in to your EaseMail account to continue'
              }
            </p>
          </div>

          {/* Form Card */}
          <Card className="p-5 shadow-xl border-border/50 animate-in fade-in slide-in-from-bottom duration-700 delay-150">
            {showForgotPassword ? (
              // Forgot Password Form
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="reset-email" className="text-xs font-medium">Email Address</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    disabled={resetLoading}
                    className="h-9 text-sm"
                  />
                </div>

                {error && (
                  <div className="p-2.5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-2.5 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {success}
                  </div>
                )}

                <div className="flex gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-9 text-sm"
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
                  <Button type="submit" className="flex-1 h-9 text-sm" disabled={resetLoading || resetCooldown > 0}>
                    {resetLoading ? 'Sending...' : resetCooldown > 0 ? `Wait ${resetCooldown}s` : 'Send Link'}
                  </Button>
                </div>

                <p className="text-[10px] text-center text-muted-foreground">
                  Rate limited to prevent abuse (1 request per minute)
                </p>
              </form>
            ) : (
              // Login Form
              <form onSubmit={handleLogin} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-medium">Password</Label>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-xs text-primary hover:underline font-medium"
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
                    className="h-9 text-sm"
                  />
                </div>

                {error && (
                  <div className="p-2.5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-2.5 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {success}
                  </div>
                )}

                <Button type="submit" className="w-full h-9 text-sm font-medium shadow-lg hover:shadow-xl transition-all" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⏳</span>
                      Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Sign In
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>
            )}
          </Card>

          {/* Sign Up Link */}
          {!showForgotPassword && (
            <p className="text-xs text-center text-muted-foreground animate-in fade-in duration-700 delay-300">
              Don't have an account?{' '}
              <Link href="/signup" className="text-primary hover:underline font-semibold">
                Sign up for free
              </Link>
            </p>
          )}

          {/* Trust Badges */}
          <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground animate-in fade-in duration-700 delay-500">
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              <span>Bank-level security</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>10K+ users</span>
            </div>
          </div>
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
        <Card className="p-8">
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
