'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface ImpersonationData {
  adminUserId: string;
  adminEmail: string;
  targetUserId: string;
  targetEmail: string;
  startedAt: string;
}

export function ImpersonationBanner() {
  const [impersonationData, setImpersonationData] = useState<ImpersonationData | null>(null);
  const [exiting, setExiting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if we're in impersonation mode
    const checkImpersonation = () => {
      try {
        const data = localStorage.getItem('impersonation_data');
        if (data) {
          const parsed = JSON.parse(data);
          setImpersonationData(parsed);
          console.log('[ImpersonationBanner] Impersonation mode detected:', parsed);
          // Add padding to body when banner is showing
          document.body.style.paddingTop = '48px';
        } else {
          // Remove padding when banner is hidden
          document.body.style.paddingTop = '0';
        }
      } catch (error) {
        console.error('[ImpersonationBanner] Error checking impersonation:', error);
      }
    };

    checkImpersonation();

    // Listen for storage changes (in case impersonation starts in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'impersonation_data') {
        checkImpersonation();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Cleanup: remove padding on unmount
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.body.style.paddingTop = '0';
    };
  }, []);

  const handleExitImpersonation = async () => {
    if (!impersonationData) return;

    setExiting(true);
    console.log('[ImpersonationBanner] Exiting impersonation...');

    try {
      // Call exit API to log the exit
      const response = await fetch('/api/admin/impersonate/exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: impersonationData.adminUserId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to exit impersonation');
      }

      console.log('[ImpersonationBanner] Exit logged, signing out...');

      // Clear impersonation data
      localStorage.removeItem('impersonation_data');

      // Sign out (this will clear the impersonated user's session)
      const supabase = createClient();
      await supabase.auth.signOut();

      console.log('[ImpersonationBanner] Signed out, redirecting to admin login...');

      // Redirect to login page (admin will need to log back in)
      window.location.href = '/login?message=Exited impersonation mode. Please log in again.';
    } catch (error) {
      console.error('[ImpersonationBanner] Failed to exit impersonation:', error);
      alert('Failed to exit impersonation mode. Please try again.');
      setExiting(false);
    }
  };

  if (!impersonationData) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-yellow-500 text-yellow-950 shadow-lg border-b-2 border-yellow-600">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 animate-pulse" />
            <div className="flex items-center gap-2 flex-wrap text-sm font-medium">
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4" />
                Impersonating:
              </span>
              <span className="font-bold">{impersonationData.targetEmail}</span>
              <span className="text-yellow-700">•</span>
              <span className="text-xs">
                Admin: {impersonationData.adminEmail}
              </span>
            </div>
          </div>

          <Button
            onClick={handleExitImpersonation}
            disabled={exiting}
            size="sm"
            variant="outline"
            className="bg-yellow-950 hover:bg-yellow-900 text-yellow-50 border-yellow-700 flex-shrink-0"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {exiting ? 'Exiting...' : 'Exit Impersonation'}
          </Button>
        </div>
      </div>
    </div>
  );
}
