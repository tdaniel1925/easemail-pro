'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Users, Check } from 'lucide-react';
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
        // Redirect to inbox after successful signup
        router.push('/inbox');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'An error occurred during Google signup');
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-3xl font-bold text-center">
          {step === 'account-type' ? 'Choose Account Type' : 'Create Account'}
        </CardTitle>
        <CardDescription className="text-center">
          {step === 'account-type' 
            ? 'Select the type of account that fits your needs'
            : 'Start managing your emails smarter'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 'account-type' ? (
          <>
            {/* Account Type Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Individual Account Option */}
              <button
                type="button"
                onClick={() => setAccountType('individual')}
                className={cn(
                  "relative p-6 rounded-lg border-2 transition-all text-left hover:border-primary/50",
                  accountType === 'individual' 
                    ? "border-primary bg-primary/5" 
                    : "border-border bg-card"
                )}
              >
                {accountType === 'individual' && (
                  <div className="absolute top-3 right-3">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  </div>
                )}
                <div className="flex flex-col items-start space-y-3">
                  <div className="p-3 rounded-lg bg-blue-500/10">
                    <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Individual</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Perfect for personal use
                    </p>
                  </div>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    <li className="flex items-start">
                      <Check className="h-3.5 w-3.5 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                      <span>Manage your personal emails</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-3.5 w-3.5 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                      <span>AI-powered features</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-3.5 w-3.5 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                      <span>Connect multiple accounts</span>
                    </li>
                  </ul>
                </div>
              </button>

              {/* Team Account Option */}
              <button
                type="button"
                onClick={() => setAccountType('team')}
                className={cn(
                  "relative p-6 rounded-lg border-2 transition-all text-left hover:border-primary/50",
                  accountType === 'team' 
                    ? "border-primary bg-primary/5" 
                    : "border-border bg-card"
                )}
              >
                {accountType === 'team' && (
                  <div className="absolute top-3 right-3">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  </div>
                )}
                <div className="flex flex-col items-start space-y-3">
                  <div className="p-3 rounded-lg bg-purple-500/10">
                    <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Team</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Built for teams and organizations
                    </p>
                  </div>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    <li className="flex items-start">
                      <Check className="h-3.5 w-3.5 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                      <span>Invite team members</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-3.5 w-3.5 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                      <span>Shared billing & management</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-3.5 w-3.5 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                      <span>Team analytics & insights</span>
                    </li>
                  </ul>
                </div>
              </button>
            </div>

            <Button 
              onClick={() => setStep('details')} 
              className="w-full"
              size="lg"
            >
              Continue with {accountType === 'individual' ? 'Individual' : 'Team'} Account
            </Button>
          </>
        ) : (
          <>
            {/* Account Details Form */}
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
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

              {accountType === 'team' && (
                <div className="space-y-2">
                  <Label htmlFor="organizationName">Organization Name</Label>
                  <Input
                    id="organizationName"
                    type="text"
                    placeholder="Acme Corp"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    This will be your team workspace name
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
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
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
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

              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-md">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setStep('account-type')}
                  disabled={loading}
                  className="w-24"
                >
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </div>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignup}
              disabled={loading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Sign up with Google
            </Button>
          </>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-sm text-center w-full text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}


