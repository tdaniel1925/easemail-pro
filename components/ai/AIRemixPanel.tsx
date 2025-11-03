/**
 * AI Remix Panel Component - PROFESSIONAL REDESIGN
 * 
 * Transform existing email drafts with AI
 * Supports: tone, length, style, fixes, and variations
 */

'use client';

import { useState, useEffect } from 'react';
import { Wand2, Loader2, Check, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { ToneType } from '@/lib/ai/ai-write-service';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

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
  const [userId, setUserId] = useState<string | null>(null); // ✅ Store user ID

  // ✅ Get authenticated user ID
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserId(data.user.id);
      }
    });
  }, []);

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

    // ✅ Check authentication
    if (!userId) {
      setError('Please log in to use AI Remix');
      setIsRemixing(false);
      return;
    }

    try {
      const response = await fetch('/api/ai/remix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId, // ✅ Add authentication header
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto p-0">
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
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="bg-card border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" />
              <div>
                <h2 className="text-lg font-semibold">AI Remix</h2>
                <p className="text-xs text-muted-foreground">Transform your draft</p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Tone Adjustment */}
          <div>
            <label className="block text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
              Tone
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {(['professional', 'friendly', 'casual', 'assertive', 'empathetic'] as ToneType[]).map((t) => (
                <Button
                  key={t}
                  variant={tone === t ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 text-xs capitalize"
                  onClick={() => setTone(t)}
                >
                  {t.slice(0, 4)}
                </Button>
              ))}
            </div>
          </div>

          {/* Length */}
          <div>
            <label className="block text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
              Length
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="2"
                value={length === 'shorter' ? 0 : length === 'same' ? 1 : 2}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setLength(val === 0 ? 'shorter' : val === 1 ? 'same' : 'longer');
                }}
                className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs font-medium w-16 text-right">
                {length === 'shorter' && 'Shorter'}
                {length === 'same' && 'Same'}
                {length === 'longer' && 'Longer'}
              </span>
            </div>
          </div>

          {/* Quick Fixes */}
          <div>
            <label className="block text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
              Quick Fixes
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { value: 'grammar', label: 'Grammar' },
                { value: 'clarity', label: 'Clarity' },
                { value: 'conciseness', label: 'Concise' },
                { value: 'flow', label: 'Flow' },
              ].map((fix) => (
                <button
                  key={fix.value}
                  onClick={() => toggleFix(fix.value)}
                  className={cn(
                    'px-3 py-2 border rounded-md text-xs transition-all text-left',
                    fixes.includes(fix.value)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50 bg-card'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'w-3.5 h-3.5 border rounded flex items-center justify-center',
                        fixes.includes(fix.value)
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground/30'
                      )}
                    >
                      {fixes.includes(fix.value) && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                    </div>
                    {fix.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Style Transform */}
          <div>
            <label className="block text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
              Style
            </label>
            <div className="space-y-1.5">
              {[
                { value: 'same', label: 'Keep current' },
                { value: 'bullets', label: 'Bullet points' },
                { value: 'paragraph', label: 'Paragraphs' },
                { value: 'executive', label: 'Executive summary' },
              ].map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStyle(s.value as StyleType)}
                  className={cn(
                    'w-full px-3 py-2 border rounded-md text-xs transition-all text-left',
                    style === s.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 bg-card'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'w-3 h-3 border rounded-full',
                        style === s.value
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground/30'
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
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-3 border-t border-border">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button
                onClick={() => handleRemix(true)}
                disabled={isRemixing}
                variant="outline"
                size="sm"
              >
                3 Variations
              </Button>
              <Button
                onClick={() => handleRemix(false)}
                disabled={isRemixing}
                size="sm"
              >
                {isRemixing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Remixing
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                    Apply
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
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Choose Version</h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {variations.map((variation, index) => (
          <button
            key={index}
            onClick={() => onSelect(index)}
            className={cn(
              'w-full p-3 border rounded-md text-left transition-all',
              selectedIndex === index
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50 bg-card'
            )}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="text-sm font-semibold">
                Version {index + 1}
                {index === 1 && (
                  <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                    Recommended
                  </span>
                )}
              </div>
              {selectedIndex === index && <Check className="w-4 h-4 text-primary" />}
            </div>
            <div className="text-xs text-muted-foreground mb-2 line-clamp-3">
              {variation.body}
            </div>
            {variation.changes.length > 0 && (
              <div className="text-xs text-muted-foreground">
                Changes: {variation.changes.join(', ')}
              </div>
            )}
          </button>
        ))}

        <div className="flex justify-between pt-3 border-t border-border">
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Back
          </Button>
          <Button
            onClick={onApply}
            size="sm"
          >
            Use Version {selectedIndex + 1}
          </Button>
        </div>
      </div>
    </>
  );
}
