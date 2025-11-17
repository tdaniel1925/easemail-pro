'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAccounts } from '@/lib/hooks/use-accounts';

export function WritingStyleSettings() {
  const { toast } = useToast();
  const { accounts } = useAccounts();
  const [loading, setLoading] = useState(false);
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
    try {
      const response = await fetch('/api/ai/learn-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Writing Style Learned',
          description: `Analyzed ${data.emailsAnalyzed} emails to create your personal style profile.`,
        });

        // Refresh status
        await fetchStyleStatus();
      } else {
        toast({
          title: 'Failed to Learn Style',
          description: data.error || 'An error occurred',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error learning style:', error);
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

          {/* Learn Style Button */}
          <div>
            <Button
              onClick={handleLearnStyle}
              disabled={loading || accounts.length === 0}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing Your Emails...
                </>
              ) : hasStyle ? (
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
