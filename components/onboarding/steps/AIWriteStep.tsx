'use client';

import { OnboardingTooltip } from '../OnboardingTooltip';

export default function AIWriteStep() {
  return (
    <OnboardingTooltip
      title="AI-Powered Email Writing"
      description="Compose emails faster with AI assistance. When composing a new email, use the AI features to draft professional messages, summarize content, and improve your writing."
      nextLabel="Next"
      highlightSelector="[data-onboarding='compose-button']"
      screenshotUrl="/onboarding/ai-compose.png"
      screenshotAlt="AI compose window with writing features"
      screenshotCaption="AI assistance in the compose window"
    />
  );
}
