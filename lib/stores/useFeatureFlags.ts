import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FeatureFlags {
  // Email Renderer V3
  useEmailRendererV3: boolean;

  // Future feature flags can be added here
  // useNewComposer: boolean;
  // useBetaSearch: boolean;
}

interface FeatureFlagStore extends FeatureFlags {
  toggleFeature: (feature: keyof FeatureFlags) => void;
  setFeature: (feature: keyof FeatureFlags, enabled: boolean) => void;
  resetToDefaults: () => void;
}

const defaultFlags: FeatureFlags = {
  useEmailRendererV3: false, // Start with V2 by default for safety
};

export const useFeatureFlags = create<FeatureFlagStore>()(
  persist(
    (set) => ({
      ...defaultFlags,

      toggleFeature: (feature) =>
        set((state) => ({
          [feature]: !state[feature],
        })),

      setFeature: (feature, enabled) =>
        set({
          [feature]: enabled,
        }),

      resetToDefaults: () => set(defaultFlags),
    }),
    {
      name: 'easemail-feature-flags',
    }
  )
);
