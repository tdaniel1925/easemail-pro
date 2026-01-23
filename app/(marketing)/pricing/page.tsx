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

// Simplified to 3 tiers - reduce decision fatigue
const plans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Starter',
    icon: Star,
    tagline: 'Try it free',
    monthlyPrice: 0,
    annualPrice: 0,
    description: 'Perfect for trying out EaseMail',
    features: [
      'Unlimited email accounts',
      '10 AI requests per month',
      'Basic email features',
      'Community support',
      '50 GB storage',
    ],
    limitations: [],
    cta: 'Start Free',
    ctaVariant: 'outline',
  },
  {
    id: 'individual',
    name: 'Professional',
    icon: Zap,
    tagline: 'Most popular',
    monthlyPrice: 45.00,
    annualPrice: 36.00,
    description: 'For professionals who need power',
    popular: true,
    features: [
      'Unlimited AI requests',
      'SMS messaging included',
      'AI email assistant & voice',
      'Priority email support',
      'Advanced features',
      'Custom signatures',
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
    tagline: 'For teams & businesses',
    monthlyPrice: 40.00,
    annualPrice: 32.00,
    description: 'Collaboration + enterprise features',
    features: [
      'Everything in Professional',
      'Unlimited team members',
      'Shared inbox & contacts',
      'Team analytics & permissions',
      'SSO & advanced security',
      'Dedicated support',
    ],
    limitations: [],
    cta: 'Start Team Trial',
    ctaVariant: 'default',
    minSeats: 2,
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
    answer: 'Yes! Upgrade or downgrade anytime. Upgrades take effect immediately with prorated billing. Downgrades apply at the end of your current billing period.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards and PayPal through our secure PayPal payment processing. Team plans with 10+ users can arrange invoice billing.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes! Professional and Team plans include a 14-day free trial. No credit card required. You can also use the Starter plan indefinitely.',
  },
  {
    question: 'How does team billing work?',
    answer: 'Team plans are billed per user per month (or annually for 20% savings). Add or remove members anytime - billing adjusts automatically with prorated charges.',
  },
  {
    question: 'Can I get a refund?',
    answer: 'We offer a 30-day money-back guarantee on all paid plans. Not satisfied? Contact support for a full refund within 30 days of purchase.',
  },
  {
    question: 'Do you offer nonprofit or education pricing?',
    answer: 'Yes! We offer special pricing for qualified nonprofits and educational institutions. Contact sales for details.',
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

    // For large teams (10+ users), direct to sales
    if (planId === 'team' && teamSeats >= 10) {
      window.location.href = '/contact-sales?plan=team&seats=' + teamSeats;
      return;
    }

    setLoading(planId);

    try {
      const response = await fetch('/api/paypal/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          billingCycle,
          seats: planId === 'team' ? teamSeats : 1,
          successUrl: window.location.origin + '/settings/billing?success=true',
          cancelUrl: window.location.origin + '/pricing?canceled=true',
        }),
      });

      const data = await response.json();

      if (response.ok && data.approvalUrl) {
        window.location.href = data.approvalUrl;
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
        <Badge variant="outline" className="mb-4 transition-smooth">
          Pricing
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Simple, transparent pricing
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Start free. Scale when ready.
        </p>

        {/* Social Proof */}
        <div className="flex items-center justify-center gap-6 mb-8 text-sm text-muted-foreground fade-in">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-xs font-semibold">A</div>
              <div className="w-8 h-8 rounded-full bg-accent/20 border-2 border-background flex items-center justify-center text-xs font-semibold">B</div>
              <div className="w-8 h-8 rounded-full bg-primary/30 border-2 border-background flex items-center justify-center text-xs font-semibold">C</div>
            </div>
            <span>Used by 10,000+ professionals</span>
          </div>
        </div>

        {/* Testimonial */}
        <div className="max-w-2xl mx-auto mb-12 fade-in">
          <Card className="p-6 card-hover border-primary/10">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Star className="h-6 w-6 text-primary fill-primary" />
              </div>
              <div className="text-left">
                <p className="text-base mb-2 text-foreground italic">
                  "EaseMail transformed how I manage emails. The AI features alone save me 2+ hours every day."
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold">Sarah Chen</span> · Product Manager at TechCorp
                </p>
              </div>
            </div>
          </Card>
        </div>

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <Card key={plan.id} className={cn(
                "relative p-8 flex flex-col card-hover transition-smooth",
                plan.popular && "border-primary shadow-lg scale-105 z-10 bg-primary/5"
              )}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary shadow-sm">
                    Most Popular
                  </Badge>
                )}

                {/* Icon & Name */}
                <div className="text-center mb-6">
                  <div className={cn(
                    "inline-flex p-3 rounded-full mb-4",
                    plan.popular ? "bg-primary/10 text-primary" : "bg-muted"
                  )}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.tagline}</p>
                </div>

                {/* Price */}
                <div className="mb-6 text-center pb-6 border-b border-border">
                  <div className="text-4xl font-bold mb-2">
                    {getPriceLabel(plan)}
                  </div>
                  {getPerUserLabel(plan) && (
                    <p className="text-sm text-muted-foreground">{getPerUserLabel(plan)}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                  {plan.id === 'team' && (
                    <div className="mt-4">
                      <Label htmlFor={`seats-${plan.id}`} className="text-xs text-muted-foreground block mb-2">
                        Team size: {teamSeats} users
                      </Label>
                      <input
                        id={`seats-${plan.id}`}
                        type="range"
                        min="2"
                        max="50"
                        value={teamSeats}
                        onChange={(e) => setTeamSeats(parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>

                {/* CTA Button */}
                <div className="mb-8">
                  <Button
                    className="w-full btn-press"
                    variant={plan.ctaVariant}
                    size="lg"
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={loading === plan.id}
                  >
                    {loading === plan.id ? 'Loading...' : (plan.id === 'team' && teamSeats >= 10 ? 'Contact Sales' : plan.cta)}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>

                {/* Features */}
                <div className="space-y-4 flex-1">
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm">
                        <Check className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                        <span className="text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
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

          <Card className="p-8 max-w-4xl mx-auto overflow-x-auto card-hover">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="text-left py-4 px-4 font-semibold">Feature</th>
                  <th className="text-center py-4 px-4 font-semibold">Starter</th>
                  <th className="text-center py-4 px-4 font-semibold">Professional</th>
                  <th className="text-center py-4 px-4 font-semibold">Team</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="transition-smooth hover:bg-muted/50">
                  <td className="py-4 px-4 text-sm font-medium">AI Requests/Month</td>
                  <td className="py-4 px-4 text-center text-sm">10</td>
                  <td className="py-4 px-4 text-center text-sm font-semibold text-primary">Unlimited</td>
                  <td className="py-4 px-4 text-center text-sm font-semibold text-primary">Unlimited</td>
                </tr>
                <tr className="transition-smooth hover:bg-muted/50">
                  <td className="py-4 px-4 text-sm font-medium">SMS Messaging</td>
                  <td className="py-4 px-4 text-center text-sm"><X className="h-4 w-4 mx-auto text-muted-foreground" /></td>
                  <td className="py-4 px-4 text-center text-sm"><Check className="h-5 w-5 mx-auto text-accent" /></td>
                  <td className="py-4 px-4 text-center text-sm"><Check className="h-5 w-5 mx-auto text-accent" /></td>
                </tr>
                <tr className="transition-smooth hover:bg-muted/50">
                  <td className="py-4 px-4 text-sm font-medium">Team Members</td>
                  <td className="py-4 px-4 text-center text-sm">1</td>
                  <td className="py-4 px-4 text-center text-sm">1</td>
                  <td className="py-4 px-4 text-center text-sm font-semibold text-primary">Unlimited</td>
                </tr>
                <tr className="transition-smooth hover:bg-muted/50">
                  <td className="py-4 px-4 text-sm font-medium">Support</td>
                  <td className="py-4 px-4 text-center text-sm">Community</td>
                  <td className="py-4 px-4 text-center text-sm">Priority Email</td>
                  <td className="py-4 px-4 text-center text-sm font-semibold text-primary">Dedicated</td>
                </tr>
                <tr className="transition-smooth hover:bg-muted/50">
                  <td className="py-4 px-4 text-sm font-medium">Team Features</td>
                  <td className="py-4 px-4 text-center text-sm"><X className="h-4 w-4 mx-auto text-muted-foreground" /></td>
                  <td className="py-4 px-4 text-center text-sm"><X className="h-4 w-4 mx-auto text-muted-foreground" /></td>
                  <td className="py-4 px-4 text-center text-sm"><Check className="h-5 w-5 mx-auto text-accent" /></td>
                </tr>
                <tr className="transition-smooth hover:bg-muted/50">
                  <td className="py-4 px-4 text-sm font-medium">SSO & Security</td>
                  <td className="py-4 px-4 text-center text-sm"><X className="h-4 w-4 mx-auto text-muted-foreground" /></td>
                  <td className="py-4 px-4 text-center text-sm"><X className="h-4 w-4 mx-auto text-muted-foreground" /></td>
                  <td className="py-4 px-4 text-center text-sm"><Check className="h-5 w-5 mx-auto text-accent" /></td>
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
          <Card className="p-12 text-center bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-primary/20 card-hover">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to transform your email?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join 10,000+ professionals who save hours every day with EaseMail
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" className="min-w-[200px] btn-press">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link href="/contact-sales">
                <Button size="lg" variant="outline" className="min-w-[200px] btn-press">
                  Talk to Sales
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              No credit card required • Cancel anytime • 30-day money-back guarantee
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
