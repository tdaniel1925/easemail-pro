'use client';

import { useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '@/lib/stores/theme-store';
import { themes } from '@/lib/themes';
import { cn } from '@/lib/utils';

export default function ThemeSelector() {
  const { currentTheme, setTheme } = useThemeStore();

  // Apply theme immediately on mount from localStorage (prevents flash)
  useEffect(() => {
    const savedThemeId = localStorage.getItem('easemail-theme');
    if (savedThemeId) {
      const savedTheme = themes.find(t => t.id === savedThemeId);
      if (savedTheme) {
        // Apply immediately before React renders
        Object.entries(savedTheme.colors).forEach(([key, value]) => {
          const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
          document.documentElement.style.setProperty(cssVar, value);
        });
      }
      setTheme(savedThemeId);
    }
  }, []);

  const isLight = currentTheme.id === 'light-grey';
  const isDark = currentTheme.id === 'charcoal';

  const toggleTheme = () => {
    const newThemeId = isLight ? 'charcoal' : 'light-grey';
    setTheme(newThemeId);
  };

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Theme
      </div>
      
      {/* Toggle Switch */}
      <button
        onClick={toggleTheme}
        className={cn(
          "relative w-full h-12 rounded-lg transition-colors",
          "flex items-center justify-around px-4",
          "border border-border hover:bg-accent/50"
        )}
      >
        {/* Light Mode Icon */}
        <div className={cn(
          "flex items-center justify-center transition-all z-10",
          isLight ? "text-foreground scale-110" : "text-muted-foreground scale-90"
        )}>
          <Sun className="h-5 w-5" />
        </div>

        {/* Dark Mode Icon */}
        <div className={cn(
          "flex items-center justify-center transition-all z-10",
          isDark ? "text-foreground scale-110" : "text-muted-foreground scale-90"
        )}>
          <Moon className="h-5 w-5" />
        </div>

        {/* Active Indicator */}
        <div 
          className={cn(
            "absolute top-1.5 bottom-1.5 w-[calc(50%-8px)] rounded-md",
            "bg-primary/10 border border-primary/20 transition-all duration-200",
            isLight ? "left-1.5" : "right-1.5"
          )}
        />
      </button>

      {/* Current Theme Description */}
      <div className="text-xs text-muted-foreground text-center">
        {currentTheme.name}
      </div>
    </div>
  );
}

