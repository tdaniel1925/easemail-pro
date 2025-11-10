'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  // Getting Started
  {
    category: 'Getting Started',
    question: 'How do I get started with EaseMail?',
    answer: 'Simply sign up for a free account, connect your first email account (Gmail, Outlook, or any IMAP provider), and you\'re ready to go! Our onboarding wizard will guide you through the initial setup and show you the key features.'
  },
  {
    category: 'Getting Started',
    question: 'Which email providers does EaseMail support?',
    answer: 'EaseMail supports all major email providers including Gmail, Google Workspace, Microsoft Outlook/Office 365, Yahoo Mail, iCloud Mail, and any email service that supports IMAP. You can connect unlimited accounts on paid plans.'
  },
  {
    category: 'Getting Started',
    question: 'Do I need to download any software?',
    answer: 'No! EaseMail is a web-based application that works directly in your browser. There\'s nothing to download or install. Simply log in from any device with internet access and start managing your emails.'
  },
  {
    category: 'Getting Started',
    question: 'Can I import my existing emails?',
    answer: 'Yes! When you connect an email account, EaseMail automatically syncs your existing emails, folders, and labels. The initial sync may take a few minutes to a few hours depending on the size of your mailbox.'
  },

  // Features & Functionality
  {
    category: 'Features & Functionality',
    question: 'How does the AI email writing feature work?',
    answer: 'Our AI writing assistant uses advanced language models to help you compose professional emails. Simply provide a brief prompt or bullet points about what you want to say, select a tone (professional, friendly, formal, etc.), and the AI generates a complete, polished email for you. You can then edit or send it as-is.'
  },
  {
    category: 'Features & Functionality',
    question: 'What is the Voice Dictation feature?',
    answer: 'Voice Dictation lets you speak your emails naturally. EaseMail transcribes your speech to text in real-time, and you can optionally have our AI polish the text to make it more professional and well-formatted. It\'s perfect for composing emails while on the go or when you prefer speaking over typing.'
  },
  {
    category: 'Features & Functionality',
    question: 'Can I manage multiple email accounts in one inbox?',
    answer: 'Absolutely! EaseMail\'s unified inbox displays emails from all your connected accounts in one place. You can also view accounts separately, search across all accounts simultaneously, and switch between them seamlessly. Individual plans support up to 3 accounts, while Organization plans support unlimited accounts.'
  },
  {
    category: 'Features & Functionality',
    question: 'How do email rules and automation work?',
    answer: 'Email rules let you automatically organize, label, and prioritize incoming emails based on conditions you set. For example, you can automatically move newsletters to a specific folder, star emails from your boss, or label emails containing certain keywords. Rules are flexible and powerful, helping you maintain inbox zero effortlessly.'
  },
  {
    category: 'Features & Functionality',
    question: 'What is the SMS integration feature?',
    answer: 'SMS integration allows you to send and receive text messages directly from your EaseMail inbox. You can purchase a phone number or use your existing Twilio account, and all SMS conversations appear alongside your emails in a unified timeline. It\'s perfect for businesses that need to manage both email and text communication in one place.'
  },

  // Pricing & Plans
  {
    category: 'Pricing & Plans',
    question: 'Is there a free plan?',
    answer: 'Yes! Our free plan includes basic email management for 1 account, limited AI features (10 AI writes per month), and core functionality like smart folders and search. It\'s perfect for trying out EaseMail. Upgrade anytime to unlock unlimited AI features, multiple accounts, and advanced automation.'
  },
  {
    category: 'Pricing & Plans',
    question: 'What\'s the difference between Individual and Organization plans?',
    answer: 'Individual plans ($9.99/month) are for personal use with up to 3 email accounts and unlimited AI features. Organization plans ($29.99/month) include everything in Individual plus: unlimited team members, centralized billing, admin dashboard, usage analytics, team collaboration features, and priority support. Organizations can add unlimited members at no extra cost.'
  },
  {
    category: 'Pricing & Plans',
    question: 'Can I cancel my subscription anytime?',
    answer: 'Yes! You can cancel your subscription at any time from your account settings. There are no cancellation fees or commitments. If you cancel, you\'ll retain access to premium features until the end of your current billing period, after which your account will revert to the free plan.'
  },
  {
    category: 'Pricing & Plans',
    question: 'Do you offer discounts for nonprofits or students?',
    answer: 'Yes! We offer special discounts for qualified nonprofits, educational institutions, and students. Contact our sales team at sales@easemail.app with proof of status (501(c)(3) documentation, .edu email address, or student ID) to discuss available discounts.'
  },
  {
    category: 'Pricing & Plans',
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, Mastercard, American Express, Discover) processed securely through Stripe. For Organization plans with 10+ members, we can also arrange invoicing and ACH/wire transfers. Contact sales@easemail.app for enterprise payment options.'
  },

  // Privacy & Security
  {
    category: 'Privacy & Security',
    question: 'How secure is my data?',
    answer: 'Security is our top priority. All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We use industry-standard OAuth 2.0 for email account authentication, meaning we never store your email passwords. Our infrastructure is hosted on enterprise-grade cloud providers with SOC 2 compliance. We also support two-factor authentication (2FA) for additional account security.'
  },
  {
    category: 'Privacy & Security',
    question: 'Do you read or store my emails?',
    answer: 'We only access your emails to provide the services you requested (displaying them, searching, AI features, etc.). Your emails are stored in our secure database for sync purposes, but they are never shared with third parties, used for advertising, or accessed by our team without your explicit permission. AI processing happens in real-time and training data is never retained.'
  },
  {
    category: 'Privacy & Security',
    question: 'Is my AI usage data used to train your models?',
    answer: 'No. We have a strict zero-retention policy for AI features. Your email content and AI-generated text are processed in real-time and immediately discarded after delivery. We do not use your data to train or improve AI models. Your communications remain completely private.'
  },
  {
    category: 'Privacy & Security',
    question: 'Are you GDPR and CCPA compliant?',
    answer: 'Yes! EaseMail is fully compliant with GDPR, CCPA, and other major privacy regulations. You have complete control over your data and can export or delete it at any time. We provide data processing agreements (DPAs) for Organization customers upon request.'
  },
  {
    category: 'Privacy & Security',
    question: 'What happens to my data if I delete my account?',
    answer: 'If you delete your account, all your data (emails, contacts, settings) is permanently removed from our servers within 30 days. During the 30-day grace period, you can reactivate your account and restore your data. After 30 days, deletion is irreversible. You can also export your data before deletion.'
  },

  // Technical Support
  {
    category: 'Technical Support',
    question: 'What if I encounter a problem or bug?',
    answer: 'We\'re here to help! Contact our support team at support@easemail.app or use the in-app help widget. Free plan users receive email support (24-48 hour response time), while paid plans get priority support (4-8 hour response time). For Organization plans with 10+ members, we offer dedicated account management and live chat support.'
  },
  {
    category: 'Technical Support',
    question: 'Do you offer training or onboarding for teams?',
    answer: 'Yes! Organization plans include comprehensive onboarding resources including video tutorials, documentation, and email guides. For teams of 20+ members, we offer personalized onboarding sessions and training webinars. Contact sales@easemail.app to arrange team training.'
  },
  {
    category: 'Technical Support',
    question: 'What browsers and devices are supported?',
    answer: 'EaseMail works on all modern browsers including Chrome, Firefox, Safari, and Edge. We recommend using the latest browser version for the best experience. EaseMail is fully responsive and works on desktop, tablet, and mobile devices. Mobile apps for iOS and Android are currently in development.'
  },
  {
    category: 'Technical Support',
    question: 'Is there an API for custom integrations?',
    answer: 'We currently offer a limited API for Organization plans to integrate with internal systems. A full public API is on our roadmap for 2025. If you have specific integration needs, contact our sales team to discuss custom solutions.'
  },

  // AI Features
  {
    category: 'AI Features',
    question: 'How many AI-generated emails can I create per month?',
    answer: 'Free plans include 10 AI writes per month. Individual plans ($9.99/month) include unlimited AI email generation, voice dictation, email remixing, and smart replies. Organization plans also include unlimited AI features for all team members.'
  },
  {
    category: 'AI Features',
    question: 'Can I customize the AI writing style?',
    answer: 'Yes! You can select from various tones (professional, friendly, casual, formal, assertive, empathetic) and adjust length (shorter, longer, concise). You can also save custom templates with your preferred writing style for common email types (follow-ups, introductions, meeting requests, etc.).'
  },
  {
    category: 'AI Features',
    question: 'What languages does the AI support?',
    answer: 'Our AI currently supports English for all features. We\'re actively working on adding support for Spanish, French, German, Portuguese, and other major languages in early 2025. Voice dictation currently supports English only.'
  },
  {
    category: 'AI Features',
    question: 'How accurate is the voice dictation?',
    answer: 'Our voice dictation uses advanced speech recognition with >95% accuracy for clear audio. Accuracy improves over time as the system learns your voice patterns. For best results, use a quality microphone in a quiet environment. You can always edit the transcribed text before sending.'
  },
];

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', ...Array.from(new Set(faqs.map(faq => faq.category)))];
  const filteredFAQs = selectedCategory === 'all' 
    ? faqs 
    : faqs.filter(faq => faq.category === selectedCategory);

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-primary/5 to-background py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <HelpCircle className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-muted-foreground">
              Find answers to common questions about EaseMail. Can't find what you're looking for? Contact our support team.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto px-6 py-16">
        {/* Category Filter */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="flex flex-wrap gap-3 justify-center">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                }`}
              >
                {category === 'all' ? 'All Questions' : category}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ List */}
        <div className="max-w-4xl mx-auto space-y-4">
          {filteredFAQs.map((faq, index) => {
            const isOpen = openItems.has(index);
            
            return (
              <Card key={index} className="overflow-hidden">
                <button
                  onClick={() => toggleItem(index)}
                  className="w-full text-left p-6 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                          {faq.category}
                        </span>
                      </div>
                      <h3 className="font-semibold text-lg">{faq.question}</h3>
                    </div>
                    <div className="flex-shrink-0 mt-1">
                      {isOpen ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </button>
                
                {isOpen && (
                  <div className="px-6 pb-6 pt-0">
                    <p className="text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Still Have Questions CTA */}
        <div className="max-w-4xl mx-auto mt-16 text-center">
          <Card className="p-8 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <h3 className="text-2xl font-bold mb-4">
              Still have questions?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Can't find the answer you're looking for? Our support team is ready to help you with any questions or concerns.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="mailto:support@easemail.app">
                <Button size="lg">
                  Contact Support
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline">
                  View Pricing
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}

