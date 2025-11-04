'use client';

import { useEffect, useState, useRef } from 'react';
import { useOnboarding } from './OnboardingProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';

interface OnboardingTooltipProps {
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
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
  const cardRef = useRef<HTMLDivElement>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});

  // Set highlighted element when tooltip mounts
  useEffect(() => {
    if (highlightSelector) {
      setHighlightedElement(highlightSelector);
    }
    return () => setHighlightedElement(null);
  }, [highlightSelector, setHighlightedElement]);

  // Calculate smart positioning based on highlighted element
  useEffect(() => {
    if (position === 'center') {
      // Center on screen - no calculation needed
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        maxWidth: '480px',
        width: 'calc(100% - 32px)',
      });
      return;
    }

    const calculatePosition = () => {
      if (!highlightSelector) return;

      const targetElement = document.querySelector(highlightSelector);
      if (!targetElement || !cardRef.current) return;

      const targetRect = targetElement.getBoundingClientRect();
      const cardRect = cardRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const SPACING = 16; // Gap between target and tooltip
      const EDGE_PADDING = 16; // Padding from viewport edges

      let top = 0;
      let left = 0;

      // Calculate initial position based on preferred direction
      switch (position) {
        case 'bottom':
          top = targetRect.bottom + SPACING;
          left = targetRect.left + (targetRect.width / 2) - (cardRect.width / 2);
          break;
        case 'top':
          top = targetRect.top - cardRect.height - SPACING;
          left = targetRect.left + (targetRect.width / 2) - (cardRect.width / 2);
          break;
        case 'right':
          top = targetRect.top + (targetRect.height / 2) - (cardRect.height / 2);
          left = targetRect.right + SPACING;
          break;
        case 'left':
          top = targetRect.top + (targetRect.height / 2) - (cardRect.height / 2);
          left = targetRect.left - cardRect.width - SPACING;
          break;
      }

      // Adjust if tooltip goes off-screen horizontally
      if (left < EDGE_PADDING) {
        left = EDGE_PADDING;
      } else if (left + cardRect.width > viewportWidth - EDGE_PADDING) {
        left = viewportWidth - cardRect.width - EDGE_PADDING;
      }

      // Adjust if tooltip goes off-screen vertically
      if (top < EDGE_PADDING) {
        top = EDGE_PADDING;
      } else if (top + cardRect.height > viewportHeight - EDGE_PADDING) {
        top = viewportHeight - cardRect.height - EDGE_PADDING;
      }

      // If still off-screen after adjustments, try opposite position
      if (position === 'bottom' && top + cardRect.height > viewportHeight - EDGE_PADDING) {
        top = targetRect.top - cardRect.height - SPACING;
      } else if (position === 'top' && top < EDGE_PADDING) {
        top = targetRect.bottom + SPACING;
      }

      setTooltipStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        maxWidth: '420px',
        width: 'auto',
        minWidth: '320px',
      });
    };

    // Calculate on mount and when viewport changes
    calculatePosition();
    
    const resizeObserver = new ResizeObserver(calculatePosition);
    if (cardRef.current) {
      resizeObserver.observe(cardRef.current);
    }

    window.addEventListener('resize', calculatePosition);
    window.addEventListener('scroll', calculatePosition, true);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition, true);
    };
  }, [highlightSelector, position]);

  return (
    <Card 
      ref={cardRef}
      className="z-[60] shadow-2xl border-primary"
      style={tooltipStyle}
    >
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

