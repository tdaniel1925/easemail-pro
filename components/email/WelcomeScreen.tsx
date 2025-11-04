'use client';

import { Mail, FileSignature, Sparkles, ArrowRight, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function WelcomeScreen() {
  const handleAddAccount = () => {
    // Scroll to bottom left where "Add Account" button is
    const addAccountButton = document.querySelector('[data-add-account]');
    if (addAccountButton) {
      addAccountButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Optional: highlight the button temporarily
      addAccountButton.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
      setTimeout(() => {
        addAccountButton.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
      }, 2000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-muted/30">
      <Card className="max-w-2xl p-8 shadow-lg">
        <div className="text-center space-y-6">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full">
            <Mail className="w-8 h-8 text-primary" />
          </div>

          {/* Headline */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Welcome to EaseMail</h1>
            <p className="text-muted-foreground">
              Get started by following these steps
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-3 text-left pt-4">
            <div className="flex items-start gap-4 p-4 rounded-lg bg-background border border-border hover:border-primary/50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm flex-shrink-0">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Connect Your Email Account
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Click the <span className="font-medium text-foreground">Add Account</span> button in the lower left sidebar to connect Gmail, Outlook, or any IMAP email provider.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-lg bg-background border border-border hover:border-primary/50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm flex-shrink-0">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                  <FileSignature className="w-4 h-4" />
                  Add Your Email Signature
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Navigate to Settings to create professional email signatures that will be automatically included in your messages.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-lg bg-background border border-border hover:border-primary/50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm flex-shrink-0">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Try AI-Enhanced Email Composition
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Click the <span className="font-medium text-foreground">Compose</span> button to write emails with AI assistance and smart templates.
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="pt-6 space-y-3">
            <Button 
              size="lg" 
              className="w-full gap-2"
              onClick={handleAddAccount}
            >
              Get Started - Add Your First Account
              <ArrowRight className="w-4 h-4" />
            </Button>
            <p className="text-xs text-muted-foreground">
              Your email data is encrypted and secured with enterprise-grade protection
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

