'use client';

import { OnboardingTooltip } from '../OnboardingTooltip';

export default function SMSStep() {
  return (
    <OnboardingTooltip
      title="Send SMS Messages"
      description="Reach your contacts via SMS directly from EaseMail. Navigate to the Contacts section to send text messages alongside your email communications."
      nextLabel="Next"
      highlightSelector="[data-onboarding='contacts-button']"
    />
  );
}
