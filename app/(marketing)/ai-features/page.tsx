'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Brain,
  Mic,
  Sparkles,
  Wand2,
  Languages,
  Target,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowRight,
  Lightbulb,
  MessageSquare,
  FileText,
  Zap,
  Mail,
  Shield
} from 'lucide-react';

export default function AIFeaturesPage() {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-background">
        <div className="container mx-auto px-6 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 mb-4">
              <Sparkles className="h-5 w-5" />
              <span className="font-semibold">Powered by Advanced AI</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              AI That Works
              <br />
              <span className="text-primary">For You</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              Our AI doesn't just assist—it understands context, learns your style, and helps you communicate better, faster, and more effectively.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/signup">
                <Button size="lg" className="text-lg px-8 gap-2">
                  Try AI Features Free
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/ai-security">
                <Button size="lg" variant="outline" className="text-lg px-8 gap-2">
                  <Shield className="h-5 w-5" />
                  AI Security & Privacy
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* AI Writing Assistant */}
      <section className="container mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Brain className="h-5 w-5" />
              <span className="font-semibold">AI Writing Assistant</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold">
              From Thought to Perfect Email in Seconds
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Simply describe what you want to say, and our AI crafts a professional, contextually appropriate email. No more staring at blank screens or struggling with word choice.
            </p>
            <div className="space-y-4">
              {[
                {
                  title: 'Context-Aware Generation',
                  desc: 'AI understands your email thread history and relationship with the recipient'
                },
                {
                  title: 'Tone Matching',
                  desc: 'Professional, casual, friendly, or formal—AI adapts to your needs'
                },
                {
                  title: 'Smart Suggestions',
                  desc: 'Get real-time improvements for clarity, grammar, and impact'
                },
                {
                  title: 'Multi-Language Support',
                  desc: 'Write professionally in 50+ languages with native-level quality'
                }
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">{feature.title}</p>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Card className="p-8 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-blue-200 dark:border-blue-800">
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border-2 border-dashed border-gray-300 dark:border-gray-700">
                <p className="text-sm text-muted-foreground mb-4">You type:</p>
                <p className="text-sm italic">"Tell client the project will be delayed by 2 weeks"</p>
              </div>
              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-lg">
                <p className="text-sm text-muted-foreground mb-4">AI generates:</p>
                <div className="text-sm space-y-3">
                  <p className="font-semibold">Subject: Update on Project Timeline</p>
                  <p>Dear [Client Name],</p>
                  <p>I wanted to reach out regarding our current project timeline. After careful assessment of our progress and some unforeseen complexities, I need to inform you that we'll require an additional two weeks to ensure we deliver the quality you expect.</p>
                  <p>I understand this may impact your schedule, and I sincerely apologize for any inconvenience. I'm committed to keeping you updated on our progress every step of the way.</p>
                  <p>Best regards,<br/>[Your Name]</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Voice to Email */}
      <section className="bg-muted/50 py-20">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <Card className="p-8 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800 lg:order-first">
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center">
                    <Mic className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Voice Dictation</h3>
                    <p className="text-sm text-muted-foreground">Speak naturally, email professionally</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                      <p className="text-xs font-semibold text-muted-foreground">RECORDING</p>
                    </div>
                    <p className="text-sm italic text-muted-foreground">
                      "Hey, um, I wanted to let them know that the meeting's been moved to Thursday at 3... oh and remind them to bring the quarterly reports"
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <Wand2 className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-lg border-2 border-green-600">
                    <p className="text-xs font-semibold text-green-600 mb-2">AI ENHANCED</p>
                    <p className="text-sm">
                      Hi Team,<br/><br/>
                      I wanted to update you that our meeting has been rescheduled to Thursday at 3:00 PM. Please remember to bring your quarterly reports to the meeting.<br/><br/>
                      Looking forward to seeing everyone then!
                    </p>
                  </div>
                </div>
              </div>
            </Card>
            <div className="space-y-6 lg:order-last">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                <Mic className="h-5 w-5" />
                <span className="font-semibold">Voice to Professional Email</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">
                Speak Casually, Send Professionally
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Talk naturally and watch your thoughts transform into polished, professional emails. Perfect for when you're on the go or just prefer speaking to typing.
              </p>
              <div className="space-y-4">
                {[
                  {
                    title: 'Natural Language Processing',
                    desc: 'Speak naturally with ums, ahs, and informal language—AI cleans it up'
                  },
                  {
                    title: 'Automatic Structuring',
                    desc: 'AI organizes your thoughts into clear paragraphs and sections'
                  },
                  {
                    title: 'Smart Punctuation',
                    desc: 'Proper grammar and punctuation added automatically'
                  },
                  {
                    title: 'Professional Polish',
                    desc: 'Option to enhance to executive-level communication'
                  }
                ].map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">{feature.title}</p>
                      <p className="text-sm text-muted-foreground">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Smart Remix */}
      <section className="container mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              <Wand2 className="h-5 w-5" />
              <span className="font-semibold">Smart Remix</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold">
              Instantly Adapt Any Email
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Already have an email but need to adjust the tone or length? One click transforms your message to match any situation perfectly.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Target, title: 'Make Professional', desc: 'Business-appropriate' },
                { icon: MessageSquare, title: 'Make Casual', desc: 'Friendly & relaxed' },
                { icon: Zap, title: 'Make Shorter', desc: 'Concise & direct' },
                { icon: FileText, title: 'Make Longer', desc: 'Detailed & thorough' },
                { icon: Lightbulb, title: 'Simplify', desc: 'Easy to understand' },
                { icon: TrendingUp, title: 'Make Persuasive', desc: 'More convincing' }
              ].map((option, index) => (
                <Card key={index} className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <option.icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{option.title}</p>
                      <p className="text-xs text-muted-foreground">{option.desc}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
          <Card className="p-8 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-purple-200 dark:border-purple-800">
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">ORIGINAL</p>
                <div className="bg-white dark:bg-gray-900 rounded-lg p-4 text-sm">
                  Hey! Just wanted to let you know the report's gonna be late. Had some issues with the data. Should be done tomorrow.
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-purple-600 mb-2">PROFESSIONAL</p>
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-3 text-xs border-2 border-purple-600">
                    Dear Team,<br/><br/>
                    I wanted to inform you that the quarterly report will be delivered tomorrow instead of today due to data validation challenges we encountered.<br/><br/>
                    Thank you for your understanding.
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-blue-600 mb-2">SHORTER</p>
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-3 text-xs border-2 border-blue-600">
                    Report delayed to tomorrow due to data issues. Apologies for the inconvenience.
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* AI Features Grid */}
      <section className="bg-muted/50 py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              More AI-Powered Features
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive AI assistance for every aspect of email management
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Languages,
                title: 'Auto-Translation',
                description: 'Communicate globally with real-time email translation in 50+ languages. AI maintains tone and context across language barriers.'
              },
              {
                icon: Target,
                title: 'Smart Categorization',
                description: 'AI automatically categorizes and prioritizes incoming emails, learning from your behavior to improve accuracy over time.'
              },
              {
                icon: Lightbulb,
                title: 'Smart Replies',
                description: 'Get AI-suggested quick replies based on email content and your communication patterns. Respond faster without sacrificing quality.'
              },
              {
                icon: Clock,
                title: 'Send Time Optimization',
                description: 'AI analyzes recipient behavior to suggest the best time to send your email for maximum engagement and response rates.'
              },
              {
                icon: FileText,
                title: 'Summary Generation',
                description: 'Long email threads? AI creates concise summaries highlighting key points, decisions, and action items.'
              },
              {
                icon: Brain,
                title: 'Context Understanding',
                description: 'AI understands email thread context, relationships, and history to provide relevant suggestions and automation.'
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
        </div>
      </section>

      {/* Privacy & Control */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mb-4">
              <Shield className="h-5 w-5" />
              <span className="font-semibold">Your Data, Your Control</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              AI That Respects Your Privacy
            </h2>
            <p className="text-lg text-muted-foreground">
              Our AI features are designed with privacy and security at the core. You maintain complete control over your data.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: 'Zero Data Retention',
                description: 'AI processing happens in real-time. We don\'t store your email content for AI training.'
              },
              {
                title: 'End-to-End Encryption',
                description: 'Your emails are encrypted in transit and at rest. AI processes encrypted data securely.'
              },
              {
                title: 'Opt-In Features',
                description: 'Every AI feature is optional. Choose exactly which AI capabilities you want to use.'
              },
              {
                title: 'GDPR & CCPA Compliant',
                description: 'Full compliance with international privacy regulations and data protection laws.'
              }
            ].map((item, index) => (
              <div key={index} className="flex items-start gap-4 p-6 rounded-lg border bg-card">
                <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/ai-security">
              <Button variant="outline" size="lg" className="gap-2">
                Learn More About AI Security
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="text-3xl md:text-5xl font-bold">
              Experience the Future of Email
            </h2>
            <p className="text-xl text-white/90">
              Join thousands of professionals using AI to communicate better and work smarter.
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
