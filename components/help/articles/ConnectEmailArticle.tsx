import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, CheckCircle, AlertTriangle, Mail, Shield, Zap } from 'lucide-react';

export default function ConnectEmailArticle() {
  return (
    <div className="space-y-8">
      <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
        <Info className="h-5 w-5 text-blue-600" />
        <AlertDescription className="text-blue-900 dark:text-blue-100">
          <strong>Before you start:</strong> Make sure you have your email credentials ready. For Gmail users, you may need to enable "App Password". The setup process takes about 2 minutes and is secure.
        </AlertDescription>
      </Alert>

      <section>
        <h2 className="text-2xl font-bold mb-4">Supported Email Providers</h2>
        <p className="text-muted-foreground mb-4">
          EaseMail supports connecting any email account through secure OAuth2 or IMAP protocols:
        </p>

        <div className="grid md:grid-cols-3 gap-4">
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold">Gmail</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-2">OAuth2 secure connection</p>
              <Badge className="bg-green-500">Recommended</Badge>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold">Outlook</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-2">Office 365 / Outlook.com</p>
              <Badge className="bg-green-500">Recommended</Badge>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                <h3 className="font-semibold">IMAP/SMTP</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-2">Yahoo, ProtonMail, Custom</p>
              <Badge variant="secondary">Universal</Badge>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Method 1: Connect Gmail (Recommended)</h2>

        <Card className="my-6 border-l-4 border-l-blue-500">
          <CardContent className="p-6 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/10 dark:to-purple-950/10">
            <div className="flex items-center gap-3 mb-4">
              <Badge className="bg-blue-500 text-white px-3 py-1">Step 1</Badge>
              <h3 className="text-lg font-semibold m-0">Navigate to Accounts</h3>
            </div>
            <p className="mb-3 text-muted-foreground">
              Go to the <strong>lower left sidebar</strong> and click the "+ Add Account" button, or navigate to <code className="bg-muted px-2 py-1 rounded">/accounts-v3</code> in the menu.
            </p>
            <p className="text-sm text-muted-foreground italic">
              💡 You can also click "Email Accounts" from the user menu in the bottom-left corner.
            </p>
          </CardContent>
        </Card>

        <Card className="my-6 border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Badge className="bg-purple-500 text-white px-3 py-1">Step 2</Badge>
              <h3 className="text-lg font-semibold m-0">Select Gmail</h3>
            </div>
            <p className="mb-3 text-muted-foreground">
              In the connection modal, click the <strong>"Connect Gmail"</strong> button. This will open Google's secure authorization page.
            </p>
          </CardContent>
        </Card>

        <Card className="my-6 border-l-4 border-l-green-500">
          <CardContent className="p-6 bg-gradient-to-r from-green-50/50 to-blue-50/50 dark:from-green-950/10 dark:to-blue-950/10">
            <div className="flex items-center gap-3 mb-4">
              <Badge className="bg-green-500 text-white px-3 py-1">Step 3</Badge>
              <h3 className="text-lg font-semibold m-0">Authorize EaseMail</h3>
            </div>
            <ol className="space-y-2 mb-4 text-muted-foreground">
              <li>1. Sign in with your Gmail account</li>
              <li>2. Review the permissions EaseMail is requesting</li>
              <li>3. Click "Allow" to grant access</li>
              <li>4. Wait for the redirect back to EaseMail</li>
            </ol>

            <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-900 dark:text-green-100">
                <strong>Your security matters:</strong> EaseMail uses OAuth2, the industry-standard secure authentication protocol. We <strong>never see or store</strong> your Gmail password. All connections are encrypted end-to-end.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card className="my-6 border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Badge className="bg-blue-500 text-white px-3 py-1">Step 4</Badge>
              <h3 className="text-lg font-semibold m-0">Wait for Initial Sync</h3>
            </div>
            <p className="mb-3 text-muted-foreground">
              EaseMail will now sync your emails. The initial sync typically takes 1-2 minutes depending on your mailbox size. You'll see a progress indicator.
            </p>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm font-medium mb-2">What gets synced:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Recent emails (last 30 days by default)</li>
                <li>✓ Folder structure (Inbox, Sent, Drafts, etc.)</li>
                <li>✓ Contact information from emails</li>
                <li>✓ Email attachments (on-demand)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Method 2: Connect Outlook / Office 365</h2>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-3">Step-by-Step Instructions</h3>
              <ol className="space-y-3 text-muted-foreground">
                <li>
                  <strong>1. Click "Connect Outlook"</strong>
                  <p className="ml-4 mt-1 text-sm">In the accounts page, select the Outlook / Office 365 option</p>
                </li>
                <li>
                  <strong>2. Sign in with Microsoft</strong>
                  <p className="ml-4 mt-1 text-sm">You'll be redirected to Microsoft's login page. Enter your Outlook.com or Office 365 email and password</p>
                </li>
                <li>
                  <strong>3. Authorize Permissions</strong>
                  <p className="ml-4 mt-1 text-sm">Microsoft will ask you to grant EaseMail permission to access your emails. Click "Accept"</p>
                </li>
                <li>
                  <strong>4. Complete Setup</strong>
                  <p className="ml-4 mt-1 text-sm">You'll be redirected back to EaseMail and your emails will begin syncing</p>
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Method 3: Connect via IMAP/SMTP (Advanced)</h2>

        <Alert className="mb-4 border-orange-500 bg-orange-50 dark:bg-orange-950/20">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-900 dark:text-orange-100">
            <strong>Advanced Users:</strong> IMAP configuration requires technical knowledge. Use OAuth2 methods (Gmail/Outlook) when possible for better security.
          </AlertDescription>
        </Alert>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Required Information</h3>
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="font-medium mb-2">IMAP Settings (Incoming Mail):</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• IMAP Server: <code>imap.example.com</code></li>
                  <li>• Port: 993 (SSL/TLS) or 143 (STARTTLS)</li>
                  <li>• Encryption: SSL/TLS recommended</li>
                  <li>• Username: Your full email address</li>
                  <li>• Password: Your email password or app-specific password</li>
                </ul>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <p className="font-medium mb-2">SMTP Settings (Outgoing Mail):</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• SMTP Server: <code>smtp.example.com</code></li>
                  <li>• Port: 465 (SSL) or 587 (STARTTLS)</li>
                  <li>• Encryption: SSL/TLS or STARTTLS</li>
                  <li>• Authentication: Use same credentials as IMAP</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <h4 className="font-semibold">Common IMAP Providers:</h4>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div className="bg-background border rounded-lg p-3">
                  <p className="font-medium">Yahoo Mail</p>
                  <p className="text-xs text-muted-foreground">IMAP: imap.mail.yahoo.com:993</p>
                  <p className="text-xs text-muted-foreground">SMTP: smtp.mail.yahoo.com:465</p>
                </div>
                <div className="bg-background border rounded-lg p-3">
                  <p className="font-medium">ProtonMail</p>
                  <p className="text-xs text-muted-foreground">Requires ProtonMail Bridge app</p>
                  <p className="text-xs text-muted-foreground">IMAP: 127.0.0.1:1143</p>
                </div>
                <div className="bg-background border rounded-lg p-3">
                  <p className="font-medium">iCloud Mail</p>
                  <p className="text-xs text-muted-foreground">IMAP: imap.mail.me.com:993</p>
                  <p className="text-xs text-muted-foreground">SMTP: smtp.mail.me.com:587</p>
                </div>
                <div className="bg-background border rounded-lg p-3">
                  <p className="font-medium">Zoho Mail</p>
                  <p className="text-xs text-muted-foreground">IMAP: imap.zoho.com:993</p>
                  <p className="text-xs text-muted-foreground">SMTP: smtp.zoho.com:465</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Troubleshooting Common Issues</h2>
        <div className="space-y-4">
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-5">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                "Connection Failed" Error
              </h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><strong>Possible Causes:</strong></p>
                <ul className="ml-6 space-y-1">
                  <li>• Internet connection is unstable or blocked</li>
                  <li>• Firewall or antivirus blocking the connection</li>
                  <li>• Email server is temporarily down</li>
                </ul>
                <p className="mt-3"><strong>Solutions:</strong></p>
                <ol className="ml-6 space-y-1">
                  <li>1. Check your internet connection</li>
                  <li>2. Temporarily disable firewall/VPN and try again</li>
                  <li>3. Wait a few minutes and retry</li>
                  <li>4. Contact support if the issue persists</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-5">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                "Authentication Failed" for Gmail
              </h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><strong>Solution for Gmail:</strong></p>
                <ol className="ml-6 space-y-2">
                  <li>
                    <strong>1. Enable 2-Step Verification</strong>
                    <p className="ml-4 mt-1">Go to Google Account → Security → 2-Step Verification</p>
                  </li>
                  <li>
                    <strong>2. Generate App Password</strong>
                    <p className="ml-4 mt-1">Go to Google Account → Security → App passwords</p>
                    <p className="ml-4 mt-1 italic">Select "Mail" and "Other (Custom name)"</p>
                  </li>
                  <li>
                    <strong>3. Use the Generated Password</strong>
                    <p className="ml-4 mt-1">Copy the 16-character app password and use it in EaseMail instead of your regular password</p>
                  </li>
                </ol>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-5">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                Emails Not Syncing
              </h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><strong>Solutions:</strong></p>
                <ol className="ml-6 space-y-1">
                  <li>1. Check if IMAP is enabled in your email provider settings</li>
                  <li>2. Verify your account is still connected in Settings → Email Accounts</li>
                  <li>3. Disconnect and reconnect your account</li>
                  <li>4. Check storage quota - full mailbox can prevent syncing</li>
                  <li>5. Clear browser cache and reload the page</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-5">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600" />
                "OAuth Consent Screen" Errors
              </h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><strong>Solution:</strong></p>
                <ol className="ml-6 space-y-1">
                  <li>1. Make sure pop-ups are not blocked in your browser</li>
                  <li>2. Clear browser cookies for Google/Microsoft</li>
                  <li>3. Try using an incognito/private window</li>
                  <li>4. Ensure you're logged in to only one account</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Security & Privacy</h2>
        <Card className="border-primary/50 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/10 dark:to-purple-950/10">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-1">End-to-End Encryption</h4>
                  <p className="text-sm text-muted-foreground">All email data is encrypted in transit and at rest using industry-standard AES-256 encryption.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-1">OAuth2 Authentication</h4>
                  <p className="text-sm text-muted-foreground">We never store your email password. OAuth2 tokens are encrypted and can be revoked anytime from your email provider.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-1">Data Privacy</h4>
                  <p className="text-sm text-muted-foreground">Your emails are stored securely and are never shared with third parties. We comply with GDPR and CCPA regulations.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Next Steps</h2>
        <Card className="border-2 border-primary/50 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <h3 className="font-semibold text-lg">✅ Account Connected! What's Next?</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span>Create your email signature</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span>Try AI-powered email writing</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span>Use voice dictation</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span>Import your contacts</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span>Set up email rules & automation</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span>Customize your preferences</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900 dark:text-blue-100">
            <strong>Need more help?</strong> Visit our Help Center or contact support at support@easemail.com. We're here to help!
          </AlertDescription>
        </Alert>
      </section>
    </div>
  );
}
