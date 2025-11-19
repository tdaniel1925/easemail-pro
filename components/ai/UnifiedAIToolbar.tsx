/**
 * Unified AI Toolbar
 * 
 * Single toolbar combining all 4 AI features:
 * - AI Write
 * - AI Remix
 * - Dictate (Inline)
 * - Voice Message (Inline)
 */

'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Wand2, Mic, VoicemailIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AIWriteModal } from './AIWriteModal';
import { AIRemixPanel } from './AIRemixPanel';
import { DictationDialog } from './DictationDialog';
import { InlineDictationWidget } from '@/components/audio/InlineDictationWidget';
import { InlineVoiceMessageWidget } from '@/components/audio/InlineVoiceMessageWidget';
import { cn } from '@/lib/utils';

interface UnifiedAIToolbarProps {
  // Email content
  subject: string;
  body: string;
  onSubjectChange: (subject: string) => void;
  onBodyChange: (body: string) => void;
  
  // Context
  recipientEmail?: string;
  recipientName?: string;
  
  // User tier for dictation
  userTier?: 'free' | 'pro' | 'business';
  
  // Attachment handler for voice messages
  onAttachVoiceMessage?: (file: File, duration: number) => void;
  
  // Styling
  className?: string;
}

export function UnifiedAIToolbar({
  subject,
  body,
  onSubjectChange,
  onBodyChange,
  recipientEmail,
  recipientName,
  userTier = 'free',
  onAttachVoiceMessage,
  className,
}: UnifiedAIToolbarProps) {
  const [showAIWrite, setShowAIWrite] = useState(false);
  const [showAIRemix, setShowAIRemix] = useState(false);
  const [showDictationDialog, setShowDictationDialog] = useState(false);
  const [dictatedText, setDictatedText] = useState('');
  
  // Inline widget states
  const [showInlineDictation, setShowInlineDictation] = useState(false);
  const [showInlineVoiceMessage, setShowInlineVoiceMessage] = useState(false);

  const hasContent = body.trim().length > 0;

  const handleAIWrite = (generatedSubject: string, generatedBody: string) => {
    onSubjectChange(generatedSubject);
    onBodyChange(generatedBody);
  };

  const handleAIRemix = (remixedBody: string) => {
    onBodyChange(remixedBody);
  };

  // Handle dictation completion
  const handleDictationComplete = (text: string) => {
    setShowInlineDictation(false);
    setDictatedText(text);
    setShowDictationDialog(true);
  };

  // Handle dictation cancellation
  const handleDictationCancel = () => {
    setShowInlineDictation(false);
  };

  // Handle "Use As-Is" from dialog
  const handleUseAsIs = (text: string) => {
    // Prepend text at the top (before existing content)
    const separator = body.trim() ? '\n\n' : '';
    onBodyChange(text + separator + body.trim());
  };

  // Handle "Use Polished" from dialog
  const handleUsePolished = (polishedSubject: string, polishedText: string) => {
    console.log('[UnifiedAIToolbar] Received polished text:', {
      currentBody: body,
      polishedSubject,
      polishedText: polishedText.substring(0, 100) + '...'
    });
    onSubjectChange(polishedSubject);
    // Prepend polished text at the top (before existing content like signature)
    const separator = body.trim() ? '\n\n' : '';
    const newBody = polishedText + separator + body.trim();
    console.log('[UnifiedAIToolbar] Setting new body:', newBody.substring(0, 100) + '...');
    onBodyChange(newBody);
  };

  // Handle voice message attachment
  const handleVoiceAttach = (file: File, duration: number) => {
    setShowInlineVoiceMessage(false);
    onAttachVoiceMessage?.(file, duration);
  };

  // Handle voice message cancellation  
  const handleVoiceCancel = () => {
    setShowInlineVoiceMessage(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+W: AI Write
      if (e.ctrlKey && e.shiftKey && e.key === 'W') {
        e.preventDefault();
        setShowAIWrite(true);
      }
      // Ctrl+Shift+R: AI Remix
      else if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        if (hasContent) {
          setShowAIRemix(true);
        }
      }
      // Ctrl+Shift+D: Dictate (toggle inline widget)
      else if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setShowInlineDictation(prev => !prev);
      }
      // Ctrl+Shift+M: Voice Message (toggle inline widget)
      else if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        setShowInlineVoiceMessage(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasContent]);

  return (
    <>
      {/* Inline Widgets (appear above toolbar) */}
      {showInlineDictation && (
        <InlineDictationWidget
          onComplete={handleDictationComplete}
          onCancel={handleDictationCancel}
          userTier={userTier}
        />
      )}

      {showInlineVoiceMessage && (
        <InlineVoiceMessageWidget
          onAttach={handleVoiceAttach}
          onCancel={handleVoiceCancel}
        />
      )}

      {/* Toolbar */}
      <div className={cn('flex items-center gap-2 p-3 border-t border-border bg-card', className)}>
        {/* AI Write */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAIWrite(true)}
          className="hover:bg-accent"
          title="Generate email with AI (Ctrl+Shift+W)"
        >
          <Sparkles className="w-4 h-4 mr-2 text-primary" />
          <span className="hidden sm:inline">AI Write</span>
        </Button>

        {/* AI Remix */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAIRemix(true)}
          disabled={!hasContent}
          className="hover:bg-accent"
          title="Transform your draft (Ctrl+Shift+R)"
        >
          <Wand2 className="w-4 h-4 mr-2 text-primary" />
          <span className="hidden sm:inline">AI Remix</span>
        </Button>

        {/* Dictate - Toggle Inline Widget */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowInlineDictation(!showInlineDictation)}
          className={cn(
            "hover:bg-accent",
            showInlineDictation && "bg-accent"
          )}
          title="Dictate email (Ctrl+Shift+D)"
        >
          <Mic className="w-4 h-4 mr-2 text-primary" />
          <span className="hidden sm:inline">Dictate</span>
        </Button>

        {/* Voice Message - Toggle Inline Widget */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowInlineVoiceMessage(!showInlineVoiceMessage)}
          className={cn(
            "hover:bg-accent",
            showInlineVoiceMessage && "bg-accent"
          )}
          title="Record voice message (Ctrl+Shift+M)"
        >
          <VoicemailIcon className="w-4 h-4 mr-2 text-primary" />
          <span className="hidden sm:inline">Voice Message</span>
        </Button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Feature Labels (Desktop) */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <div className="relative">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <div className="absolute inset-0 h-2 w-2 rounded-full bg-green-500 animate-ping opacity-75" />
            </div>
            AI-Powered
          </span>
        </div>
      </div>

      {/* Modals */}
      <AIWriteModal
        isOpen={showAIWrite}
        onClose={() => setShowAIWrite(false)}
        onGenerate={handleAIWrite}
        context={{
          recipientEmail,
          recipientName,
          subject,
        }}
      />

      <AIRemixPanel
        isOpen={showAIRemix}
        onClose={() => setShowAIRemix(false)}
        currentContent={body}
        onApply={handleAIRemix}
      />

      {/* Dictation Dialog */}
      <DictationDialog
        isOpen={showDictationDialog}
        onClose={() => setShowDictationDialog(false)}
        dictatedText={dictatedText}
        onUseAsIs={handleUseAsIs}
        onUsePolished={handleUsePolished}
        recipientName={recipientName}
      />
    </>
  );
}

/**
 * Keyboard Shortcuts Handler
 * Add this to your layout or composer
 */
export function AIToolbarShortcuts({ toolbar }: { toolbar: HTMLDivElement | null }) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!toolbar) return;

      // Ctrl+Shift+W - AI Write
      if (e.ctrlKey && e.shiftKey && e.key === 'W') {
        e.preventDefault();
        (toolbar.querySelector('[title*="AI Write"]') as HTMLElement)?.click();
      }

      // Ctrl+Shift+R - AI Remix
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        (toolbar.querySelector('[title*="AI Remix"]') as HTMLElement)?.click();
      }

      // Ctrl+D - Dictate
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        (toolbar.querySelector('[title*="Dictate"]') as HTMLElement)?.click();
      }

      // Ctrl+Shift+M - Voice Message
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        (toolbar.querySelector('[title*="Voice Message"]') as HTMLElement)?.click();
      }
    };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [toolbar]);

return null;
}

