'use client';

import { useState } from 'react';
import {
  CheckCircle2, Circle, ChevronRight, Mail, Sparkles,
  FileText, Users, Settings, Zap, PlayCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import VideoPlaceholder from './VideoPlaceholder';

interface QuickStartStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  timeEstimate: string;
  videoTitle?: string;
  videoDuration?: string;
  detailedInstructions: string[];
  tips?: string[];
  completed?: boolean;
}

const quickStartSteps: QuickStartStep[] = [
  {
    id: 'connect-email',
    title: 'Connect Your First Email Account',
    description: 'Link your Gmail, Outlook, or IMAP email account to get started',
    icon: Mail,
    timeEstimate: '2 minutes',
    videoTitle: 'How to Connect Your Email in 60 Seconds',
    videoDuration: '1:30',
    detailedInstructions: [
      'Click on "Accounts" in the left sidebar',
      'Click the "+ Add Account" button',
      'Choose your email provider (Gmail, Outlook, or Custom IMAP)',
      'Follow the authentication flow to grant access',
      'Wait for initial sync to complete (usually 1-2 minutes)',
      'Your emails will appear in the Inbox'
    ],
    tips: [
      'Gmail users: Make sure to enable "Less secure app access" or use App Passwords',
      'Outlook users: You may need to enable IMAP in your Outlook.com settings',
      'You can connect multiple accounts and switch between them easily'
    ]
  },
  {
    id: 'ai-assistant',
    title: 'Try AI-Powered Email Writing',
    description: 'Write professional emails 10x faster with AI assistance',
    icon: Sparkles,
    timeEstimate: '3 minutes',
    videoTitle: 'AI Write: Compose Emails in Seconds',
    videoDuration: '3:15',
    detailedInstructions: [
      'Click "Compose" button or press "C" keyboard shortcut',
      'In the compose window, click the "AI Write" button (sparkle icon)',
      'Describe what you want to write (e.g., "Thank you email for job interview")',
      'Choose your tone: Professional, Friendly, Casual, or Formal',
      'Select language if needed (supports 50+ languages)',
      'Click "Generate" and watch AI create your email',
      'Review, edit if needed, and send!'
    ],
    tips: [
      'Be specific in your prompt for better results',
      'You can regenerate multiple times to get different versions',
      'Use the "Improve" button to refine existing drafts',
      'Pro tip: Voice dictation works with AI Write for hands-free composition'
    ]
  },
  {
    id: 'email-signature',
    title: 'Create Your Professional Signature',
    description: 'Add a branded signature to all outgoing emails',
    icon: FileText,
    timeEstimate: '5 minutes',
    videoTitle: 'Creating Beautiful Email Signatures',
    videoDuration: '4:45',
    detailedInstructions: [
      'Go to Settings → Email Signatures',
      'Click "Create New Signature"',
      'Enter your name, title, and company',
      'Add contact information (phone, email, website)',
      'Optionally upload a logo or profile picture',
      'Format text with colors, fonts, and styles',
      'Add social media links if desired',
      'Set as default signature',
      'Choose which accounts use this signature'
    ],
    tips: [
      'Keep it professional and concise (4-6 lines maximum)',
      'Use consistent branding colors from your company',
      'Include only essential contact methods',
      'Test how it looks on mobile devices'
    ]
  },
  {
    id: 'organize-contacts',
    title: 'Import and Organize Contacts',
    description: 'Build your contact database for easy communication',
    icon: Users,
    timeEstimate: '5 minutes',
    videoTitle: 'Contact Management Master Class',
    videoDuration: '6:20',
    detailedInstructions: [
      'Navigate to Contacts section',
      'Click "Import Contacts" to upload from CSV or vCard',
      'Or add manually by clicking "+ New Contact"',
      'Fill in contact details: name, email, phone, company',
      'Add custom fields and notes as needed',
      'Create contact groups/lists for easy filtering',
      'Tag contacts with categories (client, vendor, personal, etc.)',
      'Sync contacts with your email account'
    ],
    tips: [
      'CSV imports should have headers: name, email, phone, company',
      'You can merge duplicate contacts automatically',
      'Use tags to organize contacts by projects or categories',
      'Send SMS directly from contacts if phone number is added'
    ]
  },
  {
    id: 'automate-rules',
    title: 'Set Up Email Rules & Automation',
    description: 'Automatically organize incoming emails and save time',
    icon: Zap,
    timeEstimate: '10 minutes',
    videoTitle: 'Email Automation 101',
    videoDuration: '8:30',
    detailedInstructions: [
      'Go to Rules section in the sidebar',
      'Click "Create New Rule"',
      'Name your rule (e.g., "Client Emails")',
      'Set conditions: from address, subject contains, has attachment, etc.',
      'Choose actions: move to folder, mark as read, star, apply label',
      'Test the rule with sample emails',
      'Activate the rule',
      'Monitor rule performance in Analytics'
    ],
    tips: [
      'Start with simple rules and gradually add complexity',
      'Common rule: Move newsletters to a "Reading List" folder',
      'Auto-star emails from your boss or key clients',
      'Use "AND" conditions for precise filtering'
    ]
  },
  {
    id: 'customize-settings',
    title: 'Customize Your Experience',
    description: 'Personalize EaseMail to match your workflow',
    icon: Settings,
    timeEstimate: '5 minutes',
    videoTitle: 'Settings & Customization Guide',
    videoDuration: '5:10',
    detailedInstructions: [
      'Open Settings from the sidebar',
      'Appearance: Choose light/dark theme',
      'Notifications: Enable desktop/email alerts',
      'Keyboard Shortcuts: Review and customize shortcuts',
      'Reading Pane: Configure preview pane position',
      'Default Send: Set default reply/forward settings',
      'Privacy: Manage data sharing preferences',
      'Integrations: Connect calendar, tasks, etc.'
    ],
    tips: [
      'Enable keyboard shortcuts to work 3x faster',
      'Set up email forwarding rules for urgent messages',
      'Configure notification preferences to avoid distractions',
      'Explore advanced settings for power user features'
    ]
  }
];

