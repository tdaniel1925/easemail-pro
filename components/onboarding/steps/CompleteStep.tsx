'use client';

import { useOnboarding } from '../OnboardingProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

export default function CompleteStep() {
  const { completeOnboarding } = useOnboarding();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-6">
      <Card className="w-full max-w-2xl shadow-2xl border-2 border-primary">
        <CardHeader className="border-b bg-muted/30 pb-6 text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">
            You're All Set
          </CardTitle>
          <p className="text-muted-foreground mt-2 text-lg">
            You're ready to start managing your email more efficiently
          </p>
        </CardHeader>
        
        <CardContent className="pt-8 pb-8">
          {/* Quick Tips */}
          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-semibold text-primary">1</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Connect Your First Account</h3>
                <p className="text-sm text-muted-foreground">
                  Click "Add Account" in the sidebar to link your email provider
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-semibold text-primary">2</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Explore AI Features</h3>
                <p className="text-sm text-muted-foreground">
                  Use the AI assistant when composing emails to save time
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-semibold text-primary">3</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Customize Your Settings</h3>
                <p className="text-sm text-muted-foreground">
                  Visit Settings to configure signatures, rules, and preferences
                </p>
              </div>
            </div>
          </div>

          {/* Action */}
          <div className="text-center">
            <Button
              onClick={completeOnboarding}
              size="lg"
              className="px-8 h-12 text-base"
            >
              Get Started
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              You can restart this tour anytime from Settings → Help & Support
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
