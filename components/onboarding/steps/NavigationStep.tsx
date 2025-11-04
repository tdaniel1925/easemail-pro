'use client';

import { OnboardingTooltip } from '../OnboardingTooltip';

export default function NavigationStep() {
  return (
    <OnboardingTooltip
      title="Master Navigation"
      description="Use the sidebar to navigate between Inbox, Sent, Drafts, and other folders. Access Contacts, Calendar, and Settings from the navigation menu. Keyboard shortcuts are available for faster workflows."
      nextLabel="Complete Tour"
      highlightSelector="[data-onboarding='sidebar']"
    />
  );
}
