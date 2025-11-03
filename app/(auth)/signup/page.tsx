'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { 
  User, 
  Users, 
  Check, 
  Mail, 
  Sparkles, 
  Shield, 
  Zap,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SignupPage() {
  const [step, setStep] = useState<'account-type' | 'details'>('account-type');
  const [accountType, setAccountType] = useState<'individual' | 'team'>('individual');
  const [fullName, setFullName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            account_type: accountType,
            organization_name: accountType === 'team' ? organizationName : undefined,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        router.push('/inbox');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during signup');
    } finally {
      setLoading(false);
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
              Email Management,
              <br />
              Reimagined with AI
            </h1>
            <p className="text-lg xl:text-xl text-white/90 leading-relaxed">
              Join thousands of professionals who've transformed their inbox into a productivity powerhouse.
            </p>
          </div>

          {/* Feature List */}
          <div className="space-y-3">
            {[
              {
                icon: Sparkles,
                title: 'AI-Powered Writing',
                description: 'Compose emails 10x faster with intelligent AI assistance'
              },
              {
                icon: Zap,
                title: 'Smart Automation',
                description: 'Automate repetitive tasks and focus on what matters'
              },
              {
                icon: TrendingUp,
                title: 'Productivity Boost',
                description: 'Save 5+ hours per week managing your emails'
              },
              {
                icon: Shield,
                title: 'Enterprise Security',
                description: 'Bank-level encryption and SOC 2 compliant'
              }
            ].map((feature, index) => (
              <div key={index} className="flex items-start gap-3 text-white">
                <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">{feature.title}</h3>
                  <p className="text-white/80 text-sm">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Testimonial/Stats */}
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-6 text-white">
            <div>
              <div className="text-2xl font-bold">10K+</div>
              <div className="text-xs text-white/80">Active Users</div>
            </div>
            <div>
              <div className="text-2xl font-bold">5M+</div>
              <div className="text-xs text-white/80">Emails Processed</div>
            </div>
            <div>
              <div className="text-2xl font-bold">99.9%</div>
              <div className="text-xs text-white/80">Uptime</div>
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
              Trusted by professionals at top companies
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
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
              {step === 'account-type' ? 'Get Started' : 'Create Your Account'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {step === 'account-type' 
                ? 'Choose the account type that fits your needs'
                : 'Join EaseMail and transform your inbox'
              }
            </p>
          </div>

          {/* Form Content */}
          <Card className="p-5 shadow-lg">
            {step === 'account-type' ? (
              <div className="space-y-5">
                {/* Account Type Selection */}
                <div className="grid grid-cols-1 gap-3">
                  {/* Individual Account */}
                  <button
                    type="button"
                    onClick={() => setAccountType('individual')}
                    className={cn(
                      "relative p-4 rounded-lg border-2 transition-all text-left hover:border-primary/50",
                      accountType === 'individual' 
                        ? "border-primary bg-primary/5" 
                        : "border-border"
                    )}
                  >
                    {accountType === 'individual' && (
                      <div className="absolute top-3 right-3">
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm mb-1">Individual Account</h3>
                        <p className="text-xs text-muted-foreground mb-2">
                          Perfect for personal email management
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            AI Features
                          </span>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            Multiple Accounts
                          </span>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            Smart Rules
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Team Account */}
                  <button
                    type="button"
                    onClick={() => setAccountType('team')}
                    className={cn(
                      "relative p-4 rounded-lg border-2 transition-all text-left hover:border-primary/50",
                      accountType === 'team' 
                        ? "border-primary bg-primary/5" 
                        : "border-border"
                    )}
                  >
                    {accountType === 'team' && (
                      <div className="absolute top-3 right-3">
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/10">
                        <Users className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm mb-1">Team Account</h3>
                        <p className="text-xs text-muted-foreground mb-2">
                          Built for teams and organizations
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="text-xs bg-purple-500/10 text-purple-600 px-2 py-0.5 rounded">
                            Team Workspace
                          </span>
                          <span className="text-xs bg-purple-500/10 text-purple-600 px-2 py-0.5 rounded">
                            Shared Billing
                          </span>
                          <span className="text-xs bg-purple-500/10 text-purple-600 px-2 py-0.5 rounded">
                            Analytics
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                </div>

                <Button 
                  onClick={() => setStep('details')} 
                  className="w-full"
                >
                  Continue
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSignup} className="space-y-3.5">
                {/* Back Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep('account-type')}
                  disabled={loading}
                  className="mb-1"
                >
                  ← Back
                </Button>

                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-sm">Full Name *</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={loading}
                    className="h-9"
                  />
                </div>

                {/* Organization Name (Team only) */}
                {accountType === 'team' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="organizationName" className="text-sm">Organization Name *</Label>
                    <Input
                      id="organizationName"
                      type="text"
                      placeholder="Acme Corp"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      required
                      disabled={loading}
                      className="h-9"
                    />
                  </div>
                )}

                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm">Email Address *</Label>
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

                {/* Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={loading}
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be at least 6 characters
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-2.5 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200">
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>

                {/* Terms */}
                <p className="text-xs text-center text-muted-foreground">
                  By creating an account, you agree to our{' '}
                  <Link href="/terms" className="text-primary hover:underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                </p>
              </form>
            )}
          </Card>

          {/* Login Link */}
          <p className="text-sm text-center text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
