'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Mail, 
  Sparkles, 
  Zap, 
  Shield, 
  Users, 
  TrendingUp,
  Brain,
  Mic,
  MessageSquare,
  Calendar,
  FolderTree,
  ArrowRight,
  Check
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/80 opacity-10" />
        
        <div className="container mx-auto px-6 py-20 md:py-32 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Hero Headline */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                Email Management,
                <br />
                <span className="text-primary">Reimagined with AI</span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
                Transform your inbox into a productivity powerhouse with intelligent AI assistance, unified accounts, and powerful automation.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/signup">
                <Button size="lg" className="text-lg px-8">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/features">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  Explore Features
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center text-sm text-muted-foreground pt-8">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span>Free plan available</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything you need to master your inbox
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to save you time and make email management effortless.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature Cards */}
          {[
            {
              icon: Brain,
              title: 'AI-Powered Writing',
              description: 'Compose professional emails in seconds with intelligent AI assistance. Generate drafts from simple prompts or enhance existing text.'
            },
            {
              icon: Mic,
              title: 'Voice Dictation',
              description: 'Speak your emails naturally and watch them transform into polished, professional messages with optional AI enhancement.'
            },
            {
              icon: Sparkles,
              title: 'Smart Remix',
              description: 'Instantly adjust tone, length, and style of any email. Make it professional, casual, shorter, or longer with one click.'
            },
            {
              icon: Mail,
              title: 'Unified Inbox',
              description: 'Connect all your email accounts in one place. Gmail, Outlook, Yahoo, iCloud, and more - all accessible from a single interface.'
            },
            {
              icon: Zap,
              title: 'Powerful Automation',
              description: 'Create custom rules to automatically organize, label, and prioritize emails. Let smart automation handle the repetitive work.'
            },
            {
              icon: FolderTree,
              title: 'Advanced Organization',
              description: 'Thread grouping, custom labels, smart folders, and intelligent search make finding any email effortless.'
            },
            {
              icon: MessageSquare,
              title: 'SMS Integration',
              description: 'Send and receive SMS messages directly from your email interface. Keep all your communication in one place.'
            },
            {
              icon: Calendar,
              title: 'Calendar Sync',
              description: 'Integrated calendar with Google and Microsoft sync. Schedule meetings and manage events without leaving your inbox.'
            },
            {
              icon: Users,
              title: 'Team Collaboration',
              description: 'Shared workspaces, team analytics, and centralized billing make it perfect for teams of any size.'
            }
          ].map((feature, index) => (
            <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Why Choose EaseMail */}
      <section className="bg-muted/50 py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Why choose EaseMail?
              </h2>
              <p className="text-lg text-muted-foreground">
                Built from the ground up to make email faster, smarter, and more enjoyable.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: TrendingUp,
                  title: 'Save Hours Every Week',
                  description: 'AI automation and smart features help you process emails 10x faster. Focus on what matters.'
                },
                {
                  icon: Shield,
                  title: 'Enterprise Security',
                  description: 'Bank-level encryption, secure authentication, and data privacy. Your emails stay private and protected.'
                },
                {
                  icon: Zap,
                  title: 'Lightning Fast',
                  description: 'Optimized performance means instant search, quick loading, and smooth interactions. No waiting.'
                }
              ].map((benefit, index) => (
                <div key={index} className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <benefit.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-xl">{benefit.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How we compare
            </h2>
            <p className="text-lg text-muted-foreground">
              See what makes EaseMail different from traditional email clients.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4 px-4 font-semibold">Feature</th>
                  <th className="text-center py-4 px-4 font-semibold">EaseMail</th>
                  <th className="text-center py-4 px-4 font-semibold text-muted-foreground">Others</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'AI Email Writing', easemail: true, others: false },
                  { feature: 'Voice Dictation with AI Polish', easemail: true, others: false },
                  { feature: 'Smart Email Remix', easemail: true, others: false },
                  { feature: 'Multi-Account Inbox', easemail: true, others: true },
                  { feature: 'Custom Automation Rules', easemail: true, others: 'Limited' },
                  { feature: 'SMS Integration', easemail: true, others: false },
                  { feature: 'Rich Text Editor', easemail: true, others: true },
                  { feature: 'Transparent Pricing', easemail: true, others: 'Limited' },
                ].map((row, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-4 px-4">{row.feature}</td>
                    <td className="text-center py-4 px-4">
                      {typeof row.easemail === 'boolean' ? (
                        row.easemail ? (
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )
                      ) : (
                        <span className="text-sm">{row.easemail}</span>
                      )}
                    </td>
                    <td className="text-center py-4 px-4">
                      {typeof row.others === 'boolean' ? (
                        row.others ? (
                          <Check className="h-5 w-5 text-muted-foreground mx-auto" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )
                      ) : (
                        <span className="text-sm text-muted-foreground">{row.others}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="text-3xl md:text-5xl font-bold">
              Ready to transform your inbox?
            </h2>
            <p className="text-xl text-white/90">
              Join professionals who've already made the switch to smarter email management.
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
        </div>
      </section>
    </div>
  );
}

