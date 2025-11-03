import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Zap } from 'lucide-react';

export default function AIWriteArticle() {
  return (
    <div>
      <Alert className="mb-6">
        <Sparkles className="h-4 w-4" />
        <AlertDescription>
          <strong>AI Write saves you hours every week!</strong> Instead of typing long emails, just tell AI what you want to say in a few words.
        </AlertDescription>
      </Alert>

      <h2>How AI Write Works</h2>
      <p>AI Write uses advanced language models to transform your brief instructions into professional, well-written emails. It understands context, tone, and intent.</p>

      <h2>Quick Start Guide</h2>
      
      <Card className="my-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Badge className="bg-blue-500">Step 1</Badge>
            <h3 className="text-lg font-semibold m-0">Click Compose</h3>
          </div>
          <p>Start a new email by clicking the Compose button in your inbox.</p>
        </CardContent>
      </Card>

      <Card className="my-6">
        <CardContent className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
          <div className="flex items-center gap-3 mb-4">
            <Badge className="bg-purple-500">Step 2</Badge>
            <h3 className="text-lg font-semibold m-0">Click AI Write</h3>
          </div>
          <p>In the compose window, look for the <Zap className="inline h-4 w-4" /> AI Write button in the toolbar.</p>
        </CardContent>
      </Card>

      <Card className="my-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Badge className="bg-green-500">Step 3</Badge>
            <h3 className="text-lg font-semibold m-0">Give Instructions</h3>
          </div>
          <p className="mb-4">Type a brief description of what you want to say. Examples:</p>
          <ul className="space-y-2">
            <li><code className="text-sm bg-muted px-2 py-1 rounded">"Thank client for meeting and send proposal"</code></li>
            <li><code className="text-sm bg-muted px-2 py-1 rounded">"Follow up on job application"</code></li>
            <li><code className="text-sm bg-muted px-2 py-1 rounded">"Decline meeting politely"</code></li>
          </ul>
        </CardContent>
      </Card>

      <Card className="my-6">
        <CardContent className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
          <div className="flex items-center gap-3 mb-4">
            <Badge className="bg-yellow-500">Step 4</Badge>
            <h3 className="text-lg font-semibold m-0">Review & Send</h3>
          </div>
          <p>AI will generate a complete, professional email. Review it, make any tweaks, and send!</p>
        </CardContent>
      </Card>

      <h2>Pro Tips</h2>
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4">
            <h4 className="font-semibold mb-2">💡 Be Specific</h4>
            <p className="text-sm text-muted-foreground">The more details you provide, the better the result. Mention key points, tone, or specific requests.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h4 className="font-semibold mb-2">💡 Try Different Tones</h4>
            <p className="text-sm text-muted-foreground">Add words like "formal", "casual", "friendly", or "urgent" to adjust the tone.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h4 className="font-semibold mb-2">💡 Use AI Remix</h4>
            <p className="text-sm text-muted-foreground">Not happy with the result? Use AI Remix to regenerate in a different style or length.</p>
          </CardContent>
        </Card>
      </div>

      <h2>Example Results</h2>
      <Card className="my-6 border-primary/50">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground mb-2">Your input:</p>
          <code className="block bg-muted p-3 rounded mb-4 text-sm">"Follow up meeting request with Sarah about Q1 budget review"</code>
          <p className="text-sm text-muted-foreground mb-2">AI Write generates:</p>
          <div className="bg-background p-4 rounded border">
            <p className="text-sm">Hi Sarah,</p>
            <p className="text-sm mt-3">I hope this email finds you well. I wanted to follow up regarding our Q1 budget review meeting.</p>
            <p className="text-sm mt-3">Would you have availability this week for a 30-minute discussion? I'm flexible with timing and happy to work around your schedule.</p>
            <p className="text-sm mt-3">Looking forward to hearing from you.</p>
            <p className="text-sm mt-3">Best regards</p>
          </div>
        </CardContent>
      </Card>

      <Alert className="my-6">
        <Sparkles className="h-4 w-4" />
        <AlertDescription>
          <strong>Try it now!</strong> Open your compose window and give AI Write a test drive. Most users save 5+ hours per week on email writing.
        </AlertDescription>
      </Alert>
    </div>
  );
}

