'use client';

import { useEffect } from 'react';
import { useOnboarding } from './OnboardingProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';

interface OnboardingTooltipProps {
  title: string;
  description: string;
  highlightSelector?: string;
  showBack?: boolean;
  nextLabel?: string;
  screenshotUrl?: string;
  screenshotAlt?: string;
  screenshotCaption?: string;
}

export function OnboardingTooltip({
  title,
  description,
  highlightSelector,
  showBack = true,
  nextLabel = 'Next',
  screenshotUrl,
  screenshotAlt,
  screenshotCaption,
}: OnboardingTooltipProps) {
  const { stepNumber, totalSteps, nextStep, previousStep, skipOnboarding, setHighlightedElement } = useOnboarding();

  // Set highlighted element when tooltip mounts
  useEffect(() => {
    if (highlightSelector) {
      setHighlightedElement(highlightSelector);
    }
    return () => setHighlightedElement(null);
  }, [highlightSelector, setHighlightedElement]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
      <Card className="w-full max-w-2xl shadow-2xl border-2 border-primary pointer-events-auto">
        <CardContent className="p-6">
          {/* Content Layout - Split if screenshot provided */}
          <div className={screenshotUrl ? "grid md:grid-cols-2 gap-6" : ""}>
            {/* Text Content */}
            <div className={screenshotUrl ? "" : "mb-4"}>
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold">{title}</h3>
                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                      {stepNumber + 1} / {totalSteps}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                </div>
                {!screenshotUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={skipOnboarding}
                    className="ml-2 -mt-1"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {!screenshotUrl && (
                <>
                  {/* Progress Bar */}
                  <div className="w-full bg-muted rounded-full h-1.5 mb-6">
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${((stepNumber + 1) / totalSteps) * 100}%` }}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {showBack && stepNumber > 0 && (
                      <Button
                        variant="outline"
                        onClick={previousStep}
                        size="default"
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                      </Button>
                    )}
                    <Button
                      onClick={nextStep}
                      className="flex-1"
                      size="default"
                    >
                      {nextLabel}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={skipOnboarding}
                      size="default"
                    >
                      Skip
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* Screenshot */}
            {screenshotUrl && (
              <div className="flex flex-col">
                <div className="rounded-lg border-2 border-muted overflow-hidden shadow-lg mb-2">
                  <img 
                    src={screenshotUrl} 
                    alt={screenshotAlt || title}
                    className="w-full h-auto"
                    onError={(e) => {
                      // Fallback to placeholder if image doesn't exist
                      e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23f1f5f9"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="system-ui" font-size="14" fill="%2394a3b8"%3EScreenshot Preview%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>
                {screenshotCaption && (
                  <p className="text-xs text-center text-muted-foreground">
                    {screenshotCaption}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Progress Bar and Actions for screenshot layout */}
          {screenshotUrl && (
            <>
              <div className="w-full bg-muted rounded-full h-1.5 mt-6 mb-6">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${((stepNumber + 1) / totalSteps) * 100}%` }}
                />
              </div>

              <div className="flex gap-2">
                {showBack && stepNumber > 0 && (
                  <Button
                    variant="outline"
                    onClick={previousStep}
                    size="default"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                )}
                <Button
                  onClick={nextStep}
                  className="flex-1"
                  size="default"
                >
                  {nextLabel}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={skipOnboarding}
                  size="default"
                >
                  Skip
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
