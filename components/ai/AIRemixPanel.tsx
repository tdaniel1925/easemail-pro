/**
 * AI Remix Panel Component
 * 
 * Transform existing email drafts with AI
 * Supports: tone, length, style, fixes, and variations
 */

'use client';

import { useState } from 'react';
import { Wand2, Loader2, Check, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { ToneType } from '@/lib/ai/ai-write-service';
import { cn } from '@/lib/utils';

interface AIRemixPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentContent: string;
  onApply: (newContent: string) => void;
}

type LengthAdjustment = 'shorter' | 'same' | 'longer';
type StyleType = 'bullets' | 'paragraph' | 'executive' | 'same';

export function AIRemixPanel({
  isOpen,
  onClose,
  currentContent,
  onApply,
}: AIRemixPanelProps) {
  const [tone, setTone] = useState<ToneType>('professional');
  const [length, setLength] = useState<LengthAdjustment>('same');
  const [style, setStyle] = useState<StyleType>('same');
  const [fixes, setFixes] = useState<string[]>([]);
  const [isRemixing, setIsRemixing] = useState(false);
  const [variations, setVariations] = useState<Array<{ body: string; changes: string[] }>>([]);
  const [selectedVariation, setSelectedVariation] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleFix = (fix: string) => {
    setFixes(prev =>
      prev.includes(fix) ? prev.filter(f => f !== fix) : [...prev, fix]
    );
  };

  const handleRemix = async (generateVariations: boolean = false) => {
    setIsRemixing(true);
    setError(null);
    setVariations([]);
    setSelectedVariation(null);

    try {
      const response = await fetch('/api/ai/remix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'temp-user', // TODO: Replace with actual user ID
        },
        body: JSON.stringify({
          content: currentContent,
          options: {
            tone,
            lengthAdjustment: length,
            style,
            fixes: fixes.length > 0 ? fixes : undefined,
            variationCount: generateVariations ? 3 : 1,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to remix email');
      }

      const data = await response.json();

      if (data.variations) {
        setVariations(data.variations);
        setSelectedVariation(0);
      } else {
        onApply(data.email.body);
        onClose();
      }
    } catch (error: any) {
      console.error('Remix error:', error);
      setError(error.message || 'Failed to remix email');
    } finally {
      setIsRemixing(false);
    }
  };

  const applyVariation = () => {
    if (selectedVariation !== null && variations[selectedVariation]) {
      onApply(variations[selectedVariation].body);
      onClose();
    }
  };

  if (variations.length > 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <VariationSelector
            variations={variations}
            selectedIndex={selectedVariation || 0}
            onSelect={setSelectedVariation}
            onApply={applyVariation}
            onBack={() => setVariations([])}
            onClose={onClose}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wand2 className="w-6 h-6" />
              <div>
                <h2 className="text-2xl font-bold">AI Remix</h2>
                <p className="text-sm opacity-90">Transform your email draft</p>
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
          {/* Tone Adjustment */}
          <div>
            <label className="block text-sm font-semibold mb-3">TONE ADJUSTMENT</label>
            <div className="grid grid-cols-5 gap-2">
              {(['professional', 'friendly', 'casual', 'assertive', 'empathetic'] as ToneType[]).map((t) => (
                <ToneButton
                  key={t}
                  tone={t}
                  active={tone === t}
                  onClick={() => setTone(t)}
                />
              ))}
            </div>
          </div>

          {/* Length */}
          <div>
            <label className="block text-sm font-semibold mb-3">LENGTH</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="2"
                value={length === 'shorter' ? 0 : length === 'same' ? 1 : 2}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setLength(val === 0 ? 'shorter' : val === 1 ? 'same' : 'longer');
                }}
                className="flex-1"
              />
              <span className="text-sm font-medium w-20 text-right">
                {length === 'shorter' && 'Shorter'}
                {length === 'same' && 'Same'}
                {length === 'longer' && 'Longer'}
              </span>
            </div>
          </div>

          {/* Quick Fixes */}
          <div>
            <label className="block text-sm font-semibold mb-3">QUICK FIXES</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'grammar', label: 'Fix grammar & spelling' },
                { value: 'clarity', label: 'Improve clarity' },
                { value: 'conciseness', label: 'Make more concise' },
                { value: 'flow', label: 'Better flow' },
              ].map((fix) => (
                <button
                  key={fix.value}
                  onClick={() => toggleFix(fix.value)}
                  className={cn(
                    'px-4 py-2 border rounded-lg text-sm transition-all text-left',
                    fixes.includes(fix.value)
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'w-4 h-4 border rounded flex items-center justify-center',
                        fixes.includes(fix.value)
                          ? 'border-purple-500 bg-purple-500'
                          : 'border-gray-300'
                      )}
                    >
                      {fixes.includes(fix.value) && <Check className="w-3 h-3 text-white" />}
                    </div>
                    {fix.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Style Transform */}
          <div>
            <label className="block text-sm font-semibold mb-3">STYLE TRANSFORM</label>
            <div className="space-y-2">
              {[
                { value: 'same', label: 'Keep current style' },
                { value: 'bullets', label: 'Convert to bullet points' },
                { value: 'paragraph', label: 'Convert to paragraphs' },
                { value: 'executive', label: 'Executive summary style' },
              ].map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStyle(s.value as StyleType)}
                  className={cn(
                    'w-full px-4 py-2 border rounded-lg text-sm transition-all text-left',
                    style === s.value
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'w-4 h-4 border rounded-full',
                        style === s.value
                          ? 'border-purple-500 bg-purple-500'
                          : 'border-gray-300'
                      )}
                    />
                    {s.label}
                  </div>
                </button>
              ))}
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
            <div className="flex gap-2">
              <Button
                onClick={() => handleRemix(true)}
                disabled={isRemixing}
                variant="outline"
              >
                Generate 3 Variations
              </Button>
              <Button
                onClick={() => handleRemix(false)}
                disabled={isRemixing}
                className="bg-gradient-to-r from-purple-600 to-pink-600"
              >
                {isRemixing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Remixing...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Apply Remix
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Tone Button Component
 */
function ToneButton({
  tone,
  active,
  onClick,
}: {
  tone: ToneType;
  active: boolean;
  onClick: () => void;
}) {
  const icons = {
    professional: '💼',
    friendly: '😊',
    casual: '💬',
    assertive: '⚡',
    empathetic: '❤️',
  };

  const labels = {
    professional: 'Pro',
    friendly: 'Friend',
    casual: 'Casual',
    assertive: 'Assert',
    empathetic: 'Care',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'p-3 border-2 rounded-lg transition-all',
        active
          ? 'border-purple-500 bg-purple-50'
          : 'border-gray-200 hover:border-gray-300'
      )}
    >
      <div className="text-2xl mb-1">{icons[tone]}</div>
      <div className="text-xs font-medium">{labels[tone]}</div>
    </button>
  );
}

