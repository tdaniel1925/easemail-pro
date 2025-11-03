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
    <div className="flex min-h-screen w-full">
      {/* Left Panel - Marketing */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-12 flex-col justify-between relative overflow-hidden">
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
          <div className="flex items-center gap-2 mb-16">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <span className="text-2xl font-bold text-white">EaseMail</span>
          </div>

          {/* Main Headline */}
          <div className="space-y-6 mb-12">
            <h1 className="text-5xl font-bold text-white leading-tight">
              Email Management,
              <br />
              Reimagined with AI
            </h1>
            <p className="text-xl text-white/90 leading-relaxed">
              Join thousands of professionals who've transformed their inbox into a productivity powerhouse.
            </p>
          </div>

          {/* Feature List */}
          <div className="space-y-4">
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
              <div key={index} className="flex items-start gap-4 text-white">
                <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{feature.title}</h3>
                  <p className="text-white/80 text-sm">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Testimonial/Stats */}
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-8 text-white">
            <div>
              <div className="text-3xl font-bold">10K+</div>
              <div className="text-sm text-white/80">Active Users</div>
            </div>
            <div>
              <div className="text-3xl font-bold">5M+</div>
              <div className="text-sm text-white/80">Emails Processed</div>
            </div>
            <div>
              <div className="text-3xl font-bold">99.9%</div>
              <div className="text-sm text-white/80">Uptime</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-white/90">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-white/30 border-2 border-primary flex items-center justify-center text-xs font-semibold">
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <p className="text-sm">
              Trusted by professionals at Google, Microsoft, Amazon & more
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Mail className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">EaseMail</span>
          </div>

          {/* Form Header */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">
              {step === 'account-type' ? 'Get Started' : 'Create Your Account'}
            </h2>
            <p className="text-muted-foreground">
              {step === 'account-type' 
                ? 'Choose the account type that fits your needs'
                : 'Join EaseMail and transform your inbox'
              }
            </p>
          </div>

          {/* Form Content */}
          <Card className="p-6 shadow-lg">
            {step === 'account-type' ? (
              <div className="space-y-6">
                {/* Account Type Selection */}
                <div className="grid grid-cols-1 gap-4">
                  {/* Individual Account */}
                  <button
                    type="button"
                    onClick={() => setAccountType('individual')}
                    className={cn(
                      "relative p-5 rounded-lg border-2 transition-all text-left hover:border-primary/50",
                      accountType === 'individual' 
                        ? "border-primary bg-primary/5" 
                        : "border-border"
                    )}
                  >
                    {accountType === 'individual' && (
                      <div className="absolute top-4 right-4">
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-base mb-1">Individual Account</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          Perfect for personal email management
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            AI Features
                          </span>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            Multiple Accounts
                          </span>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
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
                      "relative p-5 rounded-lg border-2 transition-all text-left hover:border-primary/50",
                      accountType === 'team' 
                        ? "border-primary bg-primary/5" 
                        : "border-border"
                    )}
                  >
                    {accountType === 'team' && (
                      <div className="absolute top-4 right-4">
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-purple-500/10">
                        <Users className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-base mb-1">Team Account</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          Built for teams and organizations
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs bg-purple-500/10 text-purple-600 px-2 py-1 rounded">
                            Team Workspace
                          </span>
                          <span className="text-xs bg-purple-500/10 text-purple-600 px-2 py-1 rounded">
                            Shared Billing
                          </span>
                          <span className="text-xs bg-purple-500/10 text-purple-600 px-2 py-1 rounded">
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
                  size="lg"
                >
                  Continue
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                {/* Back Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep('account-type')}
                  disabled={loading}
                  className="mb-2"
                >
                  ← Back
                </Button>

                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                {/* Organization Name (Team only) */}
                {accountType === 'team' && (
                  <div className="space-y-2">
                    <Label htmlFor="organizationName">Organization Name *</Label>
                    <Input
                      id="organizationName"
                      type="text"
                      placeholder="Acme Corp"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                )}

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be at least 6 characters
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200">
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
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
