'use client';

import { useEffect } from 'react';
import { useOnboarding } from '../OnboardingProvider';
import { OnboardingTooltip } from '../OnboardingTooltip';

export default function AIWriteStep() {
  const { setHighlightedElement } = useOnboarding();

  useEffect(() => {
    // Highlight the Compose button
    setHighlightedElement('[data-onboarding="compose-button"]');
    return () => setHighlightedElement(null);
  }, [setHighlightedElement]);

  // Position near Compose button (top of sidebar)
  return (
    <div className="fixed z-[60] left-[280px] top-[140px] max-w-[420px]">
      <OnboardingTooltip
        title="AI-Powered Email Writing"
        description="Click the big 'Compose' button at the top of the sidebar to write a new email. Then use the sparkle icon (⚡) in the toolbar to generate professional emails from simple prompts using AI."
        nextLabel="Next: Voice Features"
        showBack={true}
      />
    </div>
  );
}
