/**
 * Example: Email Composer with Dictation Integration
 * 
 * Shows how to use the DictateButton in your EmailCompose component
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { DictateButton, DictationWidget } from '@/components/ai/DictateButton';
import { InlineUpgradePrompt } from '@/components/ai/DictationUpgradeModal';
import { useDictationUsage } from '@/lib/ai/dictation-usage';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

export function EmailComposeWithDictation() {
  const [emailContent, setEmailContent] = useState('');
  const [interimText, setInterimText] = useState('');
  const [isDictating, setIsDictating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Get user's dictation usage and tier
  const { tier, remaining, canUse } = useDictationUsage();

  // Handle transcription results
  const handleTranscript = (text: string, isFinal: boolean) => {
    if (isFinal) {
      // Insert final text at cursor position
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const before = emailContent.substring(0, start);
        const after = emailContent.substring(end);
        
        setEmailContent(before + text + after);
        
        // Move cursor to end of inserted text
        setTimeout(() => {
          const newPosition = start + text.length;
          textarea.selectionStart = newPosition;
          textarea.selectionEnd = newPosition;
          textarea.focus();
        }, 0);
      } else {
        // Fallback: append to end
        setEmailContent(prev => prev + text);
      }
      
      setInterimText('');
    } else {
      // Show interim text (preview while speaking)
      setInterimText(text);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Compose Email</h2>
      
      {/* Upgrade prompt if needed */}
      <InlineUpgradePrompt 
        remainingMinutes={remaining.monthly} 
        tier={tier} 
      />

      <div className="space-y-4 mt-4">
        {/* Subject */}
        <div>
          <label className="block text-sm font-medium mb-2">Subject</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Email subject..."
          />
        </div>

        {/* Email Body with Dictation */}
        <div>
          <label className="block text-sm font-medium mb-2">Message</label>
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={emailContent}
              onChange={(e) => setEmailContent(e.target.value)}
              className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Type your message or use dictation..."
            />
            
            {/* Interim text overlay */}
            {interimText && (
              <div className="absolute bottom-2 left-2 right-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded text-sm text-gray-600 italic pointer-events-none">
                {interimText}...
              </div>
            )}
          </div>
        </div>

        {/* Toolbar with Dictate Button */}
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <div className="flex items-center gap-2">
            {/* Dictate Button */}
            <DictateButton
              onTranscript={handleTranscript}
              disabled={!canUse}
              userTier={tier}
            />
            
            {/* Other buttons */}
            <Button variant="ghost" size="sm">
              📎 Attach
            </Button>
            <Button variant="ghost" size="sm">
              😊 Emoji
            </Button>
          </div>

          {/* Send Button */}
          <Button>
            <Send className="w-4 h-4 mr-2" />
            Send Email
          </Button>
        </div>
      </div>

      {/* Floating dictation widget */}
      <DictationWidget
        isActive={isDictating}
        interimText={interimText}
        onStop={() => setIsDictating(false)}
      />
    </div>
  );
}

/**
 * Keyboard Shortcuts for Dictation
 * Add this to your root layout or composer component
 */
export function DictationKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+D or Cmd+D to toggle dictation
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        // Toggle dictation
        const dictateButton = document.querySelector('[data-dictate-button]');
        if (dictateButton) {
          (dictateButton as HTMLButtonElement).click();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return null;
}

