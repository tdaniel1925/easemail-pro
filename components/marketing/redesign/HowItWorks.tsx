/**
 * How It Works Section - Step-by-step guide
 */

'use client';

import { Card } from '@/components/ui/card';
import { Check, Mail, Sparkles, Zap, ArrowRight } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Connect Your Accounts',
      description: 'Link all your email accounts (Gmail, Outlook, etc.) in seconds with our secure OAuth integration.',
      icon: Mail,
      image: '/assets/marketing/email-organization.png',
    },
    {
      number: '02',
      title: 'AI Learns Your Style',
      description: 'Our AI analyzes your writing patterns to provide personalized suggestions that match your tone.',
      icon: Sparkles,
      image: '/assets/marketing/ai-assistant-feature.png',
    },
    {
      number: '03',
      title: 'Start Being Productive',
      description: 'Experience lightning-fast email management with AI-powered features that save hours every day.',
      icon: Zap,
      image: '/assets/marketing/productivity-dashboard.png',
    },
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Get Started in Minutes
          </h2>
          <p className="text-lg text-muted-foreground">
            Three simple steps to transform your email experience
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <Card className="p-8 h-full overflow-hidden group">
                <div className="flex flex-col items-center text-center">
                  {/* Image preview */}
                  <div className="w-full -mx-8 -mt-8 mb-6 overflow-hidden">
                    <img
                      src={step.image}
                      alt={step.title}
                      className="w-full h-40 object-cover object-center group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Number */}
                  <div className="text-5xl font-bold text-primary/20 mb-4">
                    {step.number}
                  </div>

                  {/* Icon */}
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <step.icon className="h-8 w-8 text-primary" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </Card>

              {/* Arrow between steps (desktop only) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                  <ArrowRight className="h-8 w-8 text-muted-foreground/30" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Benefits List */}
        <div className="mx-auto max-w-3xl">
          <Card className="p-8">
            <h3 className="text-xl font-semibold mb-6 text-center">What you get with EaseMail</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                '14-day free trial, no credit card required',
                'Unlimited email accounts',
                'Advanced AI features included',
                'Priority customer support',
                'Cancel anytime, no questions asked',
                'Data export available anytime',
              ].map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{benefit}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

