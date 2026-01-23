'use client';

import { useState } from 'react';
import { Check, Mail, CreditCard, Sparkles, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface OnboardingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type Step = 'welcome' | 'connect' | 'plan' | 'done';

export function OnboardingFlow({ isOpen, onClose, onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  if (!isOpen) return null;

  const steps: { id: Step; number: number; label: string }[] = [
    { id: 'welcome', number: 1, label: 'Welcome' },
    { id: 'connect', number: 2, label: 'Connect Email' },
    { id: 'plan', number: 3, label: 'Choose Plan' },
    { id: 'done', number: 4, label: 'Done' },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const handleNext = () => {
    if (currentStep === 'welcome') setCurrentStep('connect');
    else if (currentStep === 'connect' && selectedProvider) setCurrentStep('plan');
    else if (currentStep === 'plan') setCurrentStep('done');
  };

  const handleSkip = () => {
    onComplete();
    onClose();
  };

  const handleComplete = () => {
    onComplete();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm fade-in" />

      {/* Centered Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl slide-up border-primary/20 shadow-2xl">
          {/* Close Button */}
          <div className="absolute top-4 right-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkip}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress Indicator */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between max-w-md mx-auto">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  {/* Step Circle */}
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        'h-10 w-10 rounded-full flex items-center justify-center transition-smooth',
                        index <= currentStepIndex
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {index < currentStepIndex ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <span className="text-sm font-semibold">{step.number}</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground mt-2">
                      {step.label}
                    </span>
                  </div>

                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        'h-0.5 w-16 mx-2 transition-smooth',
                        index < currentStepIndex ? 'bg-primary' : 'bg-muted'
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Welcome Step */}
            {currentStep === 'welcome' && (
              <div className="text-center fade-in">
                <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-3xl font-bold mb-4">
                  Welcome to EaseMail! 👋
                </h2>
                <p className="text-lg text-muted-foreground max-w-lg mx-auto mb-8">
                  Let's get you set up in just a few minutes. We'll help you connect your email and choose the perfect plan.
                </p>
                <div className="flex justify-center gap-4">
                  <Button size="lg" onClick={handleNext} className="btn-press min-w-[200px]">
                    Get Started
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Connect Email Step */}
            {currentStep === 'connect' && (
              <div className="fade-in">
                <div className="text-center mb-8">
                  <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">
                    Connect your email account
                  </h2>
                  <p className="text-muted-foreground">
                    Choose your email provider to get started
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {/* Gmail */}
                  <button
                    onClick={() => setSelectedProvider('gmail')}
                    className={cn(
                      'p-6 border-2 rounded-lg transition-smooth hover:border-primary/50 hover:shadow-md text-center',
                      selectedProvider === 'gmail'
                        ? 'border-primary bg-primary/5'
                        : 'border-border'
                    )}
                  >
                    <div className="h-12 w-12 mx-auto mb-3 bg-gradient-to-br from-red-500 to-yellow-500 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                      G
                    </div>
                    <div className="font-semibold mb-1">Gmail</div>
                    <div className="text-xs text-muted-foreground">
                      Google Workspace
                    </div>
                  </button>

                  {/* Outlook */}
                  <button
                    onClick={() => setSelectedProvider('outlook')}
                    className={cn(
                      'p-6 border-2 rounded-lg transition-smooth hover:border-primary/50 hover:shadow-md text-center',
                      selectedProvider === 'outlook'
                        ? 'border-primary bg-primary/5'
                        : 'border-border'
                    )}
                  >
                    <div className="h-12 w-12 mx-auto mb-3 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                      O
                    </div>
                    <div className="font-semibold mb-1">Outlook</div>
                    <div className="text-xs text-muted-foreground">
                      Microsoft 365
                    </div>
                  </button>

                  {/* Other */}
                  <button
                    onClick={() => setSelectedProvider('other')}
                    className={cn(
                      'p-6 border-2 rounded-lg transition-smooth hover:border-primary/50 hover:shadow-md text-center',
                      selectedProvider === 'other'
                        ? 'border-primary bg-primary/5'
                        : 'border-border'
                    )}
                  >
                    <div className="h-12 w-12 mx-auto mb-3 bg-muted rounded-lg flex items-center justify-center">
                      <Mail className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="font-semibold mb-1">Other</div>
                    <div className="text-xs text-muted-foreground">
                      IMAP/Exchange
                    </div>
                  </button>
                </div>

                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setCurrentStep('welcome')}>
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!selectedProvider}
                    className="btn-press"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Choose Plan Step */}
            {currentStep === 'plan' && (
              <div className="fade-in">
                <div className="text-center mb-8">
                  <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <CreditCard className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">
                    Choose your plan
                  </h2>
                  <p className="text-muted-foreground">
                    Start free and upgrade when you're ready
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {/* Starter */}
                  <Link href="/signup" className="block">
                    <Card className="p-6 card-hover transition-smooth cursor-pointer h-full">
                      <Badge variant="outline" className="mb-4">Starter</Badge>
                      <div className="text-3xl font-bold mb-2">$0</div>
                      <div className="text-sm text-muted-foreground mb-4">
                        Free forever
                      </div>
                      <ul className="space-y-2 mb-6">
                        <li className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                          <span>Unlimited emails</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                          <span>10 AI requests/mo</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                          <span>Community support</span>
                        </li>
                      </ul>
                      <Button variant="outline" className="w-full btn-press">
                        Start Free
                      </Button>
                    </Card>
                  </Link>

                  {/* Professional */}
                  <Link href="/signup?plan=professional" className="block">
                    <Card className="p-6 border-primary shadow-lg relative h-full">
                      <Badge className="mb-4 bg-primary">Most Popular</Badge>
                      <div className="text-3xl font-bold mb-2">$45</div>
                      <div className="text-sm text-muted-foreground mb-4">
                        per month
                      </div>
                      <ul className="space-y-2 mb-6">
                        <li className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                          <span>Unlimited AI</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                          <span>SMS messaging</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                          <span>Priority support</span>
                        </li>
                      </ul>
                      <Button className="w-full btn-press">
                        Start 14-Day Trial
                      </Button>
                    </Card>
                  </Link>

                  {/* Team */}
                  <Link href="/signup?plan=team" className="block">
                    <Card className="p-6 card-hover transition-smooth cursor-pointer h-full">
                      <Badge variant="outline" className="mb-4">Team</Badge>
                      <div className="text-3xl font-bold mb-2">$40</div>
                      <div className="text-sm text-muted-foreground mb-4">
                        per user/month
                      </div>
                      <ul className="space-y-2 mb-6">
                        <li className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                          <span>Everything in Pro</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                          <span>Team features</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                          <span>SSO & security</span>
                        </li>
                      </ul>
                      <Button variant="outline" className="w-full btn-press">
                        Start Team Trial
                      </Button>
                    </Card>
                  </Link>
                </div>

                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setCurrentStep('connect')}>
                    Back
                  </Button>
                  <Button onClick={handleNext} className="btn-press">
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Done Step */}
            {currentStep === 'done' && (
              <div className="text-center fade-in">
                <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-accent/10">
                  <Check className="h-10 w-10 text-accent" />
                </div>
                <h2 className="text-3xl font-bold mb-4">
                  You're all set! 🎉
                </h2>
                <p className="text-lg text-muted-foreground max-w-lg mx-auto mb-4">
                  We're syncing your emails now. This may take a few moments.
                </p>
                <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-8">
                  You can start composing emails right away, and your inbox will populate as emails sync in the background.
                </p>
                <div className="flex justify-center gap-4">
                  <Button size="lg" onClick={handleComplete} className="btn-press min-w-[200px]">
                    Go to Inbox
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Skip Link */}
          {currentStep !== 'done' && (
            <div className="text-center pb-6">
              <button
                onClick={handleSkip}
                className="text-sm text-muted-foreground hover:text-foreground transition-smooth"
              >
                Skip for now
              </button>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
