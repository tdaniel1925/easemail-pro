'use client';

import { useEffect } from 'react';
import { Check } from 'lucide-react';
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

  const handleThemeChange = (themeId: string) => {
    setTheme(themeId);
  };

  return (
    <div className="space-y-1 max-h-[400px] overflow-y-auto">
      {themes.map((theme) => (
        <button
          key={theme.id}
          onClick={() => handleThemeChange(theme.id)}
          className={cn(
            "w-full text-left px-3 py-2.5 rounded-md transition-colors",
            "hover:bg-accent/50",
            currentTheme.id === theme.id && "bg-accent"
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-5 h-5 mt-0.5 flex-shrink-0">
              {currentTheme.id === theme.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{theme.name}</div>
              <div className="text-xs text-muted-foreground line-clamp-1">
                {theme.description}
              </div>
            </div>
            <div className="flex gap-1 mt-1 flex-shrink-0">
              {/* Color preview dots */}
              <div
                className="w-3 h-3 rounded-full border border-border"
                style={{
                  backgroundColor: `hsl(${theme.colors.background})`,
                }}
              />
              <div
                className="w-3 h-3 rounded-full border border-border"
                style={{
                  backgroundColor: `hsl(${theme.colors.primary})`,
                }}
              />
              <div
                className="w-3 h-3 rounded-full border border-border"
                style={{
                  backgroundColor: `hsl(${theme.colors.card})`,
                }}
              />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