/**
 * Variation Selector Component
 */
function VariationSelector({
  variations,
  selectedIndex,
  onSelect,
  onApply,
  onBack,
  onClose,
}: {
  variations: Array<{ body: string; changes: string[] }>;
  selectedIndex: number;
  onSelect: (index: number) => void;
  onApply: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Choose Your Version</h2>
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

      <div className="p-6 space-y-4">
        {variations.map((variation, index) => (
          <button
            key={index}
            onClick={() => onSelect(index)}
            className={cn(
              'w-full p-4 border-2 rounded-lg text-left transition-all',
              selectedIndex === index
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300'
            )}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="font-semibold">
                Version {index + 1}
                {index === 1 && (
                  <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                    ⭐ Recommended
                  </span>
                )}
              </div>
              {selectedIndex === index && <Check className="w-5 h-5 text-purple-600" />}
            </div>
            <div className="text-sm text-gray-700 mb-2 line-clamp-3">
              {variation.body}
            </div>
            {variation.changes.length > 0 && (
              <div className="text-xs text-gray-500">
                Changes: {variation.changes.join(', ')}
              </div>
            )}
          </button>
        ))}

        <div className="flex justify-between pt-4 border-t border-gray-200">
          <Button variant="ghost" onClick={onBack}>
            ← Back
          </Button>
          <Button
            onClick={onApply}
            className="bg-gradient-to-r from-purple-600 to-pink-600"
          >
            Use Version {selectedIndex + 1}
          </Button>
        </div>
      </div>
    </>
  );
}

