'use client';

import { useState } from 'react';
import {
  CheckCircle2, ChevronRight, ChevronLeft, Mail, Sparkles,
  Settings, Calendar, Users, Zap, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import VideoPlaceholder from './VideoPlaceholder';

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  component: React.ComponentType<any>;
}

const wizardSteps: WizardStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to EaseMail',
    description: 'Let\'s get you set up in just a few minutes',
    icon: Sparkles,
    component: WelcomeStep
  },
  {
    id: 'email-account',
    title: 'Connect Email Account',
    description: 'Connect your first email account',
    icon: Mail,
    component: EmailAccountStep
  },
  {
    id: 'preferences',
    title: 'Set Your Preferences',
    description: 'Customize your email experience',
    icon: Settings,
    component: PreferencesStep
  },
  {
    id: 'features',
    title: 'Enable Features',
    description: 'Choose which features to enable',
    icon: Zap,
    component: FeaturesStep
  },
  {
    id: 'complete',
    title: 'All Set!',
    description: 'You\'re ready to start using EaseMail',
    icon: CheckCircle2,
    component: CompleteStep
  }
];

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-6 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500">
        <Sparkles className="h-10 w-10 text-white" />
      </div>
      <div>
        <h2 className="text-3xl font-bold mb-3">Welcome to EaseMail!</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          The all-in-one email platform powered by AI. Let's set up your account and get you started in under 5 minutes.
        </p>
      </div>

      <VideoPlaceholder
        title="EaseMail Overview: What You'll Love"
        description="A quick 2-minute tour of EaseMail's most powerful features"
        duration="2:15"
        category="Introduction"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
        <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
          <Sparkles className="h-8 w-8 text-purple-600 mx-auto mb-2" />
          <h3 className="font-semibold mb-1">AI-Powered Writing</h3>
          <p className="text-sm text-muted-foreground">Write emails 10x faster with AI assistance</p>
        </div>
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
          <Mail className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <h3 className="font-semibold mb-1">Unified Inbox</h3>
          <p className="text-sm text-muted-foreground">Manage all your email accounts in one place</p>
        </div>
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
          <Zap className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <h3 className="font-semibold mb-1">Smart Automation</h3>
          <p className="text-sm text-muted-foreground">Automate repetitive tasks with rules</p>
        </div>
      </div>

      <Button size="lg" onClick={onNext} className="mt-6">
        Get Started
        <ChevronRight className="h-5 w-5 ml-2" />
      </Button>
    </div>
  );
}

function EmailAccountStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [provider, setProvider] = useState('');
  const [connecting, setConnecting] = useState(false);

  const handleConnect = () => {
    setConnecting(true);
    // Simulate connection
    setTimeout(() => {
      setConnecting(false);
      onNext();
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 mb-4">
          <Mail className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Connect Your Email Account</h2>
        <p className="text-muted-foreground">
          Choose your email provider to connect your first account
        </p>
      </div>

      <VideoPlaceholder
        title="How to Connect Your Email in 60 Seconds"
        duration="1:30"
        category="Setup"
      />

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label htmlFor="provider">Email Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger id="provider">
                <SelectValue placeholder="Choose your provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gmail">Gmail / Google Workspace</SelectItem>
                <SelectItem value="outlook">Outlook / Microsoft 365</SelectItem>
                <SelectItem value="yahoo">Yahoo Mail</SelectItem>
                <SelectItem value="imap">Other (IMAP/SMTP)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {provider && (
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold mb-2">What happens next?</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>You'll be redirected to {provider === 'gmail' ? 'Google' : provider === 'outlook' ? 'Microsoft' : 'your email provider'}</li>
                <li>Sign in and grant EaseMail permission to access your email</li>
                <li>We'll securely sync your emails (this may take 1-2 minutes)</li>
                <li>Your inbox will be ready to use!</li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={connecting}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleConnect} disabled={!provider || connecting} className="flex-1">
          {connecting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              Connect {provider ? (provider === 'gmail' ? 'Gmail' : provider === 'outlook' ? 'Outlook' : provider.toUpperCase()) : 'Account'}
              <ChevronRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function PreferencesStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [theme, setTheme] = useState('system');
  const [notifications, setNotifications] = useState(true);
  const [readingPane, setReadingPane] = useState('right');

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-4">
          <Settings className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Set Your Preferences</h2>
        <p className="text-muted-foreground">
          Customize your email experience (you can change these later)
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-3">
            <Label>Appearance</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light Mode</SelectItem>
                <SelectItem value="dark">Dark Mode</SelectItem>
                <SelectItem value="system">System Default</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose your preferred color theme
            </p>
          </div>

          <div className="space-y-3">
            <Label>Reading Pane Position</Label>
            <Select value={readingPane} onValueChange={setReadingPane}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="right">Right Side</SelectItem>
                <SelectItem value="bottom">Bottom</SelectItem>
                <SelectItem value="off">Off</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Where to display email preview
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="notifications" checked={notifications} onCheckedChange={(checked) => setNotifications(checked as boolean)} />
            <label htmlFor="notifications" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
              Enable desktop notifications for new emails
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={onNext} className="flex-1">
          Continue
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function FeaturesStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [features, setFeatures] = useState({
    aiWrite: true,
    voiceDictation: true,
    smartReplies: true,
    emailRules: true,
    calendar: false,
    sms: false
  });

  const toggleFeature = (key: string) => {
    setFeatures(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 mb-4">
          <Zap className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Enable Features</h2>
        <p className="text-muted-foreground">
          Choose which features you'd like to use
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {[
            { key: 'aiWrite', label: 'AI-Powered Email Writing', desc: 'Write professional emails 10x faster', badge: 'Recommended' },
            { key: 'voiceDictation', label: 'Voice Dictation', desc: 'Speak your emails hands-free', badge: 'Recommended' },
            { key: 'smartReplies', label: 'Smart Reply Suggestions', desc: 'Get AI-powered quick reply options' },
            { key: 'emailRules', label: 'Email Rules & Automation', desc: 'Automatically organize incoming emails', badge: 'Recommended' },
            { key: 'calendar', label: 'Calendar Integration', desc: 'Sync and manage your calendar', badge: 'Optional' },
            { key: 'sms', label: 'SMS Messaging', desc: 'Send SMS from contacts', badge: 'Pro Feature' }
          ].map((feature) => (
            <div key={feature.key} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
              <Checkbox
                id={feature.key}
                checked={features[feature.key as keyof typeof features]}
                onCheckedChange={() => toggleFeature(feature.key)}
              />
              <div className="flex-1">
                <label htmlFor={feature.key} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2">
                  {feature.label}
                  {feature.badge && (
                    <Badge variant={feature.badge === 'Recommended' ? 'default' : feature.badge === 'Pro Feature' ? 'secondary' : 'outline'} className="text-xs">
                      {feature.badge}
                    </Badge>
                  )}
                </label>
                <p className="text-sm text-muted-foreground mt-1">{feature.desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={onNext} className="flex-1">
          Finish Setup
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function CompleteStep({ onClose }: { onClose?: () => void }) {
  return (
    <div className="space-y-6 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500">
        <CheckCircle2 className="h-10 w-10 text-white" />
      </div>
      <div>
        <h2 className="text-3xl font-bold mb-3">You're All Set!</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Your EaseMail account is ready to use. Here are some things you can do next:
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="text-left hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Try AI Write
            </CardTitle>
            <CardDescription>
              Compose your first email with AI assistance in seconds
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="text-left hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5 text-yellow-500" />
              Create Email Rules
            </CardTitle>
            <CardDescription>
              Automatically organize your inbox with smart rules
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="text-left hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-blue-500" />
              Import Contacts
            </CardTitle>
            <CardDescription>
              Upload your contacts or sync from your email account
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="text-left hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-red-500" />
              Connect Calendar
            </CardTitle>
            <CardDescription>
              Sync your calendar and manage events from EaseMail
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Button size="lg" onClick={onClose || (() => window.location.href = '/inbox')}>
        Go to Inbox
        <ChevronRight className="h-5 w-5 ml-2" />
      </Button>

      <p className="text-sm text-muted-foreground">
        Need help? Check out our <a href="/help" className="text-primary hover:underline">Help Center</a> or watch our <a href="/help?section=videos" className="text-primary hover:underline">video tutorials</a>.
      </p>
    </div>
  );
}

export default function InteractiveSetupWizard({ onComplete }: { onComplete?: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => {
    if (currentStep < wizardSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete?.();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const progress = ((currentStep + 1) / wizardSteps.length) * 100;
  const CurrentStepComponent = wizardSteps[currentStep].component;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Step {currentStep + 1} of {wizardSteps.length}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Indicators */}
      <div className="flex justify-between">
        {wizardSteps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <div key={step.id} className="flex flex-col items-center flex-1">
              <div className={`
                w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all
                ${isCompleted ? 'bg-green-500 text-white' : isCurrent ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
              `}>
                {isCompleted ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <Icon className="h-6 w-6" />
                )}
              </div>
              <p className={`text-xs text-center hidden sm:block ${isCurrent ? 'font-semibold' : 'text-muted-foreground'}`}>
                {step.title}
              </p>
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          <CurrentStepComponent onNext={nextStep} onBack={prevStep} onClose={onComplete} />
        </CardContent>
      </Card>
    </div>
  );
}
