'use client';

import { AlertCircle, CheckCircle, XCircle, Info, RefreshCw, Wifi, Lock, Mail, Server } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import VideoPlaceholder from '../VideoPlaceholder';

export default function TroubleshootingArticle() {
  return (
    <div className="space-y-8">
      {/* Video Tutorial */}
      <VideoPlaceholder
        title="Troubleshooting Common EaseMail Issues"
        description="Watch our comprehensive troubleshooting guide"
        duration="12:45"
        category="Troubleshooting"
      />

      {/* Quick Diagnostics */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Quick Diagnostics</AlertTitle>
        <AlertDescription>
          Before diving into specific issues, try these general troubleshooting steps:
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Refresh your browser (Ctrl/Cmd + R or F5)</li>
            <li>Clear your browser cache and cookies</li>
            <li>Check your internet connection</li>
            <li>Try a different browser (Chrome, Firefox, or Edge recommended)</li>
            <li>Disable browser extensions temporarily</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Email Sync Issues */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-orange-500" />
            Email Sync Issues
            <Badge variant="destructive">Most Common</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="not-syncing">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span>Emails are not syncing</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Possible Causes:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Internet connection is unstable or disconnected</li>
                    <li>Email account credentials have changed</li>
                    <li>Your email provider is experiencing an outage</li>
                    <li>IMAP is disabled in your email account settings</li>
                    <li>Two-factor authentication is blocking access</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Solutions:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>
                      <strong>Check Internet Connection:</strong> Visit <a href="https://www.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">google.com</a> to verify you're online
                    </li>
                    <li>
                      <strong>Reconnect Account:</strong> Go to Settings → Accounts → Click on the problematic account → Disconnect → Re-add the account
                    </li>
                    <li>
                      <strong>For Gmail Users:</strong> Enable "Less secure app access" or generate an App Password in Google Account settings
                    </li>
                    <li>
                      <strong>For Outlook Users:</strong> Verify IMAP is enabled at outlook.com → Settings → View all Outlook settings → Mail → Sync email → IMAP
                    </li>
                    <li>
                      <strong>Check Provider Status:</strong> Visit your email provider's status page (Gmail: status.cloud.google.com, Outlook: status.office.com)
                    </li>
                  </ol>
                </div>

                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Pro Tip:</strong> If you recently changed your email password, you must update it in EaseMail too!
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="slow-sync">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <span>Sync is very slow</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Common Reasons:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Large number of emails to sync (10,000+ messages)</li>
                    <li>Slow internet connection</li>
                    <li>Email provider rate limiting</li>
                    <li>Large attachments being downloaded</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">What to Try:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Initial sync can take 5-30 minutes for large mailboxes - this is normal!</li>
                    <li>Check your internet speed at <a href="https://fast.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">fast.com</a></li>
                    <li>Avoid opening many emails simultaneously during initial sync</li>
                    <li>If sync stalls for over 1 hour, try disconnecting and reconnecting the account</li>
                  </ol>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="duplicate-emails">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <span>Seeing duplicate emails</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Fix Steps:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Go to Settings → Accounts → Select the affected account</li>
                    <li>Click "Advanced" → "Remove Duplicates"</li>
                    <li>Alternatively, disconnect and reconnect the account (Settings → Accounts → Disconnect)</li>
                    <li>If duplicates persist, contact support with your account ID</li>
                  </ol>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Connection Errors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5 text-blue-500" />
            Connection Errors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="timeout">
              <AccordionTrigger>"Connection Timeout" or "Network Error"</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Troubleshooting Steps:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Check if your firewall or antivirus is blocking EaseMail</li>
                    <li>Try accessing from a different network (mobile hotspot)</li>
                    <li>Disable VPN temporarily to see if it's causing issues</li>
                    <li>Check if your company network blocks IMAP/SMTP ports (993, 465, 587)</li>
                    <li>Clear DNS cache: Windows (ipconfig /flushdns), Mac (sudo killall -HUP mDNSResponder)</li>
                  </ol>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="authentication">
              <AccordionTrigger>"Authentication Failed" Error</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Common Causes & Fixes:</h4>
                  <ul className="space-y-3 text-sm">
                    <li>
                      <strong>Wrong Password:</strong> Verify your password by logging in directly at your email provider's website
                    </li>
                    <li>
                      <strong>Gmail - 2FA Enabled:</strong> Generate an App Password at myaccount.google.com → Security → 2-Step Verification → App passwords
                    </li>
                    <li>
                      <strong>Outlook - Modern Auth:</strong> Ensure "Modern Authentication" is enabled in your Microsoft 365 admin center
                    </li>
                    <li>
                      <strong>Password Recently Changed:</strong> Update password in EaseMail (Settings → Accounts → Edit Account)
                    </li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* AI Features Not Working */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-purple-500" />
            AI Features Not Working
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="ai-write-error">
              <AccordionTrigger>"AI Write" button not responding</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Check These:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>
                      <strong>Usage Limit:</strong> Free plan has 10 AI requests/month. Check Settings → Billing → Usage
                    </li>
                    <li>
                      <strong>Internet Connection:</strong> AI requires active internet. Test connection at fast.com
                    </li>
                    <li>
                      <strong>Browser Console:</strong> Press F12 → Console tab. Look for error messages
                    </li>
                    <li>
                      <strong>Clear Cache:</strong> Ctrl+Shift+Delete → Clear cached images and files
                    </li>
                    <li>
                      <strong>Try Different Browser:</strong> Test in Chrome or Edge if using another browser
                    </li>
                  </ol>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="voice-dictation">
              <AccordionTrigger>Voice Dictation not working</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Requirements & Fixes:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>
                      <strong>Browser Compatibility:</strong> Works best on Chrome 90+, Edge 90+, Safari 14+
                    </li>
                    <li>
                      <strong>Microphone Permission:</strong> Click the microphone icon in your browser's address bar → Allow
                    </li>
                    <li>
                      <strong>HTTPS Required:</strong> Voice features only work on secure connections (https://)
                    </li>
                    <li>
                      <strong>Microphone Test:</strong> Test your mic at webcammictest.com
                    </li>
                    <li>
                      <strong>Check OS Permissions:</strong>
                      <ul className="list-disc list-inside ml-4 mt-1">
                        <li>Windows: Settings → Privacy → Microphone → Allow apps to access</li>
                        <li>Mac: System Preferences → Security & Privacy → Microphone → Enable for browser</li>
                      </ul>
                    </li>
                  </ol>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Performance Issues */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Performance & Loading Issues
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="slow-loading">
              <AccordionTrigger>App is slow or freezing</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Performance Optimization:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>
                      <strong>Clear Browser Cache:</strong> Ctrl/Cmd + Shift + Delete → Select "All time" → Clear data
                    </li>
                    <li>
                      <strong>Disable Extensions:</strong> Temporarily disable browser extensions (especially ad blockers)
                    </li>
                    <li>
                      <strong>Close Other Tabs:</strong> Having 50+ browser tabs open can slow things down
                    </li>
                    <li>
                      <strong>Update Browser:</strong> Ensure you're using the latest version
                    </li>
                    <li>
                      <strong>Check RAM Usage:</strong> Close memory-intensive applications
                    </li>
                    <li>
                      <strong>Try Incognito Mode:</strong> Test if extensions are causing issues
                    </li>
                  </ol>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="images-not-loading">
              <AccordionTrigger>Images or attachments not loading</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Solutions:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Settings → Display → Enable "Load images automatically"</li>
                    <li>Check if "Data Saver" mode is enabled in your browser</li>
                    <li>Whitelist EaseMail domain in your ad blocker</li>
                    <li>For large attachments (>25MB), download may take time - be patient</li>
                  </ol>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Still Need Help */}
      <Alert className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
        <Mail className="h-4 w-4" />
        <AlertTitle>Still experiencing issues?</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>Our support team is here to help! When contacting support, please include:</p>
          <ul className="list-disc list-inside ml-2">
            <li>Your account email address</li>
            <li>Browser name and version (find at whatbrowser.org)</li>
            <li>Screenshot of the error (if applicable)</li>
            <li>Steps to reproduce the issue</li>
            <li>Any error messages from browser console (F12)</li>
          </ul>
          <div className="pt-2">
            <a href="mailto:support@easemail.com" className="text-primary hover:underline font-semibold">
              Contact Support: support@easemail.com
            </a>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
