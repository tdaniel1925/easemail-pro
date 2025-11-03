'use client';

import { useEffect } from 'react';
import { useOnboarding } from './OnboardingProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';

interface OnboardingTooltipProps {
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  showBack?: boolean;
  nextLabel?: string;
  highlightSelector?: string;
}

export function OnboardingTooltip({
  title,
  description,
  position = 'bottom',
  showBack = true,
  nextLabel = 'Next',
  highlightSelector,
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
    <Card className="fixed z-[60] max-w-md shadow-2xl border-primary">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold">{title}</h3>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                Step {stepNumber + 1} of {totalSteps}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={skipOnboarding}
            className="ml-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-2 mb-4">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${((stepNumber + 1) / totalSteps) * 100}%` }}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {showBack && stepNumber > 0 && (
            <Button
              variant="outline"
              onClick={previousStep}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <Button
            onClick={nextStep}
            className="flex-1"
          >
            {nextLabel}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <Button
            variant="ghost"
            onClick={skipOnboarding}
          >
            Skip Tour
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

