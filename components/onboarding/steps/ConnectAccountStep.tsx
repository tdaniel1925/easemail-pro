'use client';

import { OnboardingTooltip } from '../OnboardingTooltip';

export default function ConnectAccountStep() {
  return (
    <OnboardingTooltip
      title="Connect Your Email Account"
      description="Get started by connecting your email account. Click the 'Add Account' button at the bottom of the sidebar to link Gmail, Outlook, or any IMAP email provider."
      nextLabel="Next"
      showBack={false}
      highlightSelector="[data-onboarding='add-account-button']"
      screenshotUrl="/onboarding/connect-account.png"
      screenshotAlt="Add Account button location in sidebar"
      screenshotCaption="Click 'Add Account' at the bottom of the sidebar"
    />
  );
}
