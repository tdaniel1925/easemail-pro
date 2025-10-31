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

import { useState } from 'react';
import { Sparkles, Wand2, Mic, VoicemailIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AIWriteModal } from './AIWriteModal';
import { AIRemixPanel } from './AIRemixPanel';
import { DictateButton } from './DictateButton';
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

  const hasContent = body.trim().length > 0;

  const handleAIWrite = (generatedSubject: string, generatedBody: string) => {
    onSubjectChange(generatedSubject);
    onBodyChange(generatedBody);
  };

  const handleAIRemix = (remixedBody: string) => {
    onBodyChange(remixedBody);
  };

  const handleDictateTranscript = (text: string, isFinal: boolean) => {
    if (isFinal) {
      onBodyChange(body + text);
    }
  };

  const handleVoiceAttach = (file: File, duration: number) => {
    onAttachVoiceMessage?.(file, duration);
  };

  return (
    <>
      <div className={cn('flex items-center gap-2 p-3 border-t border-gray-200 bg-white', className)}>
        {/* AI Write */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAIWrite(true)}
          className="hover:bg-blue-50"
          title="Generate email with AI (Ctrl+Shift+W)"
        >
          <Sparkles className="w-4 h-4 mr-2 text-blue-600" />
          <span className="hidden sm:inline">AI Write</span>
        </Button>

        {/* AI Remix */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAIRemix(true)}
          disabled={!hasContent}
          className="hover:bg-purple-50"
          title="Transform your draft (Ctrl+Shift+R)"
        >
          <Wand2 className="w-4 h-4 mr-2 text-purple-600" />
          <span className="hidden sm:inline">AI Remix</span>
        </Button>

        {/* Dictate */}
        <DictateButton
          onTranscript={handleDictateTranscript}
          userTier={userTier}
          className="hover:bg-green-50"
        />

        {/* Voice Message */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowVoiceMessage(true)}
          className="hover:bg-orange-50"
          title="Record voice message (Ctrl+Shift+M)"
        >
          <VoicemailIcon className="w-4 h-4 mr-2 text-orange-600" />
          <span className="hidden sm:inline">Voice Message</span>
        </Button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Feature Labels (Desktop) */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
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

import { useEffect } from 'react';

