'use client';

import { useOnboarding } from '../OnboardingProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PartyPopper, CheckCircle, BookOpen, Video, MessageCircle } from 'lucide-react';

export default function CompleteStep() {
  const { completeOnboarding } = useOnboarding();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <Card className="max-w-2xl w-full mx-4 shadow-2xl border-primary">
        <CardContent className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-400 to-blue-500 rounded-full mb-4 animate-bounce">
              <PartyPopper className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-3">
              You're All Set! 🎊
            </h1>
            <p className="text-xl text-muted-foreground">
              You've completed the EaseMail tour!
            </p>
          </div>

          {/* Completed Items */}
          <div className="bg-muted/50 rounded-lg p-6 mb-8">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              What you've learned:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm">Connected email accounts</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm">Professional signatures</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm">AI-powered writing</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm">Voice messages</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm">SMS from contacts</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm">Navigation & shortcuts</span>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="space-y-3 mb-8">
            <h3 className="font-semibold">Need more help?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <a
                href="/settings?section=help"
                className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-accent transition-colors"
              >
                <BookOpen className="h-5 w-5 text-primary" />
                <div className="text-sm">
                  <div className="font-medium">Help Center</div>
                  <div className="text-muted-foreground text-xs">Guides & tutorials</div>
                </div>
              </a>

              <a
                href="/settings?section=help&tab=videos"
                className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-accent transition-colors"
              >
                <Video className="h-5 w-5 text-primary" />
                <div className="text-sm">
                  <div className="font-medium">Video Tutorials</div>
                  <div className="text-muted-foreground text-xs">Watch & learn</div>
                </div>
              </a>

              <a
                href="mailto:support@easemail.app"
                className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-accent transition-colors"
              >
                <MessageCircle className="h-5 w-5 text-primary" />
                <div className="text-sm">
                  <div className="font-medium">Get Support</div>
                  <div className="text-muted-foreground text-xs">We're here to help</div>
                </div>
              </a>
            </div>
          </div>

          {/* Action */}
          <Button
            onClick={completeOnboarding}
            size="lg"
            className="w-full text-lg h-12"
          >
            Start Using EaseMail →
          </Button>

          <p className="text-center text-xs text-muted-foreground mt-4">
            💡 Tip: Press <kbd className="px-2 py-1 bg-muted rounded text-xs">?</kbd> anytime to see keyboard shortcuts
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

