'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
          <div className="mx-auto max-w-md text-center">
            <h1 className="text-4xl font-bold mb-4">Something went wrong</h1>
            <p className="text-muted-foreground mb-6">
              An unexpected error occurred. Our team has been notified and will look into it.
            </p>
            {error.digest && (
              <p className="text-sm text-muted-foreground mb-6">
                Error ID: {error.digest}
              </p>
            )}
            <div className="flex gap-4 justify-center">
              <Button onClick={reset}>
                Try again
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = '/')}
              >
                Go home
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
