'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Database, Shield, User, CheckCircle } from 'lucide-react';

export default function AdminSetupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const makeAdmin = async () => {
    if (!email) {
      setResult({ success: false, message: 'Please enter an email address' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({ success: true, message: `✅ ${email} is now an admin!` });
        setEmail('');
      } else {
        setResult({ success: false, message: data.error || 'Failed to make user admin' });
      }
    } catch (error) {
      setResult({ success: false, message: 'Failed to connect to server' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">Admin Setup</CardTitle>
          <CardDescription>
            Grant admin access to a user account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Instructions */}
          <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div>
                <strong>Step 1:</strong> Create an account at <code className="text-xs bg-background px-1 py-0.5 rounded">/signup</code>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div>
                <strong>Step 2:</strong> Enter your email below and click "Make Admin"
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div>
                <strong>Step 3:</strong> Log in with your admin account
              </div>
            </div>
          </div>

          {/* Email Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Email Address</label>
            <Input
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && makeAdmin()}
            />
          </div>

          {/* Result Message */}
          {result && (
            <div
              className={`p-3 rounded-lg text-sm ${
                result.success
                  ? 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20'
                  : 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
              }`}
            >
              {result.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={makeAdmin} disabled={loading} className="flex-1">
              <Shield className="h-4 w-4 mr-2" />
              {loading ? 'Processing...' : 'Make Admin'}
            </Button>
          </div>

          <div className="pt-4 border-t space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push('/signup')}
            >
              <User className="h-4 w-4 mr-2" />
              Go to Signup
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push('/login')}
            >
              Go to Login
            </Button>
          </div>

          {/* Database Note */}
          <div className="text-xs text-center text-muted-foreground pt-2 space-y-1">
            <div className="flex items-center justify-center gap-1">
              <Database className="h-3 w-3" />
              <span>Alternatively, run SQL directly in Supabase:</span>
            </div>
            <code className="block bg-muted px-2 py-1 rounded text-[10px]">
              UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

