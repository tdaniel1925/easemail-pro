'use client';

import { useState } from 'react';
import { Settings, Palette, User, LogOut, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ThemeSelector from '@/components/theme/ThemeSelector';

interface SettingsMenuProps {
  onLogout?: () => void;
  onNavigate?: (path: string) => void;
}

export default function SettingsMenu({ onLogout, onNavigate }: SettingsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);

  return (
    <div className="relative">
      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute bottom-full left-0 mb-1 w-full bg-card border border-border rounded-md shadow-lg z-50 overflow-hidden">
            <div className="py-1">
              {showThemeSelector ? (
                <div className="px-3 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Color Theme</span>
                    <button 
                      onClick={() => setShowThemeSelector(false)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Back
                    </button>
                  </div>
                  <ThemeSelector />
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setShowThemeSelector(true)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent text-muted-foreground transition-colors"
                  >
                    <Palette className="h-4 w-4" />
                    <span>Color Theme</span>
                  </button>
                  <button
                    onClick={() => {
                      onNavigate?.('/settings');
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent text-muted-foreground transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      onNavigate?.('/profile');
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent text-muted-foreground transition-colors"
                  >
                    <User className="h-4 w-4" />
                    <span>Profile</span>
                  </button>
                  <div className="border-t border-border my-1"></div>
                  <button
                    onClick={() => {
                      onLogout?.();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent text-muted-foreground transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Settings Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors",
          isOpen ? "bg-accent" : "hover:bg-accent text-muted-foreground"
        )}
      >
        <Settings className="h-4 w-4" />
        <span className="flex-1 text-left">Settings</span>
        <ChevronUp className={cn(
          "h-4 w-4 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>
    </div>
  );
}

