'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Check, AlertCircle, Loader2 } from 'lucide-react';

export default function AcceptInvitePage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [orgName, setOrgName] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid invitation link');
      return;
    }

    acceptInvitation();
  }, [token]);

  const acceptInvitation = async () => {
    try {
      const response = await fetch('/api/team/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setOrgName(data.organization.name);
        setMessage('You have successfully joined the team!');
        
        // Redirect to inbox after 2 seconds
        setTimeout(() => {
          router.push('/inbox');
        }, 2000);
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to accept invitation');
      }
    } catch (error) {
      setStatus('error');
      setMessage('An error occurred while accepting the invitation');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === 'loading' && (
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            )}
            {status === 'error' && (
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl">
            {status === 'loading' && 'Accepting Invitation...'}
            {status === 'success' && 'Welcome to the Team!'}
            {status === 'error' && 'Invitation Error'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Please wait while we process your invitation'}
            {status === 'success' && orgName && `You are now part of ${orgName}`}
            {status === 'error' && message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'success' && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-800 dark:text-green-300 text-center">
                  Redirecting you to your inbox...
                </p>
              </div>
              <Button
                onClick={() => router.push('/inbox')}
                className="w-full"
              >
                <Users className="h-4 w-4 mr-2" />
                Go to Inbox
              </Button>
            </div>
          )}
          {status === 'error' && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-800 dark:text-red-300 text-center">
                  {message}
                </p>
              </div>
              <Button
                onClick={() => router.push('/login')}
                variant="outline"
                className="w-full"
              >
                Back to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

