'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link2Off, ExternalLink, Loader2, CheckCircle, AlertTriangle, Mail } from 'lucide-react';

interface UnsubscribeHelperProps {
  isOpen: boolean;
  onClose: () => void;
  email: {
    id: string;
    fromEmail?: string;
    subject?: string;
    bodyHtml?: string;
    bodyText?: string;
    headers?: Record<string, string>;
  };
  accountId: string;
  onSuccess?: () => void;
}

interface UnsubscribeMethod {
  type: 'mailto' | 'http' | 'oneclick';
  url: string;
  label: string;
}

export function UnsubscribeHelper({
  isOpen,
  onClose,
  email,
  accountId,
  onSuccess,
}: UnsubscribeHelperProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [methods, setMethods] = useState<UnsubscribeMethod[]>([]);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Detect unsubscribe methods when dialog opens
  useEffect(() => {
    if (isOpen) {
      detectUnsubscribeMethods();
    }
  }, [isOpen, email]);

  const detectUnsubscribeMethods = () => {
    const detectedMethods: UnsubscribeMethod[] = [];

    // Check List-Unsubscribe header (most reliable)
    const listUnsubscribe = email.headers?.['List-Unsubscribe'] || email.headers?.['list-unsubscribe'];
    if (listUnsubscribe) {
      // Parse the header - can contain mailto: and/or http(s): URLs
      const matches = listUnsubscribe.match(/<([^>]+)>/g);
      if (matches) {
        matches.forEach((match) => {
          const url = match.slice(1, -1); // Remove < and >
          if (url.startsWith('mailto:')) {
            detectedMethods.push({
              type: 'mailto',
              url,
              label: 'Unsubscribe via Email',
            });
          } else if (url.startsWith('http')) {
            detectedMethods.push({
              type: 'http',
              url,
              label: 'Unsubscribe via Link',
            });
          }
        });
      }
    }

    // Check List-Unsubscribe-Post header (one-click unsubscribe)
    const listUnsubscribePost = email.headers?.['List-Unsubscribe-Post'];
    if (listUnsubscribePost && detectedMethods.some(m => m.type === 'http')) {
      // One-click is available
      const httpMethod = detectedMethods.find(m => m.type === 'http');
      if (httpMethod) {
        detectedMethods.unshift({
          type: 'oneclick',
          url: httpMethod.url,
          label: 'One-Click Unsubscribe (Recommended)',
        });
      }
    }

    // Scan email body for unsubscribe links
    const bodyContent = email.bodyHtml || email.bodyText || '';
    const unsubscribePatterns = [
      /href=["']([^"']*unsubscribe[^"']*)["']/gi,
      /href=["']([^"']*opt-out[^"']*)["']/gi,
      /href=["']([^"']*optout[^"']*)["']/gi,
      /href=["']([^"']*remove[^"']*list[^"']*)["']/gi,
      /href=["']([^"']*manage[^"']*subscription[^"']*)["']/gi,
      /href=["']([^"']*email[^"']*preferences[^"']*)["']/gi,
    ];

    const foundUrls = new Set<string>();
    unsubscribePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(bodyContent)) !== null) {
        const url = match[1];
        if (url.startsWith('http') && !foundUrls.has(url)) {
          foundUrls.add(url);
          // Don't add duplicates
          if (!detectedMethods.some(m => m.url === url)) {
            detectedMethods.push({
              type: 'http',
              url,
              label: 'Unsubscribe Link (from email)',
            });
          }
        }
      }
    });

    setMethods(detectedMethods);
  };

  const handleOneClickUnsubscribe = async (url: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/email/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          emailId: email.id,
          url,
          method: 'oneclick',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unsubscribe');
      }

      setStatus('success');
      onSuccess?.();
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to unsubscribe');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMailtoUnsubscribe = (url: string) => {
    // Open mailto link in default email client
    window.location.href = url;
    setStatus('success');
  };

  const handleHttpUnsubscribe = (url: string) => {
    // Open in new tab
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2Off className="h-5 w-5" />
            Unsubscribe
          </DialogTitle>
          <DialogDescription>
            Unsubscribe from emails sent by {email.fromEmail}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {status === 'success' ? (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Unsubscribe request sent successfully! You should stop receiving emails from this sender.
              </AlertDescription>
            </Alert>
          ) : status === 'error' ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {errorMessage || 'Failed to unsubscribe. Try using one of the manual options below.'}
              </AlertDescription>
            </Alert>
          ) : methods.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No unsubscribe link found in this email. You may need to manually contact the sender or look for an unsubscribe link in the email body.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Choose an unsubscribe method:
              </p>
              {methods.map((method, index) => (
                <Button
                  key={index}
                  variant={method.type === 'oneclick' ? 'default' : 'outline'}
                  className="w-full justify-start"
                  disabled={isLoading}
                  onClick={() => {
                    if (method.type === 'oneclick') {
                      handleOneClickUnsubscribe(method.url);
                    } else if (method.type === 'mailto') {
                      handleMailtoUnsubscribe(method.url);
                    } else {
                      handleHttpUnsubscribe(method.url);
                    }
                  }}
                >
                  {isLoading && method.type === 'oneclick' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : method.type === 'mailto' ? (
                    <Mail className="mr-2 h-4 w-4" />
                  ) : (
                    <ExternalLink className="mr-2 h-4 w-4" />
                  )}
                  {method.label}
                  {method.type === 'oneclick' && (
                    <span className="ml-auto text-xs bg-primary-foreground/20 px-2 py-0.5 rounded">
                      Automatic
                    </span>
                  )}
                </Button>
              ))}
            </div>
          )}

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              <strong>Tip:</strong> One-click unsubscribe is the fastest and most reliable method.
              If that&apos;s not available, the email link will open in a new tab where you can complete the process.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {status === 'success' ? 'Done' : 'Cancel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
