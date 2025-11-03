'use client';

import { useEffect, useRef, useState } from 'react';
import { useOnboarding } from './OnboardingProvider';
import { OnboardingTooltip } from './OnboardingTooltip';
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
  const [highlightedRect, setHighlightedRect] = useState<DOMRect | null>(null);

  // Update highlighted element position
  useEffect(() => {
    if (!highlightedElement || !isActive) {
      setHighlightedRect(null);
      return;
    }

    const updatePosition = () => {
      const element = document.querySelector(highlightedElement);
      if (element) {
        const rect = element.getBoundingClientRect();
        setHighlightedRect(rect);
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [highlightedElement, isActive]);

  if (!isActive || !currentStep) {
    return null;
  }

  // Welcome and Complete are full-screen modals, not spotlight overlays
  if (currentStep === 'welcome') {
    return <WelcomeStep />;
  }

  if (currentStep === 'complete') {
    return <CompleteStep />;
  }

  return (
    <>
      {/* Dark overlay with spotlight cutout */}
      <div className="fixed inset-0 z-50 pointer-events-none">
        {/* Background overlay */}
        <div className="absolute inset-0 bg-black/60" />
        
        {/* Spotlight cutout */}
        {highlightedRect && (
          <div
            className="absolute bg-transparent ring-4 ring-primary ring-offset-4 ring-offset-black/60 rounded-lg pointer-events-auto"
            style={{
              left: `${highlightedRect.left - 8}px`,
              top: `${highlightedRect.top - 8}px`,
              width: `${highlightedRect.width + 16}px`,
              height: `${highlightedRect.height + 16}px`,
            }}
          />
        )}
      </div>

      {/* Step-specific content */}
      {currentStep === 'connect-account' && <ConnectAccountStep />}
      {currentStep === 'signature' && <SignatureStep />}
      {currentStep === 'ai-write' && <AIWriteStep />}
      {currentStep === 'voice-message' && <VoiceMessageStep />}
      {currentStep === 'sms' && <SMSStep />}
      {currentStep === 'navigation' && <NavigationStep />}
    </>
  );
}

