'use client';

import { HelpCircle, Search } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  popular?: boolean;
}

const faqs: FAQItem[] = [
  {
    id: 'faq-1',
    question: 'How do I connect my email account?',
    answer: 'To connect your email account, go to Settings → Accounts → Add Account. Choose your provider (Gmail, Outlook, or Custom IMAP) and follow the authentication steps. For Gmail, you may need to enable "App Passwords" in your Google Account settings. For Outlook, ensure IMAP is enabled in your account settings.',
    category: 'Getting Started',
    tags: ['accounts', 'setup', 'gmail', 'outlook'],
    popular: true
  },
  {
    id: 'faq-2',
    question: 'Is my data secure and private?',
    answer: 'Yes! We take security seriously. All data is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption. We never sell your data to third parties. Your email credentials are stored securely using industry-standard encryption. We are GDPR and CCPA compliant. You can read our full Privacy Policy and Security documentation for more details.',
    category: 'Security & Privacy',
    tags: ['security', 'privacy', 'encryption', 'gdpr'],
    popular: true
  },
  {
    id: 'faq-3',
    question: 'How does AI email writing work?',
    answer: 'Our AI Write feature uses advanced language models (GPT-4 and Claude) to generate professional emails based on your prompts. Simply describe what you want to write, choose your tone (professional, friendly, casual, or formal), and the AI will create a draft in seconds. You can regenerate, edit, and refine the output. The AI learns from your preferences over time to better match your writing style.',
    category: 'AI Features',
    tags: ['ai', 'writing', 'compose'],
    popular: true
  },
  {
    id: 'faq-4',
    question: 'Can I use EaseMail on mobile?',
    answer: 'Yes! EaseMail is fully responsive and works great on mobile browsers (iOS Safari, Chrome, Firefox). We\'re also developing native iOS and Android apps which will be available in Q2 2025. The mobile web version includes all core features: reading emails, composing with AI, voice dictation, and more.',
    category: 'General',
    tags: ['mobile', 'apps', 'responsive'],
    popular: true
  },
  {
    id: 'faq-5',
    question: 'What\'s the difference between Free and Pro plans?',
    answer: 'Free plan includes 1 email account, 10 AI requests per month, and basic features. Pro plan ($12/month) includes unlimited email accounts, 500 AI requests/month, advanced automation, priority support, custom signatures, SMS capabilities, and more. Enterprise plan offers custom limits, dedicated support, and team collaboration features. See our Pricing page for full comparison.',
    category: 'Billing',
    tags: ['pricing', 'plans', 'subscription'],
    popular: true
  },
  {
    id: 'faq-6',
    question: 'How do I cancel my subscription?',
    answer: 'You can cancel anytime from Settings → Billing → Manage Subscription. Your access continues until the end of your current billing period. No refunds for partial months, but you won\'t be charged again. All your data remains accessible for 30 days after cancellation. You can reactivate anytime and your data will be restored.',
    category: 'Billing',
    tags: ['cancel', 'subscription', 'refund']
  },
  {
    id: 'faq-7',
    question: 'Can I send SMS from EaseMail?',
    answer: 'Yes! With a Pro or Enterprise plan, you can send SMS directly from the Contacts page. Click on any contact with a phone number, and select "Send SMS". Messages are sent via Twilio with industry-leading deliverability. SMS costs $0.0075 per message and are billed monthly. Great for quick follow-ups or time-sensitive communications.',
    category: 'Features',
    tags: ['sms', 'messaging', 'contacts', 'pro']
  },
  {
    id: 'faq-8',
    question: 'How does voice dictation work?',
    answer: 'Click the microphone icon in any compose window and start speaking. Our AI-powered speech recognition supports 50+ languages and accents. It handles punctuation automatically ("period", "comma", "new line"). Voice recordings are processed securely and deleted immediately after transcription. Works best with Chrome or Edge browsers.',
    category: 'AI Features',
    tags: ['voice', 'dictation', 'accessibility']
  },
  {
    id: 'faq-9',
    question: 'What are email rules and how do I set them up?',
    answer: 'Email rules automatically organize your inbox based on conditions you set. For example: "If email is from client@example.com, move to Clients folder and mark as important". Go to Rules → Create Rule, set your conditions (sender, subject, attachments, etc.) and actions (move, label, star, archive). Rules run automatically on new emails.',
    category: 'Features',
    tags: ['rules', 'automation', 'filters', 'organization']
  },
  {
    id: 'faq-10',
    question: 'Can I import my contacts?',
    answer: 'Yes! Go to Contacts → Import. We support CSV, vCard (.vcf), and direct import from Gmail/Outlook. For CSV, ensure columns are labeled: name, email, phone, company. We automatically detect and merge duplicates. You can also manually add contacts one by one or sync from your connected email accounts.',
    category: 'Contacts',
    tags: ['contacts', 'import', 'csv', 'sync']
  },
  {
    id: 'faq-11',
    question: 'Why are my emails not syncing?',
    answer: 'Common causes: 1) Check your internet connection, 2) Verify email account credentials haven\'t changed, 3) For Gmail, ensure IMAP is enabled and App Password is correct, 4) Check if your email provider is experiencing outages. Try disconnecting and reconnecting the account in Settings → Accounts. If issues persist, contact support with your account ID.',
    category: 'Troubleshooting',
    tags: ['sync', 'errors', 'connection', 'imap']
  },
  {
    id: 'faq-12',
    question: 'Can I use custom domains for email?',
    answer: 'Enterprise plan supports custom domain email (e.g., you@yourcompany.com) via IMAP/SMTP configuration. You\'ll need your domain\'s IMAP server address, port, and authentication details from your hosting provider. We provide step-by-step setup guides for popular providers (Google Workspace, Microsoft 365, Zoho Mail, etc.).',
    category: 'Advanced',
    tags: ['custom domain', 'imap', 'smtp', 'enterprise']
  },
  {
    id: 'faq-13',
    question: 'How do keyboard shortcuts work?',
    answer: 'Press "?" to see all shortcuts. Common ones: C = Compose, R = Reply, F = Forward, / = Search, E = Archive, # = Delete. You can customize shortcuts in Settings → Keyboard Shortcuts. Shortcuts work in most browsers except when typing in input fields. They dramatically speed up your workflow once memorized!',
    category: 'Features',
    tags: ['shortcuts', 'keyboard', 'productivity']
  },
  {
    id: 'faq-14',
    question: 'Can I schedule emails to send later?',
    answer: 'Yes! When composing, click the dropdown arrow next to "Send" and choose "Schedule Send". Pick a date/time or use smart suggestions ("Tomorrow at 9 AM", "Monday morning", etc.). Scheduled emails are stored securely and sent automatically at the specified time. You can edit or cancel scheduled emails before they\'re sent.',
    category: 'Features',
    tags: ['schedule', 'send later', 'compose']
  },
  {
    id: 'faq-15',
    question: 'What browsers are supported?',
    answer: 'EaseMail works best on: Chrome 90+, Edge 90+, Firefox 88+, Safari 14+. Some features (voice dictation, notifications) require modern browser APIs. We recommend Chrome or Edge for the best experience. Internet Explorer is not supported. The app is optimized for desktop browsers but works on mobile browsers too.',
    category: 'General',
    tags: ['browser', 'compatibility', 'requirements']
  },
  {
    id: 'faq-16',
    question: 'How do I create email signatures?',
    answer: 'Go to Settings → Email Signatures → Create Signature. Add your name, title, company, contact info, and optionally a logo. Use the rich text editor to format with colors, fonts, and styles. Set as default or choose which accounts use it. You can create multiple signatures for different purposes (work, personal, sales, etc.).',
    category: 'Features',
    tags: ['signature', 'branding', 'formatting']
  },
  {
    id: 'faq-17',
    question: 'Is there a limit on email storage?',
    answer: 'Free plan: 50GB total storage. Pro plan: 200GB. Enterprise: Custom limits. Storage includes emails, attachments, and contact photos. We display your current usage in Settings → Storage. If you reach your limit, you can upgrade your plan or delete old emails/attachments. Emails are stored efficiently with compression.',
    category: 'Billing',
    tags: ['storage', 'limits', 'quota']
  },
  {
    id: 'faq-18',
    question: 'Can I collaborate with my team?',
    answer: 'Yes! Enterprise plan includes team collaboration features: shared inboxes, internal notes on emails, @mentions, task assignments, and team analytics. Invite team members from Settings → Team. Each member has their own login and permissions. Great for customer support teams, sales teams, or any group managing shared email accounts.',
    category: 'Team',
    tags: ['team', 'collaboration', 'enterprise', 'shared']
  },
  {
    id: 'faq-19',
    question: 'How does the AI improve my emails?',
    answer: 'The "Improve" feature analyzes your draft and enhances it for: clarity, grammar, tone consistency, professionalism, conciseness. It fixes typos, suggests better word choices, and restructures sentences for impact. You can choose to accept all suggestions or pick specific improvements. The AI respects your original meaning and style.',
    category: 'AI Features',
    tags: ['ai', 'improve', 'grammar', 'editing']
  },
  {
    id: 'faq-20',
    question: 'What happens to my data if I cancel?',
    answer: 'After cancellation, your data remains accessible (read-only) for 30 days. You can export all emails, contacts, and attachments during this period. After 30 days, data is permanently deleted and cannot be recovered. We recommend exporting your data before canceling. Reactivating within 30 days restores full access instantly.',
    category: 'Billing',
    tags: ['cancel', 'data', 'export', 'deletion']
  }
];

