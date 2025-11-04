'use client';

import { useOnboarding } from '../OnboardingProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Mail, Zap, Clock, TrendingUp, CheckCircle } from 'lucide-react';

export default function WelcomeStep() {
  const { nextStep, skipOnboarding } = useOnboarding();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <Card className="max-w-xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border-primary">
        <CardContent className="p-6">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
              <Sparkles className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold mb-3">
              Welcome to EaseMail! 🎉
            </h1>
            <p className="text-xl text-muted-foreground">
              Let's get you set up in just 2 minutes
            </p>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Save 5+ Hours Weekly</h3>
                <p className="text-sm text-muted-foreground">
                  AI handles routine emails so you focus on what matters
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                <Zap className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">10x Faster Writing</h3>
                <p className="text-sm text-muted-foreground">
                  Compose professional emails in seconds with AI
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Inbox Zero Daily</h3>
                <p className="text-sm text-muted-foreground">
                  Smart automation keeps your inbox organized
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <Mail className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Never Miss Important Emails</h3>
                <p className="text-sm text-muted-foreground">
                  AI prioritization surfaces what needs attention
                </p>
              </div>
            </div>
          </div>

          {/* What You'll Learn */}
          <div className="mb-8 p-4 rounded-lg border border-border">
            <h3 className="font-semibold mb-3">What you'll learn in this tour:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Connect your email account</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Create professional signatures</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Write emails with AI</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Record voice messages</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Send SMS from contacts</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Master navigation & shortcuts</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={nextStep}
              size="lg"
              className="flex-1 text-lg h-12"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Get Started
            </Button>
            <Button
              onClick={skipOnboarding}
              variant="ghost"
              size="lg"
              className="h-12"
            >
              Skip Tour
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-4">
            You can restart this tour anytime from Settings → Help & Support
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

