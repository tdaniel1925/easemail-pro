/**
 * Unified AI Toolbar
 * 
 * Single toolbar combining all 4 AI features:
 * - AI Write
 * - AI Remix
 * - Dictate
 * - Voice Message
 */

'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Wand2, Mic, VoicemailIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AIWriteModal } from './AIWriteModal';
import { AIRemixPanel } from './AIRemixPanel';
import { DictateButton } from './DictateButton';
import { DictationDialog } from './DictationDialog'; // ✅ NEW
import { VoiceMessageRecorderModal } from './VoiceMessageRecorder';
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
  const [showVoiceMessage, setShowVoiceMessage] = useState(false);
  const [showDictationDialog, setShowDictationDialog] = useState(false); // ✅ NEW
  const [dictatedText, setDictatedText] = useState(''); // ✅ NEW
  const [dictationInterim, setDictationInterim] = useState(''); // ✅ Track interim text
  const [isListening, setIsListening] = useState(false); // ✅ Track dictation state

  const hasContent = body.trim().length > 0;

  const handleAIWrite = (generatedSubject: string, generatedBody: string) => {
    onSubjectChange(generatedSubject);
    onBodyChange(generatedBody);
  };

  const handleAIRemix = (remixedBody: string) => {
    onBodyChange(remixedBody);
  };

  // ✅ NEW: Handle dictation completion (when user stops recording)
  const handleDictationComplete = (fullText: string) => {
    // Remove any interim text that was showing
    const cleanBody = body.replace(dictationInterim, '').trim();
    onBodyChange(cleanBody);
    setDictationInterim('');
    
    // Show dialog with the complete transcript
    setDictatedText(fullText);
    setShowDictationDialog(true);
  };

  // ✅ NEW: Handle "Use As-Is" from dialog
  const handleUseAsIs = (text: string) => {
    // Append the raw dictated text to the body (add space before if body not empty)
    const separator = body.trim() ? ' ' : '';
    onBodyChange(body.trim() + separator + text);
  };

  // ✅ NEW: Handle "Use Polished" from dialog
  const handleUsePolished = (subject: string, polishedText: string) => {
    // Set both subject and body
    onSubjectChange(subject);
    // Append the AI-polished text to the body (add space before if body not empty)
    const separator = body.trim() ? ' ' : '';
    onBodyChange(body.trim() + separator + polishedText);
  };

  // ✅ Real-time transcript (shows interim, but doesn't commit to body)
  const handleDictateTranscript = (text: string, isFinal: boolean) => {
    // NOTE: We're NOT adding final text to body anymore - that happens via the dialog
    // We only show interim text for visual feedback during dictation
    if (!isFinal) {
      // Interim: Replace previous interim text (update in place for visual feedback)
      const cleanBody = body.replace(dictationInterim, '');
      onBodyChange(cleanBody + text);
      setDictationInterim(text);
    } else {
      // Final: Just remove interim text, actual insertion happens via dialog
      const cleanBody = body.replace(dictationInterim, '');
      onBodyChange(cleanBody);
      setDictationInterim('');
    }
  };

  const handleVoiceAttach = (file: File, duration: number) => {
    onAttachVoiceMessage?.(file, duration);
  };

  // ✅ Keyboard shortcuts
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
      // Ctrl+Shift+M: Voice Message
      else if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        setShowVoiceMessage(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasContent]);

  return (
    <>
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

        {/* Dictate */}
        <DictateButton
          onTranscript={handleDictateTranscript}
          onDictationComplete={handleDictationComplete} // ✅ NEW
          userTier={userTier}
          className="hover:bg-accent"
        />

        {/* Voice Message */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowVoiceMessage(true)}
          className="hover:bg-accent"
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

      <VoiceMessageRecorderModal
        isOpen={showVoiceMessage}
        onClose={() => setShowVoiceMessage(false)}
        onAttach={handleVoiceAttach}
      />

      {/* ✅ NEW: Dictation Dialog */}
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
