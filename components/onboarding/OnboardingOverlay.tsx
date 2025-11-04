'use client';

import { useEffect } from 'react';
import { useOnboarding } from './OnboardingProvider';
import WelcomeStep from './steps/WelcomeStep';
import ConnectAccountStep from './steps/ConnectAccountStep';
import SignatureStep from './steps/SignatureStep';
import AIWriteStep from './steps/AIWriteStep';
import VoiceMessageStep from './steps/VoiceMessageStep';
import SMSStep from './steps/SMSStep';
import NavigationStep from './steps/NavigationStep';
import CompleteStep from './steps/CompleteStep';

export default function OnboardingOverlay() {
  const { isActive, currentStep, highlightedElement } = useOnboarding();

  // Prevent body scroll when onboarding is active
  useEffect(() => {
    if (isActive) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isActive]);

  if (!isActive || !currentStep) {
    return null;
  }

  // Welcome and Complete are full-screen modals
  if (currentStep === 'welcome') {
    return <WelcomeStep />;
  }

  if (currentStep === 'complete') {
    return <CompleteStep />;
  }

  // Get the highlighted element for spotlight effect
  const targetElement = highlightedElement ? document.querySelector(highlightedElement) : null;
  const targetRect = targetElement?.getBoundingClientRect();

  return (
    <>
      {/* Dark overlay with optional spotlight */}
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px]">
        {/* Spotlight cutout around highlighted element */}
        {targetRect && (
          <div
            className="absolute border-2 border-primary rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]"
            style={{
              left: `${targetRect.left - 8}px`,
              top: `${targetRect.top - 8}px`,
              width: `${targetRect.width + 16}px`,
              height: `${targetRect.height + 16}px`,
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* Step-specific content - always centered */}
      {currentStep === 'connect-account' && <ConnectAccountStep />}
      {currentStep === 'signature' && <SignatureStep />}
      {currentStep === 'ai-write' && <AIWriteStep />}
      {currentStep === 'voice-message' && <VoiceMessageStep />}
      {currentStep === 'sms' && <SMSStep />}
      {currentStep === 'navigation' && <NavigationStep />}
    </>
  );
}
