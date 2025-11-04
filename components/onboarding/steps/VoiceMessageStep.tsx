'use client';

import { OnboardingTooltip } from '../OnboardingTooltip';

export default function VoiceMessageStep() {
  return (
    <OnboardingTooltip
      title="Record Voice Messages"
      description="Send quick voice messages directly from your email. Perfect for personal touches or when typing isn't convenient. Voice messages can be attached to any email."
      nextLabel="Next"
    />
  );
}
