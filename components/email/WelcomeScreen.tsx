'use client';

import { Mail, FileSignature, Sparkles, ArrowRight, Settings, Zap, HelpCircle, Shield, Calendar, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

export default function WelcomeScreen() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/accounts-v3');
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-muted/30 overflow-y-auto">
      <Card className="max-w-4xl p-8 shadow-lg">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full mb-2">
              <Mail className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Welcome to EaseMail</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Your AI-powered email client that makes communication effortless
            </p>
          </div>

          {/* Quick Start Guide */}
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold mb-2">Quick Start Guide</h2>
              <p className="text-sm text-muted-foreground">Follow these simple steps to get started in minutes</p>
            </div>

            {/* Step 1: Connect Email */}
            <Card className="p-5 border-2 hover:border-primary/50 transition-colors bg-background">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg flex-shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-primary" />
                    Connect Your Email Account
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                    Connect Gmail, Outlook, or any IMAP email provider to access all your emails in one place.
                    The setup process is secure and takes about 2 minutes.
                  </p>
                  <div className="bg-muted/50 rounded-lg p-3 mb-3 text-sm">
                    <p className="font-medium mb-1">Supported Providers:</p>
                    <ul className="space-y-1 text-muted-foreground ml-4">
                      <li>• Gmail (Google Workspace)</li>
                      <li>• Outlook / Office 365</li>
                      <li>• Yahoo Mail</li>
                      <li>• Any IMAP/SMTP provider</li>
                    </ul>
                  </div>
                  <Link href="/accounts-v3">
                    <Button size="sm" className="gap-2">
                      Add Email Account
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>

            {/* Step 2: Explore Interface */}
            <Card className="p-5 border hover:border-primary/30 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-muted text-foreground flex items-center justify-center font-bold text-lg flex-shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">Explore Your Inbox</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                    After connecting your account, you'll have access to:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mb-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span>Unified inbox for all accounts</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Integrated calendar</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>Contact management</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Sparkles className="w-4 h-4" />
                      <span>AI-powered features</span>
                    </div>
                  </div>
                  <Link href="/help">
                    <Button size="sm" variant="outline" className="gap-2">
                      Learn More About Interface
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>

            {/* Step 3: Create Signature */}
            <Card className="p-5 border hover:border-primary/30 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-muted text-foreground flex items-center justify-center font-bold text-lg flex-shrink-0">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <FileSignature className="w-5 h-5" />
                    Create Your Email Signature
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                    Add a professional signature to all your outgoing emails. Include your name, title, contact information,
                    and even your company logo. Takes about 3 minutes to set up.
                  </p>
                  <Link href="/settings">
                    <Button size="sm" variant="outline" className="gap-2">
                      Go to Settings → Signatures
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>

            {/* Step 4: Try AI Features */}
            <Card className="p-5 border hover:border-primary/30 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-muted text-foreground flex items-center justify-center font-bold text-lg flex-shrink-0">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                    Try AI-Powered Email Composition
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                    Use the <strong>Compose</strong> button to write emails with AI assistance.
                    Simply describe what you want to write, choose your tone, and let AI create a professional email in seconds.
                  </p>
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      <strong>Pro Tip:</strong> Try voice dictation to compose emails hands-free!
                    </p>
                  </div>
                  <Link href="/help">
                    <Button size="sm" variant="outline" className="gap-2">
                      Learn About AI Features
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>

            {/* Step 5: Set Up Automation (Optional) */}
            <Card className="p-5 border hover:border-primary/30 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-muted text-foreground flex items-center justify-center font-bold text-lg flex-shrink-0">
                  5
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-orange-500" />
                    Set Up Email Rules (Optional)
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                    Automate your email workflow with custom rules. Automatically organize emails into folders,
                    mark as read, star important messages, and more.
                  </p>
                  <div className="text-sm text-muted-foreground mb-3">
                    <p className="font-medium mb-1">Example rules:</p>
                    <ul className="space-y-1 ml-4">
                      <li>• Move newsletters to "Reading List" folder</li>
                      <li>• Auto-star emails from your boss</li>
                      <li>• Mark promotional emails as read</li>
                    </ul>
                  </div>
                  <Link href="/rules">
                    <Button size="sm" variant="outline" className="gap-2">
                      Create Email Rules
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </div>

          {/* Help Section */}
          <div className="border-t pt-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">Need Help?</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Visit our comprehensive Help Center for detailed guides, video tutorials, FAQs, and troubleshooting tips.
                  </p>
                  <div className="flex gap-2">
                    <Link href="/help">
                      <Button variant="outline" size="sm" className="gap-2">
                        <HelpCircle className="w-4 h-4" />
                        Open Help Center
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="space-y-4 border-t pt-6">
            <Button
              size="lg"
              className="w-full gap-2 text-lg py-6"
              onClick={handleGetStarted}
            >
              <Mail className="w-5 h-5" />
              Get Started - Connect Your First Account
              <ArrowRight className="w-5 h-5" />
            </Button>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-4 h-4" />
              <p>Your email data is encrypted and secured with enterprise-grade protection</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
