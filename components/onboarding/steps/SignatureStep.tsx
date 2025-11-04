'use client';

import { OnboardingTooltip } from '../OnboardingTooltip';

export default function SignatureStep() {
  return (
    <OnboardingTooltip
      title="Create Professional Signatures"
      description="Add professional email signatures to your messages. Navigate to Settings to create custom signatures with your contact information, logo, and branding."
      nextLabel="Next"
      screenshotUrl="/onboarding/signature-settings.png"
      screenshotAlt="Email signature settings page"
      screenshotCaption="Manage signatures in Settings"
    />
  );
}
