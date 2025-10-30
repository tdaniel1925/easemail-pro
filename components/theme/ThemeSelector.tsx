'use client';

import { useEffect } from 'react';
import { Palette, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useThemeStore } from '@/lib/stores/theme-store';
import { themes } from '@/lib/themes';

export default function ThemeSelector() {
  const { currentTheme, setTheme, applyTheme } = useThemeStore();

  // Apply theme on mount and load from localStorage
  useEffect(() => {
    const savedThemeId = localStorage.getItem('easemail-theme');
    if (savedThemeId) {
      setTheme(savedThemeId);
    } else {
      applyTheme(currentTheme);
    }
  }, []);

  const handleThemeChange = (themeId: string) => {
    setTheme(themeId);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Palette className="h-5 w-5" />
          <span className="sr-only">Select theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Color Themes
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themes.map((theme) => (
          <DropdownMenuItem
            key={theme.id}
            onClick={() => handleThemeChange(theme.id)}
            className="cursor-pointer"
          >
            <div className="flex items-start gap-3 w-full">
              <div className="flex items-center justify-center w-5 h-5 mt-0.5">
                {currentTheme.id === theme.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium">{theme.name}</div>
                <div className="text-xs text-muted-foreground">
                  {theme.description}
                </div>
              </div>
              <div className="flex gap-1 mt-1">
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
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

