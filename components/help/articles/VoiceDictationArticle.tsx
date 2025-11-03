import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, Info } from 'lucide-react';

export default function VoiceDictationArticle() {
  return (
    <div>
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Speak your emails!</strong> Voice dictation lets you write emails hands-free using your voice. Perfect for mobile or when typing isn't convenient.
        </AlertDescription>
      </Alert>

      <h2>How Voice Dictation Works</h2>
      <p>EaseMail uses advanced speech recognition to convert your spoken words into text in real-time. You can choose to use the raw transcription or let AI polish it into a professional email.</p>

      <h2>Quick Start</h2>
      
      <Card className="my-6">
        <CardContent className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
          <div className="flex items-center gap-3 mb-4">
            <Badge className="bg-blue-500">Step 1</Badge>
            <h3 className="text-lg font-semibold m-0">Click the Mic Button</h3>
          </div>
          <p>In the compose window, look for the <Mic className="inline h-4 w-4" /> microphone button in the AI toolbar.</p>
        </CardContent>
      </Card>

      <Card className="my-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Badge className="bg-purple-500">Step 2</Badge>
            <h3 className="text-lg font-semibold m-0">Grant Microphone Permission</h3>
          </div>
          <p>Your browser will ask for microphone access. Click "Allow" to enable dictation.</p>
        </CardContent>
      </Card>

      <Card className="my-6">
        <CardContent className="p-6 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20">
          <div className="flex items-center gap-3 mb-4">
            <Badge className="bg-green-500">Step 3</Badge>
            <h3 className="text-lg font-semibold m-0">Start Speaking</h3>
          </div>
          <p className="mb-4">The mic button turns red when recording. Speak naturally and clearly. Say things like:</p>
          <ul className="space-y-2">
            <li>"Hi John, following up on our meeting yesterday about the marketing campaign..."</li>
            <li>"Thanks for your email. I'd be happy to discuss this further..."</li>
            <li>"Just wanted to check in and see if you had any questions..."</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="my-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Badge className="bg-yellow-500">Step 4</Badge>
            <h3 className="text-lg font-semibold m-0">Choose Your Style</h3>
          </div>
          <p className="mb-4">When you stop recording, you'll see two options:</p>
          <ul className="space-y-2">
            <li><strong>Use As-Is:</strong> Inserts your raw transcription exactly as spoken</li>
            <li><strong>AI Polish:</strong> Transforms your words into a professional email with proper formatting, greeting, and closing</li>
          </ul>
        </CardContent>
      </Card>

      <h2>Best Practices</h2>
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4">
            <h4 className="font-semibold mb-2">🎤 Speak Clearly</h4>
            <p className="text-sm text-muted-foreground">Speak at a normal pace and enunciate clearly. Avoid background noise for best results.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h4 className="font-semibold mb-2">📝 Say Punctuation</h4>
            <p className="text-sm text-muted-foreground">Say "comma", "period", "question mark" to add punctuation to your dictation.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h4 className="font-semibold mb-2">✨ Use AI Polish</h4>
            <p className="text-sm text-muted-foreground">For professional emails, use AI Polish to add proper formatting, greetings, and closings automatically.</p>
          </CardContent>
        </Card>
      </div>

      <h2>Example</h2>
      <Card className="my-6 border-primary/50">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground mb-2">What you say:</p>
          <code className="block bg-muted p-3 rounded mb-4 text-sm">"Tell Sarah I reviewed the proposal and everything looks good. We can move forward with implementation next week."</code>
          <p className="text-sm text-muted-foreground mb-2">AI Polish creates:</p>
          <div className="bg-background p-4 rounded border">
            <p className="text-sm">Hi Sarah,</p>
            <p className="text-sm mt-3">I've reviewed the proposal and everything looks good. We can move forward with implementation next week.</p>
            <p className="text-sm mt-3">Let me know if you have any questions.</p>
            <p className="text-sm mt-3">Best regards</p>
          </div>
        </CardContent>
      </Card>

      <h2>Troubleshooting</h2>
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4">
            <h4 className="font-semibold mb-2">❌ Microphone Not Working</h4>
            <p className="text-sm text-muted-foreground"><strong>Solution:</strong> Check browser permissions. Go to browser settings and ensure microphone access is allowed for EaseMail.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h4 className="font-semibold mb-2">❌ Poor Transcription Quality</h4>
            <p className="text-sm text-muted-foreground"><strong>Solution:</strong> Reduce background noise, speak more clearly, and ensure you're using a good microphone.</p>
          </CardContent>
        </Card>
      </div>

      <Alert className="my-6">
        <Mic className="h-4 w-4" />
        <AlertDescription>
          <strong>Pro Tip:</strong> Voice dictation works great on mobile! Use it when you're on the go and need to send a quick email without typing.
        </AlertDescription>
      </Alert>
    </div>
  );
}

