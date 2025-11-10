'use client';

import { useEffect } from 'react';
import { Sun, Moon, Sparkles } from 'lucide-react';
import { useThemeStore } from '@/lib/stores/theme-store';
import { themes } from '@/lib/themes';
import { cn } from '@/lib/utils';

export default function ThemeSelector() {
  const { currentTheme, setTheme } = useThemeStore();

  // Apply theme immediately on mount from localStorage (prevents flash)
  useEffect(() => {
    const savedThemeId = localStorage.getItem('easemail-theme');
    const validThemeIds = themes.map(t => t.id);

    // Validate saved theme is one of the valid themes
    let themeToApply = savedThemeId && validThemeIds.includes(savedThemeId)
      ? savedThemeId
      : 'light-grey'; // Default to Corporate Grey

    const themeToUse = themes.find(t => t.id === themeToApply);

    if (themeToUse) {
      // Apply immediately before React renders
      Object.entries(themeToUse.colors).forEach(([key, value]) => {
        const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
        document.documentElement.style.setProperty(cssVar, value);
      });

      // Update store and localStorage with valid theme
      setTheme(themeToApply);
    } else {
      // Fallback: force Corporate Grey and clear bad localStorage
      localStorage.removeItem('easemail-theme');
      setTheme('light-grey');
    }
  }, []);

  const handleThemeChange = (themeId: string) => {
    setTheme(themeId);
  };

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Theme
      </div>

      {/* Theme Options */}
      <div className="flex items-center gap-2">
        {/* Light Theme Button */}
        <button
          onClick={() => handleThemeChange('light-grey')}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-2 h-20 rounded-lg transition-all",
            "border hover:bg-accent/50",
            currentTheme.id === 'light-grey'
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-border"
          )}
          aria-label="Corporate Grey theme"
        >
          <Sun className={cn(
            "h-5 w-5 transition-all",
            currentTheme.id === 'light-grey'
              ? "text-primary scale-110"
              : "text-muted-foreground"
          )} />
          <span className={cn(
            "text-xs font-medium transition-colors",
            currentTheme.id === 'light-grey'
              ? "text-foreground"
              : "text-muted-foreground"
          )}>
            Light
          </span>
        </button>

        {/* Dark Theme Button */}
        <button
          onClick={() => handleThemeChange('charcoal')}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-2 h-20 rounded-lg transition-all",
            "border hover:bg-accent/50",
            currentTheme.id === 'charcoal'
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-border"
          )}
          aria-label="Charcoal Dark theme"
        >
          <Moon className={cn(
            "h-5 w-5 transition-all",
            currentTheme.id === 'charcoal'
              ? "text-primary scale-110"
              : "text-muted-foreground"
          )} />
          <span className={cn(
            "text-xs font-medium transition-colors",
            currentTheme.id === 'charcoal'
              ? "text-foreground"
              : "text-muted-foreground"
          )}>
            Dark
          </span>
        </button>

        {/* Relaxed Theme Button */}
        <button
          onClick={() => handleThemeChange('relaxed')}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-2 h-20 rounded-lg transition-all",
            "border hover:bg-accent/50",
            currentTheme.id === 'relaxed'
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-border"
          )}
          aria-label="Relaxed View theme"
        >
          <Sparkles className={cn(
            "h-5 w-5 transition-all",
            currentTheme.id === 'relaxed'
              ? "text-primary scale-110"
              : "text-muted-foreground"
          )} />
          <span className={cn(
            "text-xs font-medium transition-colors",
            currentTheme.id === 'relaxed'
              ? "text-foreground"
              : "text-muted-foreground"
          )}>
            Relaxed
          </span>
        </button>
      </div>

      {/* Current Theme Description */}
      <div className="text-xs text-muted-foreground text-center">
        {currentTheme.description}
      </div>
    </div>
  );
}