const categories = ['All', 'Getting Started', 'AI Features', 'Features', 'Billing', 'Security & Privacy', 'Troubleshooting', 'General', 'Advanced', 'Team', 'Contacts'];

export default function FAQSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredFAQs = useMemo(() => {
    let filtered = faqs;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(faq =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query) ||
        faq.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(faq => faq.category === selectedCategory);
    }

    return filtered;
  }, [searchQuery, selectedCategory]);

  const popularFAQs = faqs.filter(faq => faq.popular);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 mb-4">
          <HelpCircle className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold">Frequently Asked Questions</h1>
        <p className="text-xl text-muted-foreground">
          Quick answers to common questions about EaseMail
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="flex-wrap h-auto">
          {categories.map((category) => (
            <TabsTrigger key={category} value={category} className="m-1">
              {category}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="space-y-6">
          {/* Popular FAQs (only in "All" view and no search) */}
          {selectedCategory === 'All' && !searchQuery && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>Popular Questions</span>
                  <Badge variant="secondary">Most Viewed</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {popularFAQs.map((faq) => (
                    <AccordionItem key={faq.id} value={faq.id}>
                      <AccordionTrigger className="text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3">
                          <p className="text-muted-foreground leading-relaxed">
                            {faq.answer}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {faq.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}

          {/* All FAQs */}
          <Card>
            <CardHeader>
              <CardTitle>
                {searchQuery
                  ? `Search Results (${filteredFAQs.length})`
                  : selectedCategory === 'All'
                  ? 'All Questions'
                  : selectedCategory}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredFAQs.length === 0 ? (
                <div className="text-center py-12">
                  <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No FAQs found. Try a different search term or category.
                  </p>
                </div>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {filteredFAQs.map((faq) => (
                    <AccordionItem key={faq.id} value={faq.id}>
                      <AccordionTrigger className="text-left hover:no-underline">
                        <div className="flex items-start gap-3 pr-4">
                          <HelpCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-base font-medium">{faq.question}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pl-8">
                          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                            {faq.answer}
                          </p>
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">Related topics:</p>
                            <div className="flex flex-wrap gap-2">
                              {faq.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                                  onClick={() => setSearchQuery(tag)}
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Still have questions? */}
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
        <CardContent className="text-center py-8">
          <h3 className="text-2xl font-bold mb-2">Still have questions?</h3>
          <p className="text-muted-foreground mb-6">
            Can't find what you're looking for? Our support team is here to help!
          </p>
          <div className="flex gap-4 justify-center">
            <a href="mailto:support@easemail.com">
              <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                Contact Support
              </button>
            </a>
            <a href="/help">
              <button className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors">
                Browse Help Articles
              </button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
