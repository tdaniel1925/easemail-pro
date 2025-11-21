'use client';

import { AlertCircle, ExternalLink, RefreshCw, Clock, Mail, HelpCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { getErrorResolution, formatWaitTime } from '@/lib/sync-error-guides';
import { useState } from 'react';

interface ErrorResolutionCardProps {
  errorMessage: string;
  accountId: string;
  provider?: string; // Email provider (google, microsoft, etc.) for provider-specific actions
  onReconnect?: () => void;
  onRetry?: () => void;
}

export default function ErrorResolutionCard({
  errorMessage,
  accountId,
  provider,
  onReconnect,
  onRetry
}: ErrorResolutionCardProps) {
  const [waiting, setWaiting] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const resolution = getErrorResolution(errorMessage, provider);

  const handleAction = async (actionType: string, url?: string, waitTime?: number) => {
    switch (actionType) {
      case 'reconnect':
        if (onReconnect) {
          onReconnect();
        } else {
          // Redirect to accounts page for reconnection
          window.location.href = '/accounts-v3';
        }
        break;

      case 'retry':
        if (onRetry) {
          setRetrying(true);
          try {
            await onRetry();
          } finally {
            setRetrying(false);
          }
        }
        break;

      case 'wait':
        if (waitTime && onRetry) {
          setWaiting(true);
          setTimeout(async () => {
            setRetrying(true);
            try {
              await onRetry();
            } finally {
              setRetrying(false);
              setWaiting(false);
            }
          }, waitTime * 60 * 1000);
        }
        break;

      case 'external':
        if (url) {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
        break;

      case 'support':
        window.location.href = '/settings?section=help';
        break;

      default:
        break;
    }
  };

  const getAlertVariant = () => {
    if (resolution.severity === 'error') return 'destructive';
    if (resolution.severity === 'warning') return 'default';
    return 'default';
  };

  return (
    <Alert variant={getAlertVariant()} className="border-l-4">
      <AlertCircle className="h-5 w-5" />
      <AlertTitle className="text-lg font-semibold mb-2">
        {resolution.title}
      </AlertTitle>
      <AlertDescription className="space-y-4">
        {/* Description */}
        <p className="text-sm leading-relaxed">
          {resolution.description}
        </p>

        {/* Technical Error Details (Collapsible) */}
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground transition-colors">
            Technical Details
          </summary>
          <div className="mt-2 p-3 bg-muted/50 rounded-md font-mono break-all">
            {errorMessage}
          </div>
        </details>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          {resolution.actions.map((action, index) => (
            <Button
              key={index}
              size="sm"
              variant={index === 0 ? 'default' : 'outline'}
              onClick={() => handleAction(action.type, action.url, action.waitTime)}
              disabled={waiting || retrying}
            >
              {action.type === 'reconnect' && <Mail className="h-3 w-3 mr-1.5" />}
              {action.type === 'retry' && <RefreshCw className={`h-3 w-3 mr-1.5 ${retrying ? 'animate-spin' : ''}`} />}
              {action.type === 'wait' && <Clock className="h-3 w-3 mr-1.5" />}
              {action.type === 'external' && <ExternalLink className="h-3 w-3 mr-1.5" />}
              {action.type === 'support' && <HelpCircle className="h-3 w-3 mr-1.5" />}

              {waiting && action.waitTime ? (
                `Waiting ${formatWaitTime(action.waitTime)}...`
              ) : retrying && action.type === 'retry' ? (
                'Retrying...'
              ) : (
                action.label
              )}
            </Button>
          ))}

          {/* Learn More Link */}
          {resolution.learnMoreUrl && (
            <Button
              size="sm"
              variant="ghost"
              asChild
            >
              <a
                href={resolution.learnMoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs"
              >
                Learn More
                <ExternalLink className="h-3 w-3 ml-1.5" />
              </a>
            </Button>
          )}
        </div>

        {/* Wait Time Info */}
        {waiting && resolution.actions.find(a => a.type === 'wait') && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded">
            <Clock className="h-3 w-3 animate-pulse" />
            <span>
              Waiting {formatWaitTime(resolution.actions.find(a => a.type === 'wait')?.waitTime || 0)} before retrying...
            </span>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
