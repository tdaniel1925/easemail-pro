'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Mail,
  Brain,
  Mic,
  Sparkles,
  Zap,
  Shield,
  Users,
  FolderTree,
  MessageSquare,
  Calendar,
  Search,
  Bell,
  Tag,
  Archive,
  Filter,
  Clock,
  Star,
  Download,
  Upload,
  Smartphone,
  Globe,
  Lock,
  TrendingUp,
  CheckCircle,
  XCircle,
  Minus,
  Check,
  ArrowRight
} from 'lucide-react';

export default function FeaturesPage() {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        <div className="container mx-auto px-6 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Everything You Need to Master Email
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground">
              A comprehensive email platform with AI-powered features, unified inbox management,
              and powerful automation tools designed for modern professionals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Link href="/signup">
                <Button size="lg" className="text-lg px-8">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Complete Feature List */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Complete Feature List
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Every feature you need to transform your email experience, all in one place.
          </p>
        </div>

        {/* AI Features */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Brain className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold">AI-Powered Features</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                title: 'AI Email Writing',
                description: 'Generate professional emails from simple prompts or bullet points in seconds.'
              },
              {
                icon: Mic,
                title: 'Voice to Email',
                description: 'Speak naturally and watch your voice transform into polished, professional emails.'
              },
              {
                icon: Sparkles,
                title: 'Smart Remix',
                description: 'Instantly adjust tone, length, and style. Make emails professional, casual, shorter, or longer.'
              },
              {
                icon: Brain,
                title: 'AI Smart Replies',
                description: 'AI-generated reply suggestions based on email context and your writing style.'
              },
              {
                icon: Search,
                title: 'Intelligent Search',
                description: 'Natural language search that understands context and intent, not just keywords.'
              },
              {
                icon: Tag,
                title: 'Auto-Categorization',
                description: 'AI automatically categorizes and labels emails based on content and importance.'
              },
              {
                icon: TrendingUp,
                title: 'Smart Priority Inbox',
                description: 'AI learns what matters to you and surfaces important emails automatically.'
              },
              {
                icon: Brain,
                title: 'Email Summaries',
                description: 'Get AI-generated summaries of long email threads and newsletters.'
              },
              {
                icon: Bell,
                title: 'Smart Notifications',
                description: 'AI-powered notifications that only alert you for truly important emails.'
              }
            ].map((feature, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Email Management */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold">Email Management</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Mail,
                title: 'Unified Inbox',
                description: 'Manage all your email accounts (Gmail, Outlook, Yahoo, iCloud, etc.) in one interface.'
              },
              {
                icon: FolderTree,
                title: 'Custom Folders & Labels',
                description: 'Organize emails with unlimited custom folders, labels, and color coding.'
              },
              {
                icon: Search,
                title: 'Advanced Search',
                description: 'Powerful search with filters for sender, date range, attachments, labels, and more.'
              },
              {
                icon: Filter,
                title: 'Smart Filters',
                description: 'Create custom filters to automatically organize incoming emails.'
              },
              {
                icon: Archive,
                title: 'Quick Actions',
                description: 'Archive, delete, snooze, or mark as read with keyboard shortcuts and swipe gestures.'
              },
              {
                icon: Clock,
                title: 'Snooze Emails',
                description: 'Temporarily remove emails from your inbox and have them return at the perfect time.'
              },
              {
                icon: Star,
                title: 'Star & Pin',
                description: 'Star important emails and pin critical messages to the top of your inbox.'
              },
              {
                icon: Mail,
                title: 'Thread Grouping',
                description: 'Intelligent conversation threading keeps related emails organized together.'
              },
              {
                icon: Download,
                title: 'Bulk Actions',
                description: 'Select multiple emails and perform actions like delete, archive, or label in bulk.'
              }
            ].map((feature, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Automation & Rules */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Zap className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-2xl font-bold">Automation & Rules</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Zap,
                title: 'Custom Automation Rules',
                description: 'Create unlimited rules to automatically organize, label, forward, or delete emails.'
              },
              {
                icon: Filter,
                title: 'Conditional Actions',
                description: 'Set up complex automation with multiple conditions and actions (if/then/else logic).'
              },
              {
                icon: Bell,
                title: 'Auto-Responders',
                description: 'Set up automatic replies for specific senders or email types.'
              },
              {
                icon: Upload,
                title: 'Auto-Forward',
                description: 'Automatically forward emails matching specific criteria to other addresses.'
              },
              {
                icon: Archive,
                title: 'Auto-Archive',
                description: 'Automatically archive old emails after a specified period.'
              },
              {
                icon: Tag,
                title: 'Auto-Labeling',
                description: 'Automatically apply labels based on sender, subject, or content.'
              }
            ].map((feature, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Communication Tools */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-2xl font-bold">Communication Tools</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: MessageSquare,
                title: 'SMS Integration',
                description: 'Send and receive SMS messages directly from your email interface.'
              },
              {
                icon: Calendar,
                title: 'Calendar Integration',
                description: 'Integrated calendar with Google Calendar and Microsoft Calendar sync.'
              },
              {
                icon: Users,
                title: 'Contact Management',
                description: 'Rich contact profiles with notes, communication history, and custom fields.'
              },
              {
                icon: Mail,
                title: 'Templates',
                description: 'Save and reuse email templates for common responses and messages.'
              },
              {
                icon: Upload,
                title: 'File Attachments',
                description: 'Attach files up to 25MB with drag-and-drop support.'
              },
              {
                icon: Mail,
                title: 'Rich Text Editor',
                description: 'Powerful editor with formatting, emojis, links, and inline images.'
              }
            ].map((feature, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Security & Privacy */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-2xl font-bold">Security & Privacy</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: 'End-to-End Encryption',
                description: 'Bank-level encryption for all emails in transit and at rest.'
              },
              {
                icon: Lock,
                title: 'Two-Factor Authentication',
                description: 'Secure your account with 2FA using authenticator apps or SMS.'
              },
              {
                icon: Shield,
                title: 'Privacy-First AI',
                description: 'AI processing with zero data retention - your data is never stored or used for training.'
              },
              {
                icon: Globe,
                title: 'GDPR Compliant',
                description: 'Full compliance with GDPR, CCPA, and international privacy regulations.'
              },
              {
                icon: Shield,
                title: 'Spam & Phishing Protection',
                description: 'Advanced filters to protect against spam, phishing, and malicious emails.'
              },
              {
                icon: Lock,
                title: 'OAuth Authentication',
                description: 'Secure OAuth 2.0 authentication - we never store your email passwords.'
              }
            ].map((feature, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Productivity & Collaboration */}
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-2xl font-bold">Productivity & Collaboration</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Users,
                title: 'Team Workspaces',
                description: 'Shared inboxes and collaborative email management for teams.'
              },
              {
                icon: TrendingUp,
                title: 'Email Analytics',
                description: 'Track response times, email volume, and productivity metrics.'
              },
              {
                icon: Smartphone,
                title: 'Mobile Apps',
                description: 'Native iOS and Android apps with full feature parity.'
              },
              {
                icon: Globe,
                title: 'Multi-Language Support',
                description: 'Interface available in 20+ languages with AI translation support.'
              },
              {
                icon: Zap,
                title: 'Keyboard Shortcuts',
                description: 'Extensive keyboard shortcuts for power users to maximize efficiency.'
              },
              {
                icon: Mail,
                title: 'Email Scheduling',
                description: 'Schedule emails to send at the perfect time across any timezone.'
              }
            ].map((feature, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="bg-muted/50 py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                How EaseMail Compares
              </h2>
              <p className="text-lg text-muted-foreground">
                See how we stack up against Superhuman, Gmail, and Outlook
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-background rounded-lg overflow-hidden shadow-lg">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-4 px-6 font-semibold min-w-[250px]">Feature</th>
                    <th className="text-center py-4 px-4 font-semibold min-w-[120px]">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                          <Mail className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <span>EaseMail</span>
                      </div>
                    </th>
                    <th className="text-center py-4 px-4 font-semibold text-muted-foreground min-w-[120px]">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                          <Zap className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <span>Superhuman</span>
                      </div>
                    </th>
                    <th className="text-center py-4 px-4 font-semibold text-muted-foreground min-w-[120px]">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                          <Mail className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <span>Gmail</span>
                      </div>
                    </th>
                    <th className="text-center py-4 px-4 font-semibold text-muted-foreground min-w-[120px]">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                          <Mail className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <span>Outlook</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      category: 'AI Features',
                      features: [
                        { name: 'AI Email Writing', easemail: true, superhuman: false, gmail: 'Limited', outlook: 'Limited' },
                        { name: 'Voice to Email with AI Polish', easemail: true, superhuman: false, gmail: false, outlook: false },
                        { name: 'Smart Remix (Tone/Length)', easemail: true, superhuman: false, gmail: false, outlook: false },
                        { name: 'AI Smart Replies', easemail: true, superhuman: 'Basic', gmail: 'Basic', outlook: 'Basic' },
                        { name: 'Email Summaries', easemail: true, superhuman: false, gmail: 'Limited', outlook: false },
                      ]
                    },
                    {
                      category: 'Email Management',
                      features: [
                        { name: 'Multi-Account Unified Inbox', easemail: true, superhuman: true, gmail: 'Limited', outlook: true },
                        { name: 'Advanced Search', easemail: true, superhuman: true, gmail: true, outlook: true },
                        { name: 'Custom Automation Rules', easemail: true, superhuman: 'Limited', gmail: 'Basic', outlook: 'Basic' },
                        { name: 'Snooze Emails', easemail: true, superhuman: true, gmail: true, outlook: true },
                        { name: 'Email Scheduling', easemail: true, superhuman: true, gmail: true, outlook: true },
                      ]
                    },
                    {
                      category: 'Communication',
                      features: [
                        { name: 'SMS Integration', easemail: true, superhuman: false, gmail: false, outlook: false },
                        { name: 'Calendar Integration', easemail: true, superhuman: true, gmail: true, outlook: true },
                        { name: 'Contact Management', easemail: true, superhuman: 'Basic', gmail: 'Basic', outlook: true },
                        { name: 'Rich Text Editor', easemail: true, superhuman: true, gmail: true, outlook: true },
                      ]
                    },
                    {
                      category: 'Security & Privacy',
                      features: [
                        { name: 'End-to-End Encryption', easemail: true, superhuman: true, gmail: 'In Transit', outlook: 'In Transit' },
                        { name: 'Privacy-First AI (Zero Retention)', easemail: true, superhuman: false, gmail: false, outlook: false },
                        { name: 'Two-Factor Authentication', easemail: true, superhuman: true, gmail: true, outlook: true },
                        { name: 'GDPR Compliant', easemail: true, superhuman: true, gmail: true, outlook: true },
                      ]
                    },
                    {
                      category: 'Pricing & Access',
                      features: [
                        { name: 'Free Plan Available', easemail: true, superhuman: false, gmail: true, outlook: true },
                        { name: 'Starting Price', easemail: '$0/mo', superhuman: '$30/mo', gmail: '$0/mo', outlook: '$0/mo' },
                        { name: 'Pro Plan Price', easemail: '$12/mo', superhuman: '$30/mo', gmail: '$6/mo', outlook: '$7/mo' },
                        { name: 'Mobile Apps', easemail: true, superhuman: true, gmail: true, outlook: true },
                      ]
                    }
                  ].map((section, sectionIndex) => (
                    <>
                      <tr key={`section-${sectionIndex}`} className="border-b bg-muted/30">
                        <td colSpan={5} className="py-3 px-6 font-bold text-sm">
                          {section.category}
                        </td>
                      </tr>
                      {section.features.map((row, rowIndex) => (
                        <tr key={`${sectionIndex}-${rowIndex}`} className="border-b hover:bg-muted/20 transition-colors">
                          <td className="py-4 px-6 font-medium">{row.name}</td>
                          <td className="text-center py-4 px-4">
                            {typeof row.easemail === 'boolean' ? (
                              row.easemail ? (
                                <CheckCircle className="h-6 w-6 text-green-600 mx-auto" />
                              ) : (
                                <XCircle className="h-6 w-6 text-red-400 mx-auto" />
                              )
                            ) : (
                              <span className="text-sm font-medium">{row.easemail}</span>
                            )}
                          </td>
                          <td className="text-center py-4 px-4">
                            {typeof row.superhuman === 'boolean' ? (
                              row.superhuman ? (
                                <CheckCircle className="h-6 w-6 text-muted-foreground mx-auto" />
                              ) : (
                                <XCircle className="h-6 w-6 text-red-400/50 mx-auto" />
                              )
                            ) : (
                              <span className="text-sm text-muted-foreground">{row.superhuman}</span>
                            )}
                          </td>
                          <td className="text-center py-4 px-4">
                            {typeof row.gmail === 'boolean' ? (
                              row.gmail ? (
                                <CheckCircle className="h-6 w-6 text-muted-foreground mx-auto" />
                              ) : (
                                <XCircle className="h-6 w-6 text-red-400/50 mx-auto" />
                              )
                            ) : (
                              <span className="text-sm text-muted-foreground">{row.gmail}</span>
                            )}
                          </td>
                          <td className="text-center py-4 px-4">
                            {typeof row.outlook === 'boolean' ? (
                              row.outlook ? (
                                <CheckCircle className="h-6 w-6 text-muted-foreground mx-auto" />
                              ) : (
                                <XCircle className="h-6 w-6 text-red-400/50 mx-auto" />
                              )
                            ) : (
                              <span className="text-sm text-muted-foreground">{row.outlook}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                * Pricing and features accurate as of 2024. Competitor features may vary by plan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-3xl mx-auto text-center space-y-8 bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white rounded-2xl p-12">
          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to experience the future of email?
          </h2>
          <p className="text-xl text-white/90">
            Join thousands of professionals who've already made the switch to smarter email management.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="text-lg px-8 bg-white/10 border-white/20 hover:bg-white/20 text-white">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
