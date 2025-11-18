'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Check, AlertCircle, Mail, Brain, FileText, Zap } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAccounts } from '@/lib/hooks/use-accounts';
import { Progress } from '@/components/ui/progress';

type LearningStage =
  | 'fetching'
  | 'analyzing-tone'
  | 'analyzing-structure'
  | 'analyzing-vocabulary'
  | 'generating-profile'
  | 'complete';

interface LearningProgress {
  stage: LearningStage;
  progress: number;
  message: string;
  emailsFound?: number;
  insights?: string[];
}

export function WritingStyleSettings() {
  const { toast } = useToast();
  const { accounts } = useAccounts();
  const [loading, setLoading] = useState(false);
  const [learningProgress, setLearningProgress] = useState<LearningProgress | null>(null);
  const [styleProfile, setStyleProfile] = useState<string | null>(null);
  const [hasStyle, setHasStyle] = useState(false);
  const [usePersonalStyle, setUsePersonalStyle] = useState(true);
  const [learnedAt, setLearnedAt] = useState<string | null>(null);
  const [fetchingStatus, setFetchingStatus] = useState(true);

  // Fetch current style status
  useEffect(() => {
    fetchStyleStatus();
  }, []);

  const fetchStyleStatus = async () => {
    try {
      setFetchingStatus(true);
      const response = await fetch('/api/ai/learn-style');
      const data = await response.json();

      if (data.success) {
        setHasStyle(data.hasStyle);
        setStyleProfile(data.styleProfile);
        setLearnedAt(data.learnedAt);
        setUsePersonalStyle(data.usePersonalStyle ?? true);
      }
    } catch (error) {
      console.error('Failed to fetch style status:', error);
    } finally {
      setFetchingStatus(false);
    }
  };

  const simulateProgress = (emailsFound: number) => {
    const stages: Array<{ stage: LearningStage; progress: number; message: string; duration: number; insights?: string[] }> = [
      {
        stage: 'fetching',
        progress: 20,
        message: `Fetching your sent emails...`,
        duration: 1500,
      },
      {
        stage: 'analyzing-tone',
        progress: 40,
        message: 'Analyzing your writing tone and style...',
        duration: 2500,
        insights: ['Detecting formality level', 'Identifying emotional tone', 'Analyzing friendliness'],
      },
      {
        stage: 'analyzing-structure',
        progress: 60,
        message: 'Examining sentence structure and patterns...',
        duration: 2000,
        insights: ['Measuring sentence complexity', 'Analyzing paragraph structure', 'Detecting formatting preferences'],
      },
      {
        stage: 'analyzing-vocabulary',
        progress: 80,
        message: 'Learning your vocabulary and phrases...',
        duration: 2000,
        insights: ['Identifying common phrases', 'Analyzing word choice', 'Learning greetings and closings'],
      },
      {
        stage: 'generating-profile',
        progress: 95,
        message: 'Creating your personalized style profile...',
        duration: 1500,
      },
    ];

    let currentStageIndex = 0;

    const updateStage = () => {
      if (currentStageIndex < stages.length) {
        const currentStage = stages[currentStageIndex];
        setLearningProgress({
          ...currentStage,
          emailsFound,
        });
        currentStageIndex++;
        setTimeout(updateStage, currentStage.duration);
      }
    };

    updateStage();
  };

  const handleLearnStyle = async () => {
    if (accounts.length === 0) {
      toast({
        title: 'No Account Connected',
        description: 'Please connect an email account first.',
        variant: 'destructive',
      });
      return;
    }

    // Use first account for now
    const accountId = accounts[0].id;

    setLoading(true);
    setLearningProgress({
      stage: 'fetching',
      progress: 10,
      message: 'Starting analysis...',
    });

    try {
      // Start the progress simulation (this will run in parallel)
      const response = await fetch('/api/ai/learn-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });

      const data = await response.json();

      if (data.success) {
        // Start simulated progress with actual email count
        simulateProgress(data.emailsAnalyzed);

        // Wait for simulation to complete
        await new Promise(resolve => setTimeout(resolve, 10000));

        setLearningProgress({
          stage: 'complete',
          progress: 100,
          message: `Successfully analyzed ${data.emailsAnalyzed} emails!`,
          emailsFound: data.emailsAnalyzed,
        });

        // Show completion after a brief delay
        setTimeout(async () => {
          toast({
            title: 'Writing Style Learned',
            description: `Analyzed ${data.emailsAnalyzed} emails to create your personal style profile.`,
          });

          // Refresh status
          await fetchStyleStatus();
          setLearningProgress(null);
        }, 2000);
      } else {
        setLearningProgress(null);
        
        // Show detailed error message
        console.error('Learn style failed:', data);
        
        toast({
          title: 'Failed to Learn Style',
          description: data.details || data.error || 'An error occurred',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error learning style:', error);
      setLearningProgress(null);
      toast({
        title: 'Error',
        description: 'Failed to analyze your writing style.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePersonalStyle = async (checked: boolean) => {
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ use_personal_style: checked }),
      });

      if (response.ok) {
        setUsePersonalStyle(checked);
        toast({
          title: checked ? 'Personal Style Enabled' : 'Personal Style Disabled',
          description: checked
            ? 'AI will now write emails in your personal style.'
            : 'AI will use generic professional style.',
        });
      } else {
        throw new Error('Failed to update preference');
      }
    } catch (error) {
      console.error('Error toggling style:', error);
      toast({
        title: 'Error',
        description: 'Failed to update preference.',
        variant: 'destructive',
      });
    }
  };

  if (fetchingStatus) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">AI Writing Style</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Train AI to write emails that sound like you
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Personal Writing Style
          </CardTitle>
          <CardDescription>
            AI analyzes your sent emails to learn your unique writing style, tone, and vocabulary.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Display */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              {hasStyle ? (
                <>
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-full">
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Style Profile Active</p>
                    {learnedAt && (
                      <p className="text-xs text-muted-foreground">
                        Last updated: {new Date(learnedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
                    <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">No Style Profile</p>
                    <p className="text-xs text-muted-foreground">
                      Click "Learn My Style" to get started
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Learning Progress Display */}
          {learningProgress && (
            <div className="space-y-4 p-6 bg-gradient-to-br from-primary/5 via-primary/10 to-transparent border-2 border-primary/20 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-primary flex items-center gap-2">
                    {learningProgress.stage === 'fetching' && <Mail className="h-4 w-4 animate-pulse" />}
                    {learningProgress.stage === 'analyzing-tone' && <Brain className="h-4 w-4 animate-pulse" />}
                    {learningProgress.stage === 'analyzing-structure' && <FileText className="h-4 w-4 animate-pulse" />}
                    {learningProgress.stage === 'analyzing-vocabulary' && <Sparkles className="h-4 w-4 animate-pulse" />}
                    {learningProgress.stage === 'generating-profile' && <Zap className="h-4 w-4 animate-pulse" />}
                    {learningProgress.stage === 'complete' && <Check className="h-4 w-4 text-green-600" />}
                    {learningProgress.message}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {learningProgress.progress}%
                  </span>
                </div>
                <Progress value={learningProgress.progress} className="h-2" />
              </div>

              {/* Emails Found */}
              {learningProgress.emailsFound && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="px-3 py-1 bg-primary/10 rounded-full">
                    <span className="font-semibold text-primary">
                      {learningProgress.emailsFound} emails
                    </span>
                    <span className="text-muted-foreground ml-1">found</span>
                  </div>
                </div>
              )}

              {/* Insights */}
              {learningProgress.insights && learningProgress.insights.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Current Analysis
                  </p>
                  <ul className="space-y-1.5">
                    {learningProgress.insights.map((insight, index) => (
                      <li
                        key={index}
                        className="text-sm flex items-center gap-2 animate-in fade-in slide-in-from-left-1 duration-300"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        <span className="text-foreground/80">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Learn Style Button */}
          {!learningProgress && (
            <div>
              <Button
                onClick={handleLearnStyle}
                disabled={loading || accounts.length === 0}
                className="w-full"
              >
                {hasStyle ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Re-Learn My Style
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Learn My Style
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Analyzes your last 50 sent emails to create a personalized writing profile
              </p>
            </div>
          )}

          {/* Toggle Personal Style */}
          {hasStyle && (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="use-personal-style" className="text-sm font-medium">
                  Use My Personal Style
                </Label>
                <p className="text-xs text-muted-foreground">
                  When enabled, AI will write emails in your unique voice and style
                </p>
              </div>
              <Switch
                id="use-personal-style"
                checked={usePersonalStyle}
                onCheckedChange={handleTogglePersonalStyle}
              />
            </div>
          )}

          {/* Style Profile Preview */}
          {hasStyle && styleProfile && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Your Writing Style Profile</Label>
              <div className="p-4 bg-muted/50 border rounded-lg text-sm text-muted-foreground">
                {styleProfile}
              </div>
            </div>
          )}

          {/* How it Works */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              How It Works
            </h4>
            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Analyzes your last 50 sent emails</li>
              <li>• Identifies your tone, vocabulary, and sentence structure</li>
              <li>• Learns your typical greetings and closings</li>
              <li>• Detects your punctuation and formatting preferences</li>
              <li>• Uses this profile when generating email replies and compositions</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
