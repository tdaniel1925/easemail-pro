'use client';

import { useState } from 'react';
import { Check, X, Star, Zap, Users, Building2, ArrowRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface PricingPlan {
  id: string;
  name: string;
  icon: any;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  popular?: boolean;
  features: string[];
  limitations: string[];
  cta: string;
  ctaVariant: 'default' | 'outline';
  maxSeats?: number;
  minSeats?: number;
}

const plans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    icon: Star,
    tagline: 'Try before you buy',
    monthlyPrice: 0,
    annualPrice: 0,
    description: 'Perfect for trying out EaseMail',
    features: [
      'Unlimited email accounts',
      'Unlimited email storage',
      '10 AI requests per month',
      'Basic email features',
      'Community support',
    ],
    limitations: [
      'No SMS messaging',
      'Limited AI features',
      '1 user only',
    ],
    cta: 'Start Free',
    ctaVariant: 'outline',
  },
  {
    id: 'individual',
    name: 'Individual',
    icon: Zap,
    tagline: 'For power users',
    monthlyPrice: 45.00,
    annualPrice: 36.00,
    description: 'Everything you need for professional email',
    popular: true,
    features: [
      'Everything in Free',
      'Unlimited AI requests',
      'Unlimited SMS messaging',
      'Advanced email features',
      'Priority email support',
      'Custom email signatures',
      'AI email assistant',
      'Voice transcription',
      'Smart compose',
      '50 GB storage included',
    ],
    limitations: [],
    cta: 'Start 14-Day Trial',
    ctaVariant: 'default',
    maxSeats: 1,
  },
  {
    id: 'team',
    name: 'Team',
    icon: Users,
    tagline: 'For small teams',
    monthlyPrice: 40.50,
    annualPrice: 32.40,
    description: 'Collaboration features for growing teams',
    features: [
      'Everything in Individual',
      '2-10 team members',
      'Shared team inbox',
      'Team analytics',
      'Centralized billing',
      'Team chat',
      'Shared contacts',
      'Role-based permissions',
      'Usage tracking per member',
      'Priority support',
    ],
    limitations: [],
    cta: 'Start Team Trial',
    ctaVariant: 'default',
    minSeats: 2,
    maxSeats: 10,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    icon: Building2,
    tagline: 'For large organizations',
    monthlyPrice: 36.45,
    annualPrice: 29.16,
    description: 'Advanced features for enterprise needs',
    features: [
      'Everything in Team',
      'Unlimited team members',
      'SSO & advanced security',
      'Custom integrations',
      'Dedicated account manager',
      '99.9% uptime SLA',
      'Custom contracts',
      'Volume discounts',
      'On-premise deployment option',
      'Advanced compliance features',
      '24/7 phone support',
    ],
    limitations: [],
    cta: 'Contact Sales',
    ctaVariant: 'outline',
    minSeats: 10,
  },
];

const usagePricing = [
  {
    category: 'SMS Messaging',
    tiers: [
      { range: '0 - 1,000 messages', price: '$0.03 per message' },
      { range: '1,001 - 10,000 messages', price: '$0.025 per message' },
      { range: '10,001+ messages', price: '$0.02 per message' },
    ],
    note: 'Not available on Free plan',
  },
  {
    category: 'AI Requests',
    tiers: [
      { range: 'Included in plan', price: 'Unlimited (paid plans)' },
      { range: 'Free plan overage', price: '$0.001 per request' },
    ],
    note: 'Free plan: 10 requests/month included',
  },
  {
    category: 'Storage',
    tiers: [
      { range: 'First 50 GB per user', price: 'Included' },
      { range: 'Additional storage', price: '$0.10 per GB/month' },
    ],
    note: 'All plans include 50 GB per user',
  },
];

