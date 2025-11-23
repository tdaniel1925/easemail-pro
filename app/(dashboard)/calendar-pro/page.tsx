/**
 * Calendar Pro - World-Class Calendar Experience
 * Rivals Outlook and Superhuman with AI-powered intelligence
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from '@/contexts/AccountContext';
import CalendarProLayout from '@/components/calendar-pro/CalendarProLayout';
import CommandPalette from '@/components/calendar-pro/CommandPalette';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { CalendarProvider } from '@/contexts/CalendarProContext';

export default function CalendarProPage() {
  const { selectedAccount, accounts, isLoading } = useAccount();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Global keyboard shortcut for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading Calendar Pro...</p>
        </div>
      </div>
    );
  }

  if (!selectedAccount) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-2">No Account Selected</h2>
          <p className="text-muted-foreground mb-4">
            Please connect an account to use Calendar Pro
          </p>
        </div>
      </div>
    );
  }

  return (
    <CalendarProvider accountId={selectedAccount.id} grantId={selectedAccount.nylasGrantId || ''}>
      <div className="h-screen flex flex-col overflow-hidden bg-background">
        <CalendarProLayout />
        <CommandPalette
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
        />
      </div>
    </CalendarProvider>
  );
}
