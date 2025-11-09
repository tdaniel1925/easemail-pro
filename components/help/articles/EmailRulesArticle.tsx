'use client';

import { Zap, PlayCircle, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import VideoPlaceholder from '../VideoPlaceholder';

export default function EmailRulesArticle() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-4">Master Email Rules & Automation</h1>
        <p className="text-xl text-muted-foreground">
          Automate your inbox and save hours every week with intelligent email rules
        </p>
      </div>

      {/* Video Tutorials */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <VideoPlaceholder
          title="Email Rules 101: Getting Started"
          description="Learn the basics of creating your first email rule"
          duration="6:30"
          category="Tutorial"
        />
        <VideoPlaceholder
          title="Advanced Email Automation Strategies"
          description="Pro techniques for complex automation workflows"
          duration="12:15"
          category="Advanced"
        />
      </div>

      {/* What Are Email Rules */}
      <Card>
        <CardHeader>
          <CardTitle>What Are Email Rules?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Email rules are automated actions that EaseMail performs on incoming or existing emails based on conditions you set.
            Think of them as "if-then" statements: <strong>IF</strong> an email meets certain criteria, <strong>THEN</strong> take specific actions.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">Example: Client Emails</h4>
              <p className="text-sm text-muted-foreground">
                <strong>IF</strong> email is from @client.com <strong>AND</strong> has attachment<br />
                <strong>THEN</strong> move to "Client Projects" folder <strong>AND</strong> mark as important
              </p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
              <h4 className="font-semibold mb-2 text-green-900 dark:text-green-100">Example: Newsletters</h4>
              <p className="text-sm text-muted-foreground">
                <strong>IF</strong> subject contains "newsletter" <strong>OR</strong> "digest"<br />
                <strong>THEN</strong> move to "Reading List" folder <strong>AND</strong> mark as read
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Creating Your First Rule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-purple-500" />
            Creating Your First Rule (Step-by-Step)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <ol className="space-y-4">
            <li className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Navigate to Rules</h4>
                <p className="text-sm text-muted-foreground">
                  Click "Rules" in the left sidebar or press <kbd className="px-2 py-1 bg-muted rounded text-xs">R</kbd> keyboard shortcut
                </p>
              </div>
            </li>

            <li className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Click "Create New Rule"</h4>
                <p className="text-sm text-muted-foreground">
                  The Rule Builder interface will open
                </p>
              </div>
            </li>

            <li className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">3</div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Name Your Rule</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Choose a descriptive name like "VIP Clients" or "Newsletter Organizer"
                </p>
                <Badge variant="outline">Tip: Use clear names so you can find rules later</Badge>
              </div>
            </li>

            <li className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">4</div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Set Conditions (the "IF" part)</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Choose what criteria emails must match:
                </p>
                <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                  <li><strong>From:</strong> Specific email address or domain</li>
                  <li><strong>To:</strong> Who the email was sent to</li>
                  <li><strong>Subject:</strong> Keywords or phrases in the subject</li>
                  <li><strong>Body:</strong> Text contained in the email body</li>
                  <li><strong>Has Attachment:</strong> Emails with files attached</li>
                  <li><strong>Size:</strong> Emails larger or smaller than X MB</li>
                  <li><strong>Importance:</strong> Marked as important/normal</li>
                </ul>
              </div>
            </li>

            <li className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">5</div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Choose Logic: AND vs OR</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  <div className="p-3 rounded border bg-card">
                    <p className="font-semibold text-sm mb-1">AND Logic</p>
                    <p className="text-xs text-muted-foreground">All conditions must match</p>
                    <p className="text-xs mt-1">Example: From "boss@company.com" <strong>AND</strong> has attachment</p>
                  </div>
                  <div className="p-3 rounded border bg-card">
                    <p className="font-semibold text-sm mb-1">OR Logic</p>
                    <p className="text-xs text-muted-foreground">Any condition can match</p>
                    <p className="text-xs mt-1">Example: Subject contains "urgent" <strong>OR</strong> "asap"</p>
                  </div>
                </div>
              </div>
            </li>

            <li className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">6</div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Define Actions (the "THEN" part)</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Choose what happens to matching emails:
                </p>
                <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                  <li><strong>Move to Folder:</strong> Organize into specific folders</li>
                  <li><strong>Mark as Read/Unread:</strong> Auto-mark status</li>
                  <li><strong>Star/Unstar:</strong> Flag important emails</li>
                  <li><strong>Apply Label:</strong> Add categories/tags</li>
                  <li><strong>Forward to:</strong> Send copy to another address</li>
                  <li><strong>Delete:</strong> Automatically trash emails</li>
                  <li><strong>Mark as Spam:</strong> Report unwanted emails</li>
                </ul>
              </div>
            </li>

            <li className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">7</div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Test Your Rule</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Click "Test Rule" to see which existing emails would match. This helps you verify the rule works as expected before activating it.
                </p>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Always test rules first! You can preview results before making changes.
                  </AlertDescription>
                </Alert>
              </div>
            </li>

            <li className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">8</div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Activate & Monitor</h4>
                <p className="text-sm text-muted-foreground">
                  Toggle the rule "Active" and monitor its performance in Rules → Analytics. You can see how many emails it's processed and make adjustments as needed.
                </p>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Real-World Examples */}
      <Card>
        <CardHeader>
          <CardTitle>10 Essential Email Rules Everyone Should Use</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                name: "VIP Inbox",
                conditions: "From: boss@company.com OR ceo@company.com",
                actions: "Star + Move to 'VIP' folder + Mark as important",
                use: "Never miss emails from key people"
              },
              {
                name: "Newsletter Cleanup",
                conditions: "Subject contains: 'newsletter' OR 'unsubscribe' in body",
                actions: "Move to 'Reading List' + Mark as read",
                use: "Keep inbox clean while preserving newsletters for later"
              },
              {
                name: "Automated Receipts",
                conditions: "Subject contains: 'receipt' OR 'order confirmation' OR 'invoice'",
                actions: "Move to 'Receipts' folder + Apply 'Finance' label",
                use: "Organize purchase confirmations automatically"
              },
              {
                name: "Client Projects",
                conditions: "From: *@client.com AND has attachment",
                actions: "Move to 'Client X' folder + Star",
                use: "Track all client communications with files"
              },
              {
                name: "Meeting Invites",
                conditions: "Subject contains: 'meeting' OR 'invitation' OR has calendar attachment",
                actions: "Move to 'Calendar' folder",
                use: "Separate meeting requests from regular emails"
              },
              {
                name: "Spam Blocker",
                conditions: "From domain: spam-domain.com OR subject contains: 'you won'",
                actions: "Mark as spam + Delete",
                use: "Automatically block known spam senders"
              },
              {
                name: "Social Media Digest",
                conditions: "From: *@facebook.com OR *@twitter.com OR *@linkedin.com",
                actions: "Move to 'Social' folder + Mark as read",
                use: "De-clutter inbox from social notifications"
              },
              {
                name: "Urgent Flagging",
                conditions: "Subject contains: 'URGENT' OR 'ASAP' OR importance: high",
                actions: "Star + Leave in inbox + Desktop notification",
                use: "Immediately highlight time-sensitive emails"
              },
              {
                name: "Team Updates",
                conditions: "From: team@company.com",
                actions: "Move to 'Team' folder + Apply 'Updates' label",
                use: "Organize internal company communications"
              },
              {
                name: "Auto-Archive Old",
                conditions: "Older than: 90 days AND is read",
                actions: "Archive",
                use: "Keep inbox manageable by auto-archiving old read emails"
              }
            ].map((example, index) => (
              <Card key={index} className="border-l-4 border-l-purple-500">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{index + 1}. {example.name}</CardTitle>
                    <Badge variant="outline" className="text-xs">{example.use}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <p className="font-semibold text-muted-foreground">Conditions:</p>
                    <p className="ml-3">{example.conditions}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-muted-foreground">Actions:</p>
                    <p className="ml-3">{example.actions}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card className="border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Best Practices & Pro Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-2">
              <Zap className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
              <span><strong>Start Simple:</strong> Begin with one condition and one action. Add complexity gradually as you get comfortable.</span>
            </li>
            <li className="flex gap-2">
              <Zap className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
              <span><strong>Test Before Activating:</strong> Always use the "Test Rule" feature to verify it works as expected.</span>
            </li>
            <li className="flex gap-2">
              <Zap className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
              <span><strong>Use Wildcards:</strong> Use * in email addresses (e.g., *@company.com) to match entire domains.</span>
            </li>
            <li className="flex gap-2">
              <Zap className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
              <span><strong>Order Matters:</strong> Rules run in order. Place more specific rules before general ones.</span>
            </li>
            <li className="flex gap-2">
              <Zap className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
              <span><strong>Monitor Performance:</strong> Check Rules → Analytics monthly to see which rules are most active.</span>
            </li>
            <li className="flex gap-2">
              <Zap className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
              <span><strong>Delete Unused Rules:</strong> Remove rules you no longer need to keep your automation clean and fast.</span>
            </li>
            <li className="flex gap-2">
              <Zap className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
              <span><strong>Don't Over-Automate:</strong> Too many rules can make it hard to find emails. Keep it balanced!</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Rule Not Working?</AlertTitle>
        <AlertDescription>
          <p className="mb-2">Common issues and fixes:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Check if the rule is Active (toggle switch must be ON)</li>
            <li>Verify condition syntax is correct (especially wildcards and operators)</li>
            <li>Test with known matching emails to debug</li>
            <li>Check Rules → Analytics to see if rule is triggering</li>
            <li>Make sure rule order isn't causing conflicts (earlier rules stop later ones)</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