const faqs = [
  {
    question: 'Can I change plans at any time?',
    answer: 'Yes! You can upgrade or downgrade your plan at any time. Upgrades take effect immediately with prorated billing. Downgrades take effect at the end of your current billing period.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, Mastercard, American Express, Discover) and debit cards through Stripe. Enterprise customers can also arrange for invoice billing.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes! Individual and Team plans come with a 14-day free trial. No credit card required. You can also use the Free plan indefinitely to try out basic features.',
  },
  {
    question: 'How does billing work for teams?',
    answer: 'Team plans are billed per user per month (or per year for annual plans). You can add or remove team members at any time, and billing adjusts automatically with prorated charges.',
  },
  {
    question: 'What happens if I exceed my usage limits?',
    answer: 'On paid plans, you\'ll be charged for overages based on our usage pricing (shown above). You\'ll receive email notifications at 50%, 75%, and 90% of your limits. Free plan users will be prompted to upgrade.',
  },
  {
    question: 'Can I get a refund?',
    answer: 'We offer a 30-day money-back guarantee on all paid plans. If you\'re not satisfied, contact support for a full refund within 30 days of your initial purchase.',
  },
  {
    question: 'Do you offer discounts for nonprofits or educational institutions?',
    answer: 'Yes! We offer special pricing for qualified nonprofits and educational institutions. Contact our sales team for details.',
  },
  {
    question: 'What\'s included in Enterprise support?',
    answer: 'Enterprise customers get a dedicated account manager, 24/7 phone support, 99.9% uptime SLA, priority bug fixes, and quarterly business reviews.',
  },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [teamSeats, setTeamSeats] = useState(5);
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelectPlan = async (planId: string) => {
    if (planId === 'free') {
      window.location.href = '/signup';
      return;
    }

    if (planId === 'enterprise') {
      window.location.href = '/contact-sales';
      return;
    }

    setLoading(planId);

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          billingCycle,
          seats: planId === 'team' ? teamSeats : 1,
          successUrl: window.location.origin + '/settings/billing?session_id={CHECKOUT_SESSION_ID}&success=true',
          cancelUrl: window.location.origin + '/pricing?canceled=true',
        }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to start checkout. Please log in first.');
        window.location.href = '/login?returnTo=/pricing';
      }
    } catch (error) {
      console.error('Error starting checkout:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const getPrice = (plan: PricingPlan) => {
    if (plan.id === 'free') return 0;
    const basePrice = billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
    if (plan.id === 'team') {
      return basePrice * teamSeats;
    }
    return basePrice;
  };

  const getPriceLabel = (plan: PricingPlan) => {
    if (plan.id === 'free') return 'Free forever';
    if (plan.id === 'enterprise') return 'Custom pricing';
    if (plan.id === 'team') {
      return `$${getPrice(plan).toFixed(2)}/${billingCycle === 'monthly' ? 'mo' : 'yr'}`;
    }
    return `$${getPrice(plan).toFixed(2)}/${billingCycle === 'monthly' ? 'mo' : 'yr'}`;
  };

  const getPerUserLabel = (plan: PricingPlan) => {
    if (plan.id === 'free' || plan.id === 'enterprise') return '';
    if (plan.id === 'team') {
      const perUser = billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
      return `$${perUser.toFixed(2)} per user`;
    }
    return '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      {/* Header */}
      <div className="container mx-auto px-6 pt-20 pb-12 text-center">
        <Badge variant="outline" className="mb-4">
          Pricing
        </Badge>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Simple, transparent pricing
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Start free and scale as you grow. No hidden fees, no surprises.
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <Label htmlFor="billing-toggle" className={cn(
            "text-base font-medium transition-colors",
            billingCycle === 'monthly' ? 'text-foreground' : 'text-muted-foreground'
          )}>
            Monthly
          </Label>
          <Switch
            id="billing-toggle"
            checked={billingCycle === 'annual'}
            onCheckedChange={(checked) => setBillingCycle(checked ? 'annual' : 'monthly')}
          />
          <Label htmlFor="billing-toggle" className={cn(
            "text-base font-medium transition-colors",
            billingCycle === 'annual' ? 'text-foreground' : 'text-muted-foreground'
          )}>
            Annual <span className="text-green-600 dark:text-green-400 ml-1">(Save 20%)</span>
          </Label>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="container mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <Card key={plan.id} className={cn(
                "relative p-6 flex flex-col transition-all duration-300",
                plan.popular && "border-primary shadow-lg scale-105 lg:scale-110 z-10"
              )}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                    Most Popular
                  </Badge>
                )}

                {/* Icon & Name */}
                <div className="flex items-center gap-3 mb-2">
                  <div className={cn(
                    "p-2 rounded-lg",
                    plan.popular ? "bg-primary/10 text-primary" : "bg-muted"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground">{plan.tagline}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-4">
                  <div className="text-3xl font-bold mb-1">
                    {getPriceLabel(plan)}
                  </div>
                  {getPerUserLabel(plan) && (
                    <p className="text-sm text-muted-foreground">{getPerUserLabel(plan)}</p>
                  )}
                  {plan.id === 'team' && (
                    <div className="mt-2">
                      <Label htmlFor={`seats-${plan.id}`} className="text-xs text-muted-foreground">
                        Team size: {teamSeats} users
                      </Label>
                      <input
                        id={`seats-${plan.id}`}
                        type="range"
                        min="2"
                        max="10"
                        value={teamSeats}
                        onChange={(e) => setTeamSeats(parseInt(e.target.value))}
                        className="w-full mt-1"
                      />
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>

                {/* CTA Button */}
                <div className="mb-6">
                  <Button
                    className="w-full"
                    variant={plan.ctaVariant}
                    size="lg"
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={loading === plan.id}
                  >
                    {loading === plan.id ? 'Loading...' : plan.cta}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>

                {/* Features */}
                <div className="space-y-3 flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    What's included:
                  </p>
                  <ul className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.limitations.length > 0 && (
                    <>
                      <p className="text-xs font-semibold text-muted-foreground uppercase pt-4">
                        Limitations:
                      </p>
                      <ul className="space-y-2">
                        {plan.limitations.map((limitation, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <X className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <span>{limitation}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Usage-Based Pricing */}
      <div className="bg-muted/30 py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              Usage-Based Pricing
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Pay only for what you use
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Transparent, volume-based pricing for SMS, AI, and storage
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {usagePricing.map((category, idx) => (
              <Card key={idx} className="p-6">
                <h3 className="text-xl font-bold mb-4">{category.category}</h3>
                <div className="space-y-3 mb-4">
                  {category.tiers.map((tier, tierIdx) => (
                    <div key={tierIdx} className="flex justify-between items-start text-sm">
                      <span className="text-muted-foreground">{tier.range}</span>
                      <span className="font-semibold text-right ml-2">{tier.price}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-3 border-t border-border">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">{category.note}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Feature Comparison */}
      <div className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              Feature Comparison
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Compare all features
            </h2>
          </div>

          <Card className="p-6 max-w-5xl mx-auto overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-4 font-semibold">Feature</th>
                  <th className="text-center py-4 px-4 font-semibold">Free</th>
                  <th className="text-center py-4 px-4 font-semibold">Individual</th>
                  <th className="text-center py-4 px-4 font-semibold">Team</th>
                  <th className="text-center py-4 px-4 font-semibold">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-3 px-4 text-sm">Email Accounts</td>
                  <td className="py-3 px-4 text-center text-sm">Unlimited</td>
                  <td className="py-3 px-4 text-center text-sm">Unlimited</td>
                  <td className="py-3 px-4 text-center text-sm">Unlimited</td>
                  <td className="py-3 px-4 text-center text-sm">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-sm">AI Requests/Month</td>
                  <td className="py-3 px-4 text-center text-sm">10</td>
                  <td className="py-3 px-4 text-center text-sm">Unlimited</td>
                  <td className="py-3 px-4 text-center text-sm">Unlimited</td>
                  <td className="py-3 px-4 text-center text-sm">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-sm">SMS Messaging</td>
                  <td className="py-3 px-4 text-center text-sm"><X className="h-4 w-4 mx-auto" /></td>
                  <td className="py-3 px-4 text-center text-sm"><Check className="h-4 w-4 mx-auto text-green-600" /></td>
                  <td className="py-3 px-4 text-center text-sm"><Check className="h-4 w-4 mx-auto text-green-600" /></td>
                  <td className="py-3 px-4 text-center text-sm"><Check className="h-4 w-4 mx-auto text-green-600" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-sm">Team Members</td>
                  <td className="py-3 px-4 text-center text-sm">1</td>
                  <td className="py-3 px-4 text-center text-sm">1</td>
                  <td className="py-3 px-4 text-center text-sm">2-10</td>
                  <td className="py-3 px-4 text-center text-sm">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-sm">Storage per User</td>
                  <td className="py-3 px-4 text-center text-sm">50 GB</td>
                  <td className="py-3 px-4 text-center text-sm">50 GB</td>
                  <td className="py-3 px-4 text-center text-sm">50 GB</td>
                  <td className="py-3 px-4 text-center text-sm">Custom</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-sm">Support</td>
                  <td className="py-3 px-4 text-center text-sm">Community</td>
                  <td className="py-3 px-4 text-center text-sm">Email</td>
                  <td className="py-3 px-4 text-center text-sm">Priority</td>
                  <td className="py-3 px-4 text-center text-sm">24/7 Phone</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-sm">SSO & Advanced Security</td>
                  <td className="py-3 px-4 text-center text-sm"><X className="h-4 w-4 mx-auto" /></td>
                  <td className="py-3 px-4 text-center text-sm"><X className="h-4 w-4 mx-auto" /></td>
                  <td className="py-3 px-4 text-center text-sm"><X className="h-4 w-4 mx-auto" /></td>
                  <td className="py-3 px-4 text-center text-sm"><Check className="h-4 w-4 mx-auto text-green-600" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-sm">SLA</td>
                  <td className="py-3 px-4 text-center text-sm">-</td>
                  <td className="py-3 px-4 text-center text-sm">-</td>
                  <td className="py-3 px-4 text-center text-sm">-</td>
                  <td className="py-3 px-4 text-center text-sm">99.9%</td>
                </tr>
              </tbody>
            </table>
          </Card>
        </div>
      </div>

      {/* FAQs */}
      <div className="bg-muted/30 py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              FAQs
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Frequently asked questions
            </h2>
          </div>

          <Accordion type="single" collapsible className="max-w-3xl mx-auto">
            {faqs.map((faq, idx) => (
              <AccordionItem key={idx} value={`item-${idx}`}>
                <AccordionTrigger className="text-left font-semibold">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20">
        <div className="container mx-auto px-6">
          <Card className="p-12 text-center bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-primary/20">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to get started?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of professionals managing their email with EaseMail
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" className="min-w-[200px]">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link href="/contact-sales">
                <Button size="lg" variant="outline" className="min-w-[200px]">
                  Contact Sales
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              No credit card required for trial • Cancel anytime • 30-day money-back guarantee
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
