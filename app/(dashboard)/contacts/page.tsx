'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight } from 'lucide-react';

export default function ContactsPage() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-6">
          <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-4">This Page Has Been Deprecated</h1>
          <p className="text-lg text-muted-foreground mb-6">
            We've upgraded our contacts system with better performance, real-time sync, and more features.
            Please use the new Contacts page instead.
          </p>
        </div>

        <div className="bg-muted/50 border border-border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3">What's New:</h2>
          <ul className="text-left space-y-2 mb-4 max-w-md mx-auto">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Real-time sync with Google and Microsoft contacts</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Faster performance with optimized loading</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Better search and filtering capabilities</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Enhanced contact management features</span>
            </li>
          </ul>
        </div>

        <Button
          size="lg"
          onClick={() => router.push('/contacts-v4')}
          className="gap-2"
        >
          Go to New Contacts Page
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
