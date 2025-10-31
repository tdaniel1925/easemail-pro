/**
 * Upgrade Modal for Dictation Feature
 * 
 * Prompts users to upgrade when they hit limits or want premium features
 */

'use client';

import { useState } from 'react';
import { X, Check, Sparkles, Zap, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useDictationUsage, formatMinutes, getTierName } from '@/lib/ai/dictation-usage';

interface DictationUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: 'limit-reached' | 'manual' | 'enhancement';
}

export function DictationUpgradeModal({
  isOpen,
  onClose,
  trigger = 'manual',
}: DictationUpgradeModalProps) {
  const { tier, remaining } = useDictationUsage();
  const [selectedTier, setSelectedTier] = useState<'pro' | 'business'>('pro');

  const handleUpgrade = (plan: 'pro' | 'business') => {
    // Navigate to pricing page with selected plan
    window.location.href = `/pricing?plan=${plan}&feature=dictation`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                {trigger === 'limit-reached' && '⏱️ Usage Limit Reached'}
                {trigger === 'enhancement' && '✨ Unlock Premium Dictation'}
                {trigger === 'manual' && '🚀 Upgrade Your Dictation'}
              </h2>
              <p className="opacity-90">
                {trigger === 'limit-reached' && `You've used all ${remaining.monthly} free minutes this month`}
                {trigger === 'enhancement' && 'Get 95%+ accuracy with AI-powered transcription'}
                {trigger === 'manual' && 'Choose the perfect plan for your needs'}
              </p>
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

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 p-6">
          {/* Pro Plan */}
          <PricingCard
            name="Pro"
            price={9.99}
            icon={<Zap className="w-8 h-8 text-blue-600" />}
            popular={true}
            selected={selectedTier === 'pro'}
            onSelect={() => setSelectedTier('pro')}
            features={[
              '300 minutes of dictation per month',
              'Works in all browsers',
              '95%+ transcription accuracy',
              'Smart punctuation',
              'Multi-language support',
              'Custom vocabulary',
              'Priority processing',
              'Email support',
            ]}
            onUpgrade={() => handleUpgrade('pro')}
          />

          {/* Business Plan */}
          <PricingCard
            name="Business"
            price={29.99}
            icon={<Crown className="w-8 h-8 text-purple-600" />}
            popular={false}
            selected={selectedTier === 'business'}
            onSelect={() => setSelectedTier('business')}
            features={[
              'Unlimited dictation',
              'All Pro features',
              'Team vocabulary sharing',
              'Advanced analytics',
              'API access',
              'Custom integrations',
              'Dedicated support',
              'SLA guarantee',
            ]}
            onUpgrade={() => handleUpgrade('business')}
          />
        </div>

        {/* Comparison Table */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <h3 className="font-semibold mb-4">Feature Comparison</h3>
          <div className="space-y-3">
            <ComparisonRow
              feature="Real-time dictation"
              free={<Check className="w-5 h-5 text-green-600" />}
              pro={<Check className="w-5 h-5 text-green-600" />}
              business={<Check className="w-5 h-5 text-green-600" />}
            />
            <ComparisonRow
              feature="Monthly minutes"
              free="30 min"
              pro="300 min"
              business="Unlimited"
            />
            <ComparisonRow
              feature="Accuracy"
              free="85%"
              pro="95%+"
              business="95%+"
            />
            <ComparisonRow
              feature="Browser support"
              free="Chrome/Edge only"
              pro="All browsers"
              business="All browsers"
            />
            <ComparisonRow
              feature="AI enhancement"
              free={<X className="w-5 h-5 text-gray-400" />}
              pro={<Check className="w-5 h-5 text-green-600" />}
              business={<Check className="w-5 h-5 text-green-600" />}
            />
            <ComparisonRow
              feature="Custom vocabulary"
              free={<X className="w-5 h-5 text-gray-400" />}
              pro={<Check className="w-5 h-5 text-green-600" />}
              business={<Check className="w-5 h-5 text-green-600" />}
            />
            <ComparisonRow
              feature="Team features"
              free={<X className="w-5 h-5 text-gray-400" />}
              pro={<X className="w-5 h-5 text-gray-400" />}
              business={<Check className="w-5 h-5 text-green-600" />}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-white text-center">
          <p className="text-sm text-gray-600">
            ✨ Cancel anytime • 💳 Secure payment • 🔒 Money-back guarantee
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Pricing Card Component
 */
function PricingCard({
  name,
  price,
  icon,
  popular,
  selected,
  features,
  onSelect,
  onUpgrade,
}: {
  name: string;
  price: number;
  icon: React.ReactNode;
  popular: boolean;
  selected: boolean;
  features: string[];
  onSelect: () => void;
  onUpgrade: () => void;
}) {
  return (
    <div
      className={`relative border-2 rounded-lg p-6 cursor-pointer transition-all ${
        selected
          ? 'border-blue-600 shadow-lg scale-105'
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-xs font-semibold">
          ⭐ Most Popular
        </div>
      )}

      <div className="text-center mb-6">
        <div className="inline-block mb-2">{icon}</div>
        <h3 className="text-xl font-bold mb-2">{name}</h3>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-3xl font-bold">${price}</span>
          <span className="text-gray-600">/month</span>
        </div>
      </div>

      <ul className="space-y-3 mb-6">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2 text-sm">
            <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        onClick={(e) => {
          e.stopPropagation();
          onUpgrade();
        }}
        className="w-full"
        variant={selected ? 'default' : 'outline'}
      >
        {selected ? 'Select Plan' : 'Choose ' + name}
      </Button>
    </div>
  );
}

/**
 * Comparison Row Component
 */
function ComparisonRow({
  feature,
  free,
  pro,
  business,
}: {
  feature: string;
  free: React.ReactNode;
  pro: React.ReactNode;
  business: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-4 gap-4 text-sm">
      <div className="font-medium text-gray-700">{feature}</div>
      <div className="text-center text-gray-600">{free}</div>
      <div className="text-center text-blue-600">{pro}</div>
      <div className="text-center text-purple-600">{business}</div>
    </div>
  );
}

/**
 * Inline Upgrade Prompt
 * Shows when user is close to limit
 */
export function InlineUpgradePrompt({
  remainingMinutes,
  tier,
}: {
  remainingMinutes: number;
  tier: 'free' | 'pro' | 'business';
}) {
  const [showModal, setShowModal] = useState(false);

  if (tier !== 'free' || remainingMinutes > 5) {
    return null;
  }

  if (remainingMinutes <= 0) {
    return (
      <>
        <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg mb-1">
                ⏱️ Free dictation minutes used up
              </h3>
              <p className="text-sm opacity-90">
                Upgrade to Pro for 300 minutes/month with 95%+ accuracy
              </p>
            </div>
            <Button
              onClick={() => setShowModal(true)}
              variant="secondary"
              className="bg-white text-gray-900 hover:bg-gray-100"
            >
              Upgrade Now
            </Button>
          </div>
        </div>
        <DictationUpgradeModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          trigger="limit-reached"
        />
      </>
    );
  }

  return (
    <>
      <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
        <p className="text-sm text-amber-800">
          ⚠️ Only {remainingMinutes} minutes left this month.{' '}
          <button
            onClick={() => setShowModal(true)}
            className="underline font-medium hover:no-underline"
          >
            Upgrade to Pro
          </button>
        </p>
      </div>
      <DictationUpgradeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        trigger="limit-reached"
      />
    </>
  );
}

