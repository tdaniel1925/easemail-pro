'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/lib/stores/theme-store';
import { themes, defaultTheme } from '@/lib/themes';

/**
 * ThemeInitializer
 * Ensures theme is properly initialized on app load
 * Forces validation of localStorage theme
 */
export function ThemeInitializer() {
  const { setTheme } = useThemeStore();

  useEffect(() => {
    // Force theme initialization
    const savedThemeId = localStorage.getItem('easemail-theme');
    const validThemeIds = themes.map(t => t.id); // ['light-grey', 'charcoal']
    
    console.log('🎨 Theme Init - Saved:', savedThemeId);
    console.log('🎨 Theme Init - Valid themes:', validThemeIds);
    
    // Validate saved theme
    if (savedThemeId && validThemeIds.includes(savedThemeId)) {
      console.log('✅ Theme valid, applying:', savedThemeId);
      setTheme(savedThemeId);
    } else {
      console.log('❌ Theme invalid or missing, forcing default');
      // Clear invalid theme
      localStorage.removeItem('easemail-theme');
      // Force default theme
      setTheme(defaultTheme.id);
    }
  }, [setTheme]);

  return null; // This component doesn't render anything
}

