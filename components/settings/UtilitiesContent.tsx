'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Loader2, Wrench, Paperclip, Mail, Image, Trash2, Eye, Copy } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FixResult {
  success: boolean;
  checked?: number;
  fixed?: number;
  errors?: number;
  accountsProcessed?: number;
  message?: string;
}

interface InlineCleanupResult {
  success: boolean;
  deleted?: {
    inlineFlag: number;
    contentId: number;
    filenamePattern: number;
    smallImages: number;
    total: number;
  };
  preview?: {
    inlineFlag: number;
    contentId: number;
    filenamePattern: number;
    smallImages: number;
    total: number;
  };
  message?: string;
  error?: string;
}

interface DuplicateCleanupResult {
  success: boolean;
  deleted?: number;
  duplicateGroups?: number;
  preview?: {
    duplicateGroups: number;
    totalDuplicates: number;
    samples: { filename: string; count: number }[];
  };
  message?: string;
  error?: string;
}

export function UtilitiesContent() {
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [sentEmailsLoading, setSentEmailsLoading] = useState(false);
  const [inlineCleanupLoading, setInlineCleanupLoading] = useState(false);
  const [inlinePreviewLoading, setInlinePreviewLoading] = useState(false);
  const [duplicateCleanupLoading, setDuplicateCleanupLoading] = useState(false);
  const [duplicatePreviewLoading, setDuplicatePreviewLoading] = useState(false);
  const [attachmentsResult, setAttachmentsResult] = useState<FixResult | null>(null);
  const [sentEmailsResult, setSentEmailsResult] = useState<FixResult | null>(null);
  const [inlineCleanupResult, setInlineCleanupResult] = useState<InlineCleanupResult | null>(null);
  const [duplicateCleanupResult, setDuplicateCleanupResult] = useState<DuplicateCleanupResult | null>(null);

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

  const previewInlineCleanup = async () => {
    setInlinePreviewLoading(true);
    setInlineCleanupResult(null);

    try {
      const response = await fetch('/api/cleanup-inline-attachments');
      const data = await response.json();
      setInlineCleanupResult(data);
    } catch (error) {
      setInlineCleanupResult({
        success: false,
        error: (error as Error).message || 'Network error',
      });
    } finally {
      setInlinePreviewLoading(false);
    }
  };

  const cleanupInlineAttachments = async () => {
    setInlineCleanupLoading(true);
    setInlineCleanupResult(null);

    try {
      const response = await fetch('/api/cleanup-inline-attachments', {
        method: 'DELETE',
      });
      const data = await response.json();
      setInlineCleanupResult(data);
    } catch (error) {
      setInlineCleanupResult({
        success: false,
        error: (error as Error).message || 'Network error',
      });
    } finally {
      setInlineCleanupLoading(false);
    }
  };

  const previewDuplicateCleanup = async () => {
    setDuplicatePreviewLoading(true);
    setDuplicateCleanupResult(null);

    try {
      const response = await fetch('/api/cleanup-duplicate-attachments');
      const data = await response.json();
      setDuplicateCleanupResult(data);
    } catch (error) {
      setDuplicateCleanupResult({
        success: false,
        error: (error as Error).message || 'Network error',
      });
    } finally {
      setDuplicatePreviewLoading(false);
    }
  };

  const cleanupDuplicateAttachments = async () => {
    setDuplicateCleanupLoading(true);
    setDuplicateCleanupResult(null);

    try {
      const response = await fetch('/api/cleanup-duplicate-attachments', {
        method: 'DELETE',
      });
      const data = await response.json();
      setDuplicateCleanupResult(data);
    } catch (error) {
      setDuplicateCleanupResult({
        success: false,
        error: (error as Error).message || 'Network error',
      });
    } finally {
      setDuplicateCleanupLoading(false);
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

        {/* Cleanup Inline Attachments */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Image className="h-5 w-5 text-primary" />
              <CardTitle>Remove Inline Images from Attachments</CardTitle>
            </div>
            <CardDescription>
              Remove embedded/inline images from your Attachments page. This includes pasted images,
              email signatures, tracking pixels, and small icons that were mistakenly indexed as attachments.
              Only actual file attachments will remain.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={previewInlineCleanup}
                disabled={inlinePreviewLoading || inlineCleanupLoading}
                variant="outline"
                className="sm:w-auto"
              >
                {inlinePreviewLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </>
                )}
              </Button>
              <Button
                onClick={cleanupInlineAttachments}
                disabled={inlineCleanupLoading || inlinePreviewLoading}
                variant="destructive"
                className="sm:w-auto"
              >
                {inlineCleanupLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove Inline Images
                  </>
                )}
              </Button>
            </div>

            {inlineCleanupResult && (
              <Alert variant={inlineCleanupResult.success ? 'default' : 'destructive'}>
                {inlineCleanupResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {inlineCleanupResult.success ? (
                    <div className="space-y-2">
                      <p className="font-medium">{inlineCleanupResult.message}</p>
                      {(inlineCleanupResult.preview || inlineCleanupResult.deleted) && (
                        <div className="text-sm space-y-1">
                          <p>Breakdown:</p>
                          <ul className="list-disc list-inside ml-2 text-muted-foreground">
                            <li>Marked as inline: {(inlineCleanupResult.preview || inlineCleanupResult.deleted)?.inlineFlag || 0}</li>
                            <li>With content ID (CID): {(inlineCleanupResult.preview || inlineCleanupResult.deleted)?.contentId || 0}</li>
                            <li>Inline filename patterns: {(inlineCleanupResult.preview || inlineCleanupResult.deleted)?.filenamePattern || 0}</li>
                            <li>Small images (&lt;10KB): {(inlineCleanupResult.preview || inlineCleanupResult.deleted)?.smallImages || 0}</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p>{inlineCleanupResult.error || 'An error occurred'}</p>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Remove Duplicate Attachments */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Copy className="h-5 w-5 text-primary" />
              <CardTitle>Remove Duplicate Attachments</CardTitle>
            </div>
            <CardDescription>
              Find and remove duplicate attachments that may have been indexed multiple times.
              Duplicates are identified by matching email, filename, and file size. The oldest record is kept.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={previewDuplicateCleanup}
                disabled={duplicatePreviewLoading || duplicateCleanupLoading}
                variant="outline"
                className="sm:w-auto"
              >
                {duplicatePreviewLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </>
                )}
              </Button>
              <Button
                onClick={cleanupDuplicateAttachments}
                disabled={duplicateCleanupLoading || duplicatePreviewLoading}
                variant="destructive"
                className="sm:w-auto"
              >
                {duplicateCleanupLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove Duplicates
                  </>
                )}
              </Button>
            </div>

            {duplicateCleanupResult && (
              <Alert variant={duplicateCleanupResult.success ? 'default' : 'destructive'}>
                {duplicateCleanupResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {duplicateCleanupResult.success ? (
                    <div className="space-y-2">
                      <p className="font-medium">{duplicateCleanupResult.message}</p>
                      {duplicateCleanupResult.preview?.samples && duplicateCleanupResult.preview.samples.length > 0 && (
                        <div className="text-sm space-y-1">
                          <p>Sample duplicates:</p>
                          <ul className="list-disc list-inside ml-2 text-muted-foreground">
                            {duplicateCleanupResult.preview.samples.map((sample, i) => (
                              <li key={i}>{sample.filename} ({sample.count} copies)</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p>{duplicateCleanupResult.error || 'An error occurred'}</p>
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
              <strong>Remove Inline Images:</strong> Use this if you see pasted images, email signatures,
              or small icons appearing in your Attachments page. These are inline/embedded images that
              shouldn't be listed as attachments.
            </p>
            <p>
              <strong>Remove Duplicates:</strong> Use this if you see the same attachment appearing multiple
              times on the Attachments page. This can happen if emails are synced multiple times.
            </p>
            <p>
              <strong>Fix Sent Emails:</strong> Use this if you see emails you sent from other email clients
              appearing in your Inbox instead of your Sent folder.
            </p>
            <p className="pt-2 text-xs">
              These utilities are safe to run multiple times. They only update data that needs fixing.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
