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
}

export function OnboardingTooltip({
  title,
  description,
  highlightSelector,
  showBack = true,
  nextLabel = 'Next',
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
      <Card className="w-full max-w-lg shadow-2xl border-2 border-primary pointer-events-auto">
        <CardContent className="p-6">
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
            <Button
              variant="ghost"
              size="sm"
              onClick={skipOnboarding}
              className="ml-2 -mt-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

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
        </CardContent>
      </Card>
    </div>
  );
}
