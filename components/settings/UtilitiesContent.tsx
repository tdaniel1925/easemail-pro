'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Loader2, Wrench, Paperclip, Mail } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FixResult {
  success: boolean;
  checked?: number;
  fixed?: number;
  errors?: number;
  accountsProcessed?: number;
  message?: string;
}

export function UtilitiesContent() {
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [sentEmailsLoading, setSentEmailsLoading] = useState(false);
  const [attachmentsResult, setAttachmentsResult] = useState<FixResult | null>(null);
  const [sentEmailsResult, setSentEmailsResult] = useState<FixResult | null>(null);

  const fixAttachments = async () => {
    setAttachmentsLoading(true);
    setAttachmentsResult(null);

    try {
      const response = await fetch('/api/fix-attachments?limit=500');
      const data = await response.json();

      if (data.success) {
        setAttachmentsResult({
          success: true,
          checked: data.checked,
          fixed: data.fixed,
          errors: data.errors,
        });
      } else {
        setAttachmentsResult({
          success: false,
          message: data.error || 'Failed to fix attachments',
        });
      }
    } catch (error) {
      setAttachmentsResult({
        success: false,
        message: (error as Error).message || 'Network error',
      });
    } finally {
      setAttachmentsLoading(false);
    }
  };

  const fixSentEmails = async () => {
    setSentEmailsLoading(true);
    setSentEmailsResult(null);

    try {
      const response = await fetch('/api/fix-sent-emails?limit=500');
      const data = await response.json();

      if (data.success) {
        setSentEmailsResult({
          success: true,
          checked: data.checked,
          fixed: data.fixed,
          accountsProcessed: data.accountsProcessed,
        });
      } else {
        setSentEmailsResult({
          success: false,
          message: data.error || 'Failed to fix sent emails',
        });
      }
    } catch (error) {
      setSentEmailsResult({
        success: false,
        message: (error as Error).message || 'Network error',
      });
    } finally {
      setSentEmailsLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Data Utilities</h1>
        <p className="text-muted-foreground mt-2">
          Run maintenance scripts to fix common data issues
        </p>
      </div>

      <div className="space-y-6">
        {/* Fix Attachments */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Paperclip className="h-5 w-5 text-primary" />
              <CardTitle>Fix Missing Attachments</CardTitle>
            </div>
            <CardDescription>
              Backfill attachment data for emails that have attachments but are missing metadata.
              This will fetch attachment information from your email provider and update your local database.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={fixAttachments}
              disabled={attachmentsLoading}
              className="w-full sm:w-auto"
            >
              {attachmentsLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Wrench className="mr-2 h-4 w-4" />
                  Fix Attachments
                </>
              )}
            </Button>

            {attachmentsResult && (
              <Alert variant={attachmentsResult.success ? 'default' : 'destructive'}>
                {attachmentsResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {attachmentsResult.success ? (
                    <div className="space-y-1">
                      <p className="font-medium">Completed successfully</p>
                      <p className="text-sm">
                        Checked {attachmentsResult.checked} emails, fixed {attachmentsResult.fixed} emails
                        {attachmentsResult.errors && attachmentsResult.errors > 0 && (
                          <span className="text-destructive"> ({attachmentsResult.errors} errors)</span>
                        )}
                      </p>
                    </div>
                  ) : (
                    <p>{attachmentsResult.message}</p>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Fix Sent Emails */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle>Fix Sent Email Classification</CardTitle>
            </div>
            <CardDescription>
              Reclassify emails sent from external clients (Outlook, Thunderbird, etc.) that are incorrectly
              appearing in your Inbox. This will move them to your Sent folder.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={fixSentEmails}
              disabled={sentEmailsLoading}
              className="w-full sm:w-auto"
            >
              {sentEmailsLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Wrench className="mr-2 h-4 w-4" />
                  Fix Sent Emails
                </>
              )}
            </Button>

            {sentEmailsResult && (
              <Alert variant={sentEmailsResult.success ? 'default' : 'destructive'}>
                {sentEmailsResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {sentEmailsResult.success ? (
                    <div className="space-y-1">
                      <p className="font-medium">Completed successfully</p>
                      <p className="text-sm">
                        Processed {sentEmailsResult.accountsProcessed} accounts,
                        checked {sentEmailsResult.checked} emails,
                        fixed {sentEmailsResult.fixed} emails
                      </p>
                    </div>
                  ) : (
                    <p>{sentEmailsResult.message}</p>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Info card */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">When to use these utilities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>Fix Attachments:</strong> Use this if you notice emails with attachment indicators
              but no attachments showing when you open them.
            </p>
            <p>
              <strong>Fix Sent Emails:</strong> Use this if you see emails you sent from other email clients
              appearing in your Inbox instead of your Sent folder.
            </p>
            <p className="pt-2 text-xs">
              These utilities are safe to run multiple times. They only update emails that need fixing.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
