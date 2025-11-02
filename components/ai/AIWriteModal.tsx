/**
 * AI Write Modal Component
 * 
 * Modal for generating emails using AI
 * Supports: prompts, bullet points, and templates
 */

'use client';

import { useState } from 'react';
import { X, Sparkles, List, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { 
  EMAIL_TEMPLATES,
  type ToneType,
  type LengthType,
  getToneDescription,
  getLengthDescription,
} from '@/lib/ai/ai-write-service';
import { cn } from '@/lib/utils';

interface AIWriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (subject: string, body: string) => void;
  context?: {
    recipientEmail?: string;
    recipientName?: string;
    subject?: string;
  };
}

type InputMethod = 'prompt' | 'bullets' | 'template';

export function AIWriteModal({
  isOpen,
  onClose,
  onGenerate,
  context,
}: AIWriteModalProps) {
  const [method, setMethod] = useState<InputMethod>('prompt');
  const [content, setContent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [tone, setTone] = useState<ToneType>('professional');
  const [length, setLength] = useState<LengthType>('normal');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!content.trim() && method !== 'template') {
      setError('Please enter some content');
      return;
    }

    if (method === 'template' && !selectedTemplate) {
      setError('Please select a template');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/write', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method,
          content,
          templateId: selectedTemplate || undefined,
          context,
          preferences: {
            tone,
            length,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to generate email');
      }

      const data = await response.json();
      onGenerate(data.email.subject, data.email.body);
      onClose();
      
      // Reset form
      setContent('');
      setSelectedTemplate('');
      
    } catch (error: any) {
      console.error('Generation error:', error);
      setError(error.message || 'Failed to generate email');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6" />
              <div>
                <h2 className="text-2xl font-bold">AI Write</h2>
                <p className="text-sm opacity-90">Generate complete email drafts instantly</p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Method Selection */}
          <div>
            <label className="block text-sm font-medium mb-3">How would you like to create your email?</label>
            <div className="grid grid-cols-3 gap-3">
              <MethodButton
                icon={<Sparkles className="w-5 h-5" />}
                label="Describe"
                description="Tell AI what you need"
                active={method === 'prompt'}
                onClick={() => setMethod('prompt')}
              />
              <MethodButton
                icon={<List className="w-5 h-5" />}
                label="Bullet Points"
                description="List key points"
                active={method === 'bullets'}
                onClick={() => setMethod('bullets')}
              />
              <MethodButton
                icon={<FileText className="w-5 h-5" />}
                label="Template"
                description="Use a template"
                active={method === 'template'}
                onClick={() => setMethod('template')}
              />
            </div>
          </div>

          {/* Template Selection */}
          {method === 'template' && (
            <div>
              <label className="block text-sm font-medium mb-2">Select Template</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(EMAIL_TEMPLATES).map(([id, template]) => (
                  <button
                    key={id}
                    onClick={() => setSelectedTemplate(id)}
                    className={cn(
                      'p-3 border rounded-lg text-left transition-all',
                      selectedTemplate === id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className="font-medium text-sm">{template.name}</div>
                    <div className="text-xs text-gray-600 mt-1">{template.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Content Input */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {method === 'prompt' && 'Describe your email'}
              {method === 'bullets' && 'List your key points'}
              {method === 'template' && 'Add specific details (optional)'}
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder={
                method === 'prompt'
                  ? 'e.g., "Tell John we need to reschedule Tuesday\'s meeting to Thursday at 2pm"'
                  : method === 'bullets'
                  ? 'e.g.,\n• Meeting moved to Thursday\n• New time: 2pm EST\n• Same Zoom link'
                  : 'e.g., "Meeting about Q4 project review"'
              }
            />
          </div>

          {/* Preferences */}
          <div className="grid grid-cols-2 gap-4">
            {/* Tone */}
            <div>
              <label className="block text-sm font-medium mb-2">Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as ToneType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="casual">Casual</option>
                <option value="assertive">Assertive</option>
                <option value="empathetic">Empathetic</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">{getToneDescription(tone)}</p>
            </div>

            {/* Length */}
            <div>
              <label className="block text-sm font-medium mb-2">Length</label>
              <select
                value={length}
                onChange={(e) => setLength(e.target.value as LengthType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="brief">Brief</option>
                <option value="normal">Normal</option>
                <option value="detailed">Detailed</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">{getLengthDescription(length)}</p>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t border-gray-200">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || (!content.trim() && method !== 'template')}
              className="bg-gradient-to-r from-blue-600 to-purple-600"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Email
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Method Button Component
 */
function MethodButton({
  icon,
  label,
  description,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'p-4 border-2 rounded-lg transition-all text-left',
        active
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300'
      )}
    >
      <div className={cn('mb-2', active ? 'text-blue-600' : 'text-gray-600')}>
        {icon}
      </div>
      <div className="font-medium text-sm">{label}</div>
      <div className="text-xs text-gray-600 mt-1">{description}</div>
    </button>
  );
}

