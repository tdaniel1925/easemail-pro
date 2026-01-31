'use client';

import { useState, useEffect, useRef } from 'react';
import { Check, X, Star, Zap, Users, Building2, ArrowRight, Info, Sparkles } from 'lucide-react';
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
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Subtle animated gradient background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let animationId: number;
    let time = 0;

    const animate = () => {
      time += 0.002;

      const gradient = ctx.createRadialGradient(
        canvas.width / 2 + Math.sin(time) * 150,
        canvas.height / 3 + Math.cos(time * 0.8) * 150,
        0,
        canvas.width / 2,
        canvas.height / 3,
        canvas.width / 2
      );

      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.1)');
      gradient.addColorStop(0.5, 'rgba(147, 51, 234, 0.05)');
      gradient.addColorStop(1, 'rgba(236, 72, 153, 0.02)');

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  const handleSelectPlan = async (planId: string) => {
    if (planId === 'free') {
      window.location.href = '/signup';
      return;
    }

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
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ filter: 'blur(60px)' }}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="container mx-auto px-6 pt-24 pb-16 text-center">
          <Badge variant="outline" className="mb-6 transition-smooth border-primary/30 bg-primary/5 animate-in fade-in duration-700">
            <Sparkles className="h-3 w-3 mr-1.5 text-primary" />
            Pricing
          </Badge>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-1000">
            Simple, transparent pricing
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-150">
            Start free. Scale when ready. No hidden fees.
          </p>

          {/* Social Proof */}
          <div className="flex items-center justify-center gap-8 mb-10 text-sm text-muted-foreground animate-in fade-in duration-1000 delay-300">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                <div className="w-9 h-9 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-xs font-semibold">A</div>
                <div className="w-9 h-9 rounded-full bg-purple-500/20 border-2 border-background flex items-center justify-center text-xs font-semibold">B</div>
                <div className="w-9 h-9 rounded-full bg-pink-500/20 border-2 border-background flex items-center justify-center text-xs font-semibold">C</div>
              </div>
              <span className="font-medium">Trusted by 10,000+ professionals</span>
            </div>
          </div>

          {/* Testimonial */}
          <div className="max-w-2xl mx-auto mb-14 animate-in fade-in duration-1000 delay-500">
            <Card className="p-8 border-primary/10 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 shadow-xl hover:shadow-2xl transition-all duration-500">
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center flex-shrink-0">
                  <Star className="h-7 w-7 text-white fill-white" />
                </div>
                <div className="text-left">
                  <p className="text-lg mb-3 text-foreground italic leading-relaxed">
                    "EaseMail transformed how I manage emails. The AI features alone save me 2+ hours every day. Best investment I've made this year."
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-bold">Sarah Chen</span> · Product Manager at TechCorp
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Billing Toggle with Premium Design */}
          <div className="flex items-center justify-center gap-4 mb-16 animate-in fade-in duration-1000 delay-700">
            <Label htmlFor="billing-toggle" className={cn(
              "text-lg font-semibold transition-all cursor-pointer",
              billingCycle === 'monthly' ? 'text-foreground scale-105' : 'text-muted-foreground hover:text-foreground'
            )}>
              Monthly
            </Label>
            <div className="relative">
              <Switch
                id="billing-toggle"
                checked={billingCycle === 'annual'}
                onCheckedChange={(checked) => setBillingCycle(checked ? 'annual' : 'monthly')}
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-primary data-[state=checked]:to-purple-500"
              />
            </div>
            <Label htmlFor="billing-toggle" className={cn(
              "text-lg font-semibold transition-all cursor-pointer",
              billingCycle === 'annual' ? 'text-foreground scale-105' : 'text-muted-foreground hover:text-foreground'
            )}>
              Annual{' '}
              <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-bold">
                <Sparkles className="h-3 w-3" />
                Save 20%
              </span>
            </Label>
          </div>
        </div>

        {/* Pricing Cards with Luxury Design */}
        <div className="container mx-auto px-6 pb-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {plans.map((plan, index) => {
              const Icon = plan.icon;
              return (
                <Card key={plan.id} className={cn(
                  "relative p-10 flex flex-col transition-all duration-500 animate-in fade-in slide-in-from-bottom-8",
                  plan.popular
                    ? "border-primary/50 shadow-2xl scale-105 z-10 bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5"
                    : "border-border/50 hover:border-primary/30 hover:shadow-xl hover:scale-102",
                  `delay-${index * 150}`
                )}>
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 shadow-lg px-4 py-1.5 text-white font-bold">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  {/* Icon & Name */}
                  <div className="text-center mb-8">
                    <div className={cn(
                      "inline-flex p-4 rounded-2xl mb-4 transition-transform hover:scale-110 duration-300",
                      plan.popular
                        ? "bg-gradient-to-br from-primary to-purple-500 text-white shadow-lg"
                        : "bg-muted"
                    )}>
                      <Icon className="h-7 w-7" />
                    </div>
                    <h3 className="text-3xl font-bold mb-2">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground font-medium">{plan.tagline}</p>
                  </div>

                  {/* Price */}
                  <div className="mb-8 text-center pb-8 border-b border-border">
                    <div className={cn(
                      "text-5xl font-bold mb-3",
                      plan.popular && "bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent"
                    )}>
                      {getPriceLabel(plan)}
                    </div>
                    {getPerUserLabel(plan) && (
                      <p className="text-sm text-muted-foreground font-medium">{getPerUserLabel(plan)}</p>
                    )}
                    <p className="text-base text-muted-foreground mt-3 leading-relaxed">{plan.description}</p>
                    {plan.id === 'team' && (
                      <div className="mt-6">
                        <Label htmlFor={`seats-${plan.id}`} className="text-sm text-muted-foreground block mb-3 font-medium">
                          Team size: <span className="font-bold text-foreground">{teamSeats} users</span>
                        </Label>
                        <input
                          id={`seats-${plan.id}`}
                          type="range"
                          min="2"
                          max="50"
                          value={teamSeats}
                          onChange={(e) => setTeamSeats(parseInt(e.target.value))}
                          className="w-full accent-primary"
                        />
                      </div>
                    )}
                  </div>

                  {/* CTA Button */}
                  <div className="mb-10">
                    <Button
                      className={cn(
                        "w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300",
                        plan.popular && "bg-gradient-to-r from-primary via-purple-500 to-pink-500 hover:scale-105"
                      )}
                      variant={plan.ctaVariant}
                      size="lg"
                      onClick={() => handleSelectPlan(plan.id)}
                      disabled={loading === plan.id}
                    >
                      {loading === plan.id ? 'Loading...' : (plan.id === 'team' && teamSeats >= 10 ? 'Contact Sales' : plan.cta)}
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </Button>
                  </div>

                  {/* Features */}
                  <div className="space-y-4 flex-1">
                    <ul className="space-y-3.5">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm">
                          <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400 font-bold" />
                          </div>
                          <span className="text-foreground leading-relaxed">{feature}</span>
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
        <div className="bg-gradient-to-br from-muted/50 via-muted/30 to-background py-24">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-4 border-primary/30">
                <Info className="h-3 w-3 mr-1.5" />
                Usage-Based Pricing
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-5 bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                Pay only for what you use
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Transparent, volume-based pricing for SMS, AI, and storage
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {usagePricing.map((category, idx) => (
                <Card key={idx} className="p-8 border-border/50 hover:border-primary/30 hover:shadow-xl transition-all duration-500">
                  <h3 className="text-2xl font-bold mb-6">{category.category}</h3>
                  <div className="space-y-4 mb-6">
                    {category.tiers.map((tier, tierIdx) => (
                      <div key={tierIdx} className="flex justify-between items-start text-sm">
                        <span className="text-muted-foreground leading-relaxed">{tier.range}</span>
                        <span className="font-bold text-right ml-3">{tier.price}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground leading-relaxed">{category.note}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Feature Comparison */}
        <div className="py-24">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-4 border-primary/30">
                Feature Comparison
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-5">
                Compare all features
              </h2>
            </div>

            <Card className="p-10 max-w-5xl mx-auto overflow-x-auto border-border/50 shadow-xl">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="text-left py-5 px-5 font-bold text-lg">Feature</th>
                    <th className="text-center py-5 px-5 font-bold text-lg">Starter</th>
                    <th className="text-center py-5 px-5 font-bold text-lg">Professional</th>
                    <th className="text-center py-5 px-5 font-bold text-lg">Team</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr className="transition-all hover:bg-muted/30">
                    <td className="py-5 px-5 text-sm font-semibold">AI Requests/Month</td>
                    <td className="py-5 px-5 text-center text-sm">10</td>
                    <td className="py-5 px-5 text-center text-sm font-bold text-primary">Unlimited</td>
                    <td className="py-5 px-5 text-center text-sm font-bold text-primary">Unlimited</td>
                  </tr>
                  <tr className="transition-all hover:bg-muted/30">
                    <td className="py-5 px-5 text-sm font-semibold">SMS Messaging</td>
                    <td className="py-5 px-5 text-center text-sm"><X className="h-5 w-5 mx-auto text-muted-foreground" /></td>
                    <td className="py-5 px-5 text-center text-sm"><Check className="h-6 w-6 mx-auto text-green-600" /></td>
                    <td className="py-5 px-5 text-center text-sm"><Check className="h-6 w-6 mx-auto text-green-600" /></td>
                  </tr>
                  <tr className="transition-all hover:bg-muted/30">
                    <td className="py-5 px-5 text-sm font-semibold">Team Members</td>
                    <td className="py-5 px-5 text-center text-sm">1</td>
                    <td className="py-5 px-5 text-center text-sm">1</td>
                    <td className="py-5 px-5 text-center text-sm font-bold text-primary">Unlimited</td>
                  </tr>
                  <tr className="transition-all hover:bg-muted/30">
                    <td className="py-5 px-5 text-sm font-semibold">Support</td>
                    <td className="py-5 px-5 text-center text-sm">Community</td>
                    <td className="py-5 px-5 text-center text-sm">Priority Email</td>
                    <td className="py-5 px-5 text-center text-sm font-bold text-primary">Dedicated</td>
                  </tr>
                  <tr className="transition-all hover:bg-muted/30">
                    <td className="py-5 px-5 text-sm font-semibold">Team Features</td>
                    <td className="py-5 px-5 text-center text-sm"><X className="h-5 w-5 mx-auto text-muted-foreground" /></td>
                    <td className="py-5 px-5 text-center text-sm"><X className="h-5 w-5 mx-auto text-muted-foreground" /></td>
                    <td className="py-5 px-5 text-center text-sm"><Check className="h-6 w-6 mx-auto text-green-600" /></td>
                  </tr>
                  <tr className="transition-all hover:bg-muted/30">
                    <td className="py-5 px-5 text-sm font-semibold">SSO & Security</td>
                    <td className="py-5 px-5 text-center text-sm"><X className="h-5 w-5 mx-auto text-muted-foreground" /></td>
                    <td className="py-5 px-5 text-center text-sm"><X className="h-5 w-5 mx-auto text-muted-foreground" /></td>
                    <td className="py-5 px-5 text-center text-sm"><Check className="h-6 w-6 mx-auto text-green-600" /></td>
                  </tr>
                </tbody>
              </table>
            </Card>
          </div>
        </div>

        {/* FAQs */}
        <div className="bg-gradient-to-br from-muted/50 via-muted/30 to-background py-24">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-4 border-primary/30">
                FAQs
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-5">
                Frequently asked questions
              </h2>
            </div>

            <Accordion type="single" collapsible className="max-w-3xl mx-auto">
              {faqs.map((faq, idx) => (
                <AccordionItem key={idx} value={`item-${idx}`} className="border-border/50">
                  <AccordionTrigger className="text-left font-bold text-lg hover:text-primary transition-colors">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed text-base">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-24">
          <div className="container mx-auto px-6">
            <Card className="p-16 text-center bg-gradient-to-br from-primary via-purple-500 to-pink-500 border-0 shadow-2xl hover:shadow-3xl transition-all duration-500">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
                Ready to transform your email?
              </h2>
              <p className="text-xl md:text-2xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
                Join 10,000+ professionals who save hours every day with EaseMail
              </p>
              <div className="flex flex-col sm:flex-row gap-5 justify-center">
                <Link href="/signup">
                  <Button size="lg" variant="secondary" className="min-w-[220px] h-14 text-lg font-semibold shadow-xl hover:shadow-2xl hover:scale-105 transition-all">
                    Start Free Trial
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </Link>
                <Link href="/contact-sales">
                  <Button size="lg" variant="outline" className="min-w-[220px] h-14 text-lg font-semibold bg-white/10 border-white/30 hover:bg-white/20 text-white backdrop-blur-sm">
                    Talk to Sales
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-white/80 mt-8 font-medium">
                No credit card required • Cancel anytime • 30-day money-back guarantee
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