export default function QuickStartGuide() {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const toggleStep = (stepId: string) => {
    setExpandedStep(expandedStep === stepId ? null : stepId);
  };

  const markCompleted = (stepId: string) => {
    setCompletedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  const progress = (completedSteps.size / quickStartSteps.length) * 100;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 mb-4">
          <PlayCircle className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold">Quick Start Guide</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Follow these steps to get the most out of EaseMail in under 30 minutes
        </p>
      </div>

      {/* Progress Tracker */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Your Progress</p>
                <p className="text-2xl font-bold">{completedSteps.size} of {quickStartSteps.length} completed</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Estimated time remaining</p>
                <p className="text-lg font-semibold">
                  {quickStartSteps
                    .filter(step => !completedSteps.has(step.id))
                    .reduce((total, step) => total + parseInt(step.timeEstimate), 0)} min
                </p>
              </div>
            </div>
            <Progress value={progress} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-4">
        {quickStartSteps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = completedSteps.has(step.id);
          const isExpanded = expandedStep === step.id;

          return (
            <Card key={step.id} className={isCompleted ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' : ''}>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => toggleStep(step.id)}>
                <div className="flex items-start gap-4">
                  {/* Step Number / Checkmark */}
                  <div className="flex-shrink-0">
                    {isCompleted ? (
                      <CheckCircle2 className="h-8 w-8 text-green-600 fill-green-100 dark:fill-green-950" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {index + 1}
                      </div>
                    )}
                  </div>

                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-xl">{step.title}</CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        {step.timeEstimate}
                      </Badge>
                    </div>
                    <CardDescription className="text-base">{step.description}</CardDescription>
                  </div>

                  {/* Expand Icon */}
                  <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="space-y-6 pt-0">
                  {/* Video Placeholder */}
                  {step.videoTitle && (
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <PlayCircle className="h-5 w-5 text-purple-500" />
                        Video Tutorial
                      </h4>
                      <VideoPlaceholder
                        title={step.videoTitle}
                        duration={step.videoDuration}
                        category="Quick Start"
                      />
                    </div>
                  )}

                  {/* Step-by-Step Instructions */}
                  <div>
                    <h4 className="font-semibold mb-3">Step-by-Step Instructions</h4>
                    <ol className="space-y-3">
                      {step.detailedInstructions.map((instruction, idx) => (
                        <li key={idx} className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {idx + 1}
                          </span>
                          <span className="flex-1 text-sm pt-0.5">{instruction}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Tips */}
                  {step.tips && step.tips.length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h4 className="font-semibold mb-3 text-blue-900 dark:text-blue-100">Pro Tips</h4>
                      <ul className="space-y-2">
                        {step.tips.map((tip, idx) => (
                          <li key={idx} className="flex gap-2 text-sm text-blue-800 dark:text-blue-200">
                            <Zap className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Mark Complete Button */}
                  <div className="flex justify-end pt-4 border-t">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        markCompleted(step.id);
                      }}
                      variant={isCompleted ? 'outline' : 'default'}
                    >
                      {isCompleted ? (
                        <>
                          <Circle className="h-4 w-4 mr-2" />
                          Mark as Incomplete
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Mark as Complete
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Completion Message */}
      {completedSteps.size === quickStartSteps.length && (
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-500">
          <CardContent className="text-center py-8">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Congratulations!</h3>
            <p className="text-muted-foreground mb-6">
              You've completed the Quick Start Guide. You're now ready to master EaseMail!
            </p>
            <Button variant="default" size="lg">
              Explore Advanced Features
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
