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
          "relative w-full h-10 rounded-lg transition-colors",
          "flex items-center justify-between px-3",
          "border border-border hover:bg-accent/50"
        )}
      >
        {/* Light Mode Side */}
        <div className={cn(
          "flex items-center gap-2 transition-colors",
          isLight ? "text-foreground font-medium" : "text-muted-foreground"
        )}>
          <Sun className="h-4 w-4" />
          <span className="text-sm">Corporate Grey</span>
        </div>

        {/* Dark Mode Side */}
        <div className={cn(
          "flex items-center gap-2 transition-colors",
          isDark ? "text-foreground font-medium" : "text-muted-foreground"
        )}>
          <span className="text-sm">Charcoal Dark</span>
          <Moon className="h-4 w-4" />
        </div>

        {/* Active Indicator */}
        <div 
          className={cn(
            "absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-md",
            "bg-primary/10 border border-primary/20 transition-all duration-200",
            isLight ? "left-1" : "right-1"
          )}
        />
      </button>

      {/* Current Theme Description */}
      <div className="text-xs text-muted-foreground">
        {currentTheme.description}
      </div>
    </div>
  );
}

