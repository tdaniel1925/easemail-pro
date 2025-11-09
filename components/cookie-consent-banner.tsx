'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Cookie } from 'lucide-react';

/**
 * Cookie Consent Banner
 *
 * GDPR/CCPA compliant cookie consent component
 * Displays on first visit and allows users to accept/reject non-essential cookies
 */

const CONSENT_COOKIE_NAME = 'easemail_cookie_consent';
const CONSENT_EXPIRY_DAYS = 365;

interface ConsentPreferences {
  necessary: boolean; // Always true (required for app to function)
  analytics: boolean;
  marketing: boolean;
  timestamp: number;
}

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Check if user has already provided consent
    const consent = getCookieConsent();
    if (!consent) {
      // Show banner after a short delay for better UX
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptAll = () => {
    const preferences: ConsentPreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: Date.now(),
    };
    saveConsent(preferences);
    setShowBanner(false);
  };

  const acceptNecessary = () => {
    const preferences: ConsentPreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: Date.now(),
    };
    saveConsent(preferences);
    setShowBanner(false);
  };

  const saveCustomPreferences = (analytics: boolean, marketing: boolean) => {
    const preferences: ConsentPreferences = {
      necessary: true,
      analytics,
      marketing,
      timestamp: Date.now(),
    };
    saveConsent(preferences);
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-lg">
      <div className="container mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Icon and Message */}
          <div className="flex items-start gap-3 flex-1">
            <Cookie className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">
                We value your privacy
              </h3>
              <p className="text-sm text-muted-foreground">
                We use cookies to enhance your experience, analyze site usage, and improve our services.
                {' '}
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-primary hover:underline inline-flex items-center"
                >
                  {showDetails ? 'Hide details' : 'Learn more'}
                </button>
              </p>

              {/* Detailed Cookie Info */}
              {showDetails && (
                <div className="mt-4 p-4 bg-muted rounded-lg text-xs space-y-3">
                  <div>
                    <strong className="block mb-1">Necessary Cookies (Required)</strong>
                    <p className="text-muted-foreground">
                      Essential for authentication, session management, and core app functionality.
                      Cannot be disabled.
                    </p>
                  </div>
                  <div>
                    <strong className="block mb-1">Analytics Cookies (Optional)</strong>
                    <p className="text-muted-foreground">
                      Help us understand how you use EaseMail to improve features and performance.
                      No personally identifiable information is collected.
                    </p>
                  </div>
                  <div>
                    <strong className="block mb-1">Marketing Cookies (Optional)</strong>
                    <p className="text-muted-foreground">
                      Used to show you relevant content and measure the effectiveness of our campaigns.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <Link
                      href="/legal/privacy"
                      className="text-primary hover:underline"
                    >
                      View our Privacy Policy
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={acceptNecessary}
              className="px-4 py-2 text-sm font-medium text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors"
            >
              Necessary Only
            </button>
            <button
              onClick={acceptAll}
              className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors"
            >
              Accept All
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={acceptNecessary}
            className="absolute top-2 right-2 sm:relative sm:top-0 sm:right-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close banner (accepts necessary cookies only)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper Functions
 */

function getCookieConsent(): ConsentPreferences | null {
  if (typeof window === 'undefined') return null;

  try {
    const consent = localStorage.getItem(CONSENT_COOKIE_NAME);
    if (!consent) return null;

    const parsed = JSON.parse(consent) as ConsentPreferences;

    // Check if consent is still valid (within expiry period)
    const daysSinceConsent = (Date.now() - parsed.timestamp) / (1000 * 60 * 60 * 24);
    if (daysSinceConsent > CONSENT_EXPIRY_DAYS) {
      localStorage.removeItem(CONSENT_COOKIE_NAME);
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('Failed to parse cookie consent:', error);
    return null;
  }
}

function saveConsent(preferences: ConsentPreferences): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(CONSENT_COOKIE_NAME, JSON.stringify(preferences));

    // Trigger custom event for analytics initialization
    window.dispatchEvent(
      new CustomEvent('cookieConsentUpdate', { detail: preferences })
    );

    console.log('Cookie consent saved:', preferences);
  } catch (error) {
    console.error('Failed to save cookie consent:', error);
  }
}

/**
 * Hook to access cookie consent preferences
 * Use this in analytics/tracking components to check if user has consented
 */
export function useCookieConsent(): ConsentPreferences | null {
  const [consent, setConsent] = useState<ConsentPreferences | null>(null);

  useEffect(() => {
    // Initial load
    setConsent(getCookieConsent());

    // Listen for consent updates
    const handleConsentUpdate = (event: CustomEvent<ConsentPreferences>) => {
      setConsent(event.detail);
    };

    window.addEventListener('cookieConsentUpdate', handleConsentUpdate as EventListener);
    return () => {
      window.removeEventListener('cookieConsentUpdate', handleConsentUpdate as EventListener);
    };
  }, []);

  return consent;
}

/**
 * Check if specific cookie category is consented
 */
export function hasConsentFor(category: 'necessary' | 'analytics' | 'marketing'): boolean {
  const consent = getCookieConsent();
  if (!consent) return false;
  return consent[category];
}
