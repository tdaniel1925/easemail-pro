'use client';

import { useOnboarding } from '../OnboardingProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export default function WelcomeStep() {
  const { nextStep, skipOnboarding } = useOnboarding();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-6">
      <Card className="w-full max-w-3xl shadow-2xl border-2 border-primary">
        <CardHeader className="border-b bg-muted/30 pb-6">
          <CardTitle className="text-3xl font-bold text-center">
            Welcome to EaseMail
          </CardTitle>
          <p className="text-center text-muted-foreground mt-2 text-lg">
            Let's get you set up in just a few minutes
          </p>
        </CardHeader>
        
        <CardContent className="pt-8 pb-8">
          {/* Key Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">AI-Powered Writing</h3>
                  <p className="text-sm text-muted-foreground">
                    Compose professional emails in seconds with intelligent assistance
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">Smart Organization</h3>
                  <p className="text-sm text-muted-foreground">
                    Automated sorting and prioritization keeps your inbox clean
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">Multi-Channel Communication</h3>
                  <p className="text-sm text-muted-foreground">
                    Email, SMS, and voice messages in one unified platform
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">Professional Signatures</h3>
                  <p className="text-sm text-muted-foreground">
                    Create branded email signatures with custom templates
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="mb-8">
            <div className="rounded-lg border-2 border-muted overflow-hidden shadow-lg">
              <img 
                src="/onboarding/welcome-hero.png" 
                alt="EaseMail Dashboard Preview"
                className="w-full h-auto"
                onError={(e) => {
                  // Fallback to placeholder if image doesn't exist
                  e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="400"%3E%3Crect width="800" height="400" fill="%23f1f5f9"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="system-ui" font-size="18" fill="%2394a3b8"%3EYour Dashboard Preview%3C/text%3E%3C/svg%3E';
                }}
              />
            </div>
            <p className="text-center text-xs text-muted-foreground mt-3">
              Your unified email management dashboard
            </p>
          </div>

          {/* Tour Overview */}
          <div className="bg-muted/50 rounded-lg p-6 mb-8">
            <h3 className="font-semibold mb-4 text-center">What You'll Learn</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                  1
                </div>
                <span>Connect Email</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                  2
                </div>
                <span>Create Signature</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                  3
                </div>
                <span>AI Writing</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                  4
                </div>
                <span>Voice Messages</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                  5
                </div>
                <span>SMS Features</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                  6
                </div>
                <span>Navigation</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <Button
              onClick={nextStep}
              size="lg"
              className="w-full sm:flex-1 h-12 text-base"
            >
              Start Tour
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            <Button
              onClick={skipOnboarding}
              variant="outline"
              size="lg"
              className="w-full sm:w-auto h-12"
            >
              Skip for Now
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Takes approximately 2-3 minutes • You can restart anytime from Settings
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
