import { create } from 'zustand';
import { themes, defaultTheme, type Theme } from '@/lib/themes';

interface ThemeStore {
  currentTheme: Theme;
  setTheme: (themeId: string) => void;
  applyTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeStore>()((set) => ({
  currentTheme: defaultTheme,
  setTheme: (themeId: string) => {
    const theme = themes.find((t) => t.id === themeId) || defaultTheme;
    set({ currentTheme: theme });
    
    // Apply theme to CSS variables
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      Object.entries(theme.colors).forEach(([key, value]) => {
        const cssVarName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
        root.style.setProperty(cssVarName, value);
      });
      
      // Save to localStorage
      localStorage.setItem('easemail-theme', themeId);
    }
  },
  applyTheme: (theme: Theme) => {
    set({ currentTheme: theme });
    
    // Apply theme to CSS variables
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      Object.entries(theme.colors).forEach(([key, value]) => {
        const cssVarName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
        root.style.setProperty(cssVarName, value);
      });
    }
  },
}));

