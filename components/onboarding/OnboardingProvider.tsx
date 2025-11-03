'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export type OnboardingStep = 
  | 'welcome'
  | 'connect-account'
  | 'signature'
  | 'ai-write'
  | 'voice-message'
  | 'sms'
  | 'navigation'
  | 'complete';

interface OnboardingContextType {
  isActive: boolean;
  currentStep: OnboardingStep | null;
  stepNumber: number;
  totalSteps: number;
  startOnboarding: () => void;
  nextStep: () => void;
  previousStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
  goToStep: (step: OnboardingStep) => void;
  highlightedElement: string | null;
  setHighlightedElement: (element: string | null) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const ONBOARDING_STEPS: OnboardingStep[] = [
  'welcome',
  'connect-account',
  'signature',
  'ai-write',
  'voice-message',
  'sms',
  'navigation',
  'complete'
];

interface OnboardingProviderProps {
  children: React.ReactNode;
  startFromBeginning?: boolean;
  userId?: string;
}

export function OnboardingProvider({ children, startFromBeginning = false, userId }: OnboardingProviderProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState<OnboardingStep | null>(null);
  const [stepNumber, setStepNumber] = useState(0);
  const [highlightedElement, setHighlightedElement] = useState<string | null>(null);
  const router = useRouter();

  // Load onboarding state from API
  useEffect(() => {
    const loadOnboardingState = async () => {
      try {
        const response = await fetch('/api/user/onboarding/status');
        if (response.ok) {
          const data = await response.json();
          
          // Check if user should see onboarding
          if (startFromBeginning || (!data.onboardingCompleted && !data.onboardingSkipped)) {
            setIsActive(true);
            setCurrentStep('welcome');
            setStepNumber(0);
            
            // Track start
            if (!data.onboardingStartedAt) {
              await fetch('/api/user/onboarding/start', { method: 'POST' });
            }
          }
        }
      } catch (error) {
        console.error('Failed to load onboarding state:', error);
      }
    };

    loadOnboardingState();
  }, [startFromBeginning]);

  const startOnboarding = useCallback(() => {
    setIsActive(true);
    setCurrentStep('welcome');
    setStepNumber(0);
    fetch('/api/user/onboarding/start', { method: 'POST' }).catch(console.error);
  }, []);

  const nextStep = useCallback(async () => {
    const currentIndex = ONBOARDING_STEPS.indexOf(currentStep!);
    const nextIndex = currentIndex + 1;

    if (nextIndex < ONBOARDING_STEPS.length) {
      const nextStepValue = ONBOARDING_STEPS[nextIndex];
      setCurrentStep(nextStepValue);
      setStepNumber(nextIndex);
      
      // Update progress in database
      try {
        await fetch('/api/user/onboarding/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ step: nextIndex }),
        });
      } catch (error) {
        console.error('Failed to update onboarding progress:', error);
      }

      // Complete if last step
      if (nextStepValue === 'complete') {
        completeOnboarding();
      }
    }
  }, [currentStep]);

  const previousStep = useCallback(() => {
    const currentIndex = ONBOARDING_STEPS.indexOf(currentStep!);
    const prevIndex = Math.max(0, currentIndex - 1);
    setCurrentStep(ONBOARDING_STEPS[prevIndex]);
    setStepNumber(prevIndex);
  }, [currentStep]);

  const skipOnboarding = useCallback(async () => {
    setIsActive(false);
    setCurrentStep(null);
    setHighlightedElement(null);
    
    try {
      await fetch('/api/user/onboarding/skip', { method: 'POST' });
    } catch (error) {
      console.error('Failed to mark onboarding as skipped:', error);
    }
  }, []);

  const completeOnboarding = useCallback(async () => {
    setIsActive(false);
    setCurrentStep(null);
    setHighlightedElement(null);
    
    try {
      await fetch('/api/user/onboarding/complete', { method: 'POST' });
    } catch (error) {
      console.error('Failed to mark onboarding as complete:', error);
    }
  }, []);

  const goToStep = useCallback((step: OnboardingStep) => {
    const index = ONBOARDING_STEPS.indexOf(step);
    setCurrentStep(step);
    setStepNumber(index);
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        isActive,
        currentStep,
        stepNumber,
        totalSteps: ONBOARDING_STEPS.length,
        startOnboarding,
        nextStep,
        previousStep,
        skipOnboarding,
        completeOnboarding,
        goToStep,
        highlightedElement,
        setHighlightedElement,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}

