/**
 * useKeyboardShortcuts Hook
 * 
 * Implements Superhuman-style keyboard shortcuts for navigation
 * 
 * Shortcuts:
 * - g + i: Go to Inbox
 * - g + s: Go to Sent
 * - g + d: Go to Drafts
 * - g + t: Go to Trash
 * - g + a: Go to Archive
 * - c: Compose new email
 * - /: Focus search
 * - esc: Clear search / close modals
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface KeyboardShortcutsOptions {
  onCompose?: () => void;
  onSearch?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onCompose,
  onSearch,
  enabled = true,
}: KeyboardShortcutsOptions = {}) {
  const router = useRouter();
  const [waitingForSecondKey, setWaitingForSecondKey] = useState(false);
  const [lastKey, setLastKey] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Handle "g" for "go to" commands
      if (e.key === 'g' && !waitingForSecondKey) {
        e.preventDefault();
        setWaitingForSecondKey(true);
        setLastKey('g');
        console.log('⌨️ Waiting for second key...');
        
        // Reset after 2 seconds
        setTimeout(() => {
          setWaitingForSecondKey(false);
          setLastKey(null);
        }, 2000);
        return;
      }

      // Handle second key after "g"
      if (waitingForSecondKey && lastKey === 'g') {
        e.preventDefault();
        setWaitingForSecondKey(false);
        setLastKey(null);

        switch (e.key) {
          case 'i':
            console.log('⌨️ g+i: Go to Inbox');
            router.push('/inbox?folder=inbox');
            break;
          case 's':
            console.log('⌨️ g+s: Go to Sent');
            router.push('/inbox?folder=sent');
            break;
          case 'd':
            console.log('⌨️ g+d: Go to Drafts');
            router.push('/inbox?folder=drafts');
            break;
          case 't':
            console.log('⌨️ g+t: Go to Trash');
            router.push('/inbox?folder=trash');
            break;
          case 'a':
            console.log('⌨️ g+a: Go to Archive');
            router.push('/inbox?folder=archive');
            break;
          default:
            console.log('⌨️ Unknown shortcut: g+' + e.key);
        }
        return;
      }

      // Handle single-key shortcuts
      if (!waitingForSecondKey) {
        switch (e.key) {
          case 'c':
            e.preventDefault();
            console.log('⌨️ c: Compose');
            onCompose?.();
            break;
          case '/':
            e.preventDefault();
            console.log('⌨️ /: Focus search');
            onSearch?.();
            break;
          case 'Escape':
            console.log('⌨️ Esc: Clear');
            // Let components handle their own escape logic
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, waitingForSecondKey, lastKey, onCompose, onSearch, router]);

  return { waitingForSecondKey };
}

/**
 * Keyboard Shortcuts Help Component
 * Shows available shortcuts to the user
 */
export function KeyboardShortcutsHelp() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold mb-2">Navigation</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Go to Inbox</span>
            <kbd className="px-2 py-1 bg-muted rounded text-xs">g</kbd>
            <kbd className="px-2 py-1 bg-muted rounded text-xs ml-1">i</kbd>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Go to Sent</span>
            <kbd className="px-2 py-1 bg-muted rounded text-xs">g</kbd>
            <kbd className="px-2 py-1 bg-muted rounded text-xs ml-1">s</kbd>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Go to Drafts</span>
            <kbd className="px-2 py-1 bg-muted rounded text-xs">g</kbd>
            <kbd className="px-2 py-1 bg-muted rounded text-xs ml-1">d</kbd>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Go to Trash</span>
            <kbd className="px-2 py-1 bg-muted rounded text-xs">g</kbd>
            <kbd className="px-2 py-1 bg-muted rounded text-xs ml-1">t</kbd>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Actions</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Compose</span>
            <kbd className="px-2 py-1 bg-muted rounded text-xs">c</kbd>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Search</span>
            <kbd className="px-2 py-1 bg-muted rounded text-xs">/</kbd>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Close/Cancel</span>
            <kbd className="px-2 py-1 bg-muted rounded text-xs">Esc</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}

