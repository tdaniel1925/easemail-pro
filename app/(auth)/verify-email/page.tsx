'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mail, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }

    // Check if user is already verified
    checkVerificationStatus();
  }, [searchParams]);

  const checkVerificationStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user?.email_confirmed_at) {
        setVerified(true);
        // Auto-redirect after 2 seconds
        setTimeout(() => {
          router.push('/inbox');
        }, 2000);
      }
    } catch (err) {
      console.error('Error checking verification:', err);
    } finally {
      setChecking(false);
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    setError('');
    setResent(false);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) throw error;

      setResent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email');
    } finally {
      setResending(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md p-8 text-center">
          <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
          <p className="text-muted-foreground">Checking verification status...</p>
        </Card>
      </div>
    );
  }

  if (verified) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md p-8 text-center">
          <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
          <h1 className="text-2xl font-bold mb-2">Email Verified!</h1>
          <p className="text-muted-foreground mb-6">
            Your email has been verified. Redirecting to inbox...
          </p>
          <Loader2 className="h-6 w-6 mx-auto animate-spin text-primary" />
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <Mail className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h1 className="text-2xl font-bold mb-2">Verify Your Email</h1>
          <p className="text-muted-foreground">
            We've sent a verification link to:
          </p>
          <p className="font-semibold mt-2">{email}</p>
        </div>

        <div className="space-y-4">
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              Please check your email and click the verification link to activate your account.
              The link will expire in 24 hours.
            </p>
          </div>

          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Didn't receive the email?
            </p>

            {resent ? (
              <div className="flex items-center justify-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Verification email sent!</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center gap-2 text-red-600">
                <XCircle className="h-4 w-4" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            ) : null}

            <Button
              onClick={handleResendVerification}
              disabled={resending || resent}
              variant="outline"
              className="w-full"
            >
              {resending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : resent ? (
                'Email Sent!'
              ) : (
                'Resend Verification Email'
              )}
            </Button>
          </div>

          <div className="pt-4 border-t text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Need help?
            </p>
            <Link
              href="/help"
              className="text-sm text-primary hover:underline"
            >
              Contact Support
            </Link>
          </div>

          <div className="text-center">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to Login
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
