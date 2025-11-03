import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, CheckCircle, AlertTriangle } from 'lucide-react';

export default function ConnectEmailArticle() {
  return (
    <div>
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Before you start:</strong> Make sure you have your email credentials ready. For Gmail users, you may need to enable "App Password".
        </AlertDescription>
      </Alert>

      <h2>Supported Email Providers</h2>
      <p>EaseMail supports connecting any email account through:</p>
      <ul>
        <li><strong>Gmail</strong> - OAuth2 secure connection</li>
        <li><strong>Microsoft Outlook/Office 365</strong> - OAuth2 secure connection</li>
        <li><strong>IMAP</strong> - Any email provider with IMAP support</li>
      </ul>

      <h2>Method 1: Connect Gmail (Recommended)</h2>
      
      <Card className="my-6">
        <CardContent className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
          <div className="flex items-center gap-3 mb-4">
            <Badge className="bg-blue-500">Step 1</Badge>
            <h3 className="text-lg font-semibold m-0">Click "Connect Account"</h3>
          </div>
          <p className="mb-4">Navigate to your inbox and click the "+ Connect Account" button in the top-right corner.</p>
        </CardContent>
      </Card>

      <Card className="my-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Badge className="bg-purple-500">Step 2</Badge>
            <h3 className="text-lg font-semibold m-0">Choose Gmail</h3>
          </div>
          <p>In the connection modal, select "Gmail" as your provider.</p>
        </CardContent>
      </Card>

      <Card className="my-6">
        <CardContent className="p-6 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20">
          <div className="flex items-center gap-3 mb-4">
            <Badge className="bg-green-500">Step 3</Badge>
            <h3 className="text-lg font-semibold m-0">Authorize EaseMail</h3>
          </div>
          <p className="mb-4">You'll be redirected to Google's secure authorization page. Sign in with your Gmail account and grant EaseMail permission.</p>
          <Alert className="mb-4">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription>
              <strong>Your security matters:</strong> EaseMail uses OAuth2, the industry-standard secure authentication. We never see or store your Gmail password.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <h2>Troubleshooting</h2>
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4">
            <h4 className="font-semibold mb-2">❌ "Connection Failed" Error</h4>
            <p className="text-sm text-muted-foreground"><strong>Solution:</strong> Check your internet connection and try again. For IMAP, verify your server settings.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h4 className="font-semibold mb-2">❌ "Authentication Failed" for Gmail</h4>
            <p className="text-sm text-muted-foreground"><strong>Solution:</strong> Enable 2-Step Verification and create an App Password in Google Account settings.</p>
          </CardContent>
        </Card>
      </div>

      <h2>Next Steps</h2>
      <Card className="my-6 border-primary/50 bg-primary/5">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">✅ Account Connected! What's Next?</h3>
          <ul className="space-y-2">
            <li>✨ Create your email signature</li>
            <li>🤖 Try AI-powered email writing</li>
            <li>🎙️ Use voice dictation</li>
            <li>👥 Import your contacts</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

