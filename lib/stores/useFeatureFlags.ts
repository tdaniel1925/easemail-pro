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
  loadFromAPI: () => Promise<void>;
  saveToAPI: (flags: Partial<FeatureFlags>) => Promise<boolean>;
}

const defaultFlags: FeatureFlags = {
  useEmailRendererV3: true, // Use V3 renderer with SimpleEmailViewer
};

export const useFeatureFlags = create<FeatureFlagStore>()(
  persist(
    (set, get) => ({
      ...defaultFlags,

      toggleFeature: async (feature) => {
        const newValue = !get()[feature];
        set({ [feature]: newValue });

        // Save to API
        await get().saveToAPI({ [feature]: newValue });
      },

      setFeature: async (feature, enabled) => {
        set({ [feature]: enabled });

        // Save to API
        await get().saveToAPI({ [feature]: enabled });
      },

      resetToDefaults: async () => {
        set(defaultFlags);

        // Save to API
        await get().saveToAPI(defaultFlags);
      },

      loadFromAPI: async () => {
        try {
          const response = await fetch('/api/user/preferences');
          const data = await response.json();

          if (data.success && data.preferences) {
            set({
              useEmailRendererV3: data.preferences.useEmailRendererV3 ?? true,
            });
          }
        } catch (error) {
          console.error('Failed to load feature flags from API:', error);
        }
      },

      saveToAPI: async (flags: Partial<FeatureFlags>) => {
        try {
          const response = await fetch('/api/user/preferences', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(flags),
          });

          const data = await response.json();
          return data.success === true;
        } catch (error) {
          console.error('Failed to save feature flags to API:', error);
          return false;
        }
      },
    }),
    {
      name: 'easemail-feature-flags',
    }
  )
);
