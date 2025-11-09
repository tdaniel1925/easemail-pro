'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Briefcase,
  Users,
  Building2,
  GraduationCap,
  HeartHandshake,
  TrendingUp,
  Mail,
  Clock,
  Target,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Zap,
  Shield
} from 'lucide-react';

export default function UseCasesPage() {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        <div className="container mx-auto px-6 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Built for Every Professional
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              From solo entrepreneurs to enterprise teams, discover how EaseMail transforms email management across industries.
            </p>
          </div>
        </div>
      </section>

      {/* Main Use Cases */}
      <section className="container mx-auto px-6 py-20">
        <div className="space-y-32">
          {/* Sales & Business Development */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
                <Briefcase className="h-5 w-5" />
                <span className="font-semibold">Sales & Business Development</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">
                Close More Deals, Faster
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                AI-powered email composition helps you craft perfect outreach messages, follow-ups, and proposals in seconds. Track conversations, manage multiple prospects, and never miss a follow-up opportunity.
              </p>
              <div className="space-y-4">
                {[
                  'AI-generated personalized outreach emails',
                  'Automatic follow-up reminders and templates',
                  'Multi-account management for different campaigns',
                  'Contact timeline to track every interaction',
                  'SMS integration for urgent client communications'
                ].map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>
              <Link href="/signup">
                <Button size="lg" className="gap-2 mt-5">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <Card className="p-8 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-2xl">3.5x</p>
                    <p className="text-sm text-muted-foreground">Response rate increase</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-2xl">12 hours</p>
                    <p className="text-sm text-muted-foreground">Saved per week on email</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-2xl">85%</p>
                    <p className="text-sm text-muted-foreground">Email accuracy improvement</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Customer Support Teams */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <Card className="p-8 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 border-purple-200 dark:border-purple-800 lg:order-first">
              <div className="space-y-6">
                <h3 className="text-xl font-semibold mb-4">Sample Support Workflow</h3>
                <div className="space-y-4">
                  {[
                    { step: '1', text: 'Customer email arrives in unified inbox', icon: Mail },
                    { step: '2', text: 'AI analyzes sentiment and urgency', icon: Sparkles },
                    { step: '3', text: 'Auto-categorize and route to right team member', icon: Users },
                    { step: '4', text: 'Generate response with AI assistance', icon: Zap },
                    { step: '5', text: 'Track resolution in contact timeline', icon: CheckCircle2 }
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                        {item.step}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <item.icon className="h-4 w-4 text-purple-600" />
                          <p className="text-sm">{item.text}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
            <div className="space-y-6 lg:order-last">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                <HeartHandshake className="h-5 w-5" />
                <span className="font-semibold">Customer Support</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">
                Deliver Exceptional Support at Scale
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Handle customer inquiries faster with AI-powered responses, smart categorization, and team collaboration tools. Maintain context across all customer touchpoints.
              </p>
              <div className="space-y-4">
                {[
                  'AI-suggested responses based on ticket history',
                  'Automatic email routing and prioritization',
                  'Shared team inbox with assignment capabilities',
                  'Template library for common responses',
                  'Customer interaction history at a glance'
                ].map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>
              <Link href="/signup">
                <Button size="lg" className="gap-2 mt-5">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Small Business Owners */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                <Building2 className="h-5 w-5" />
                <span className="font-semibold">Small Business</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">
                Run Your Business, Not Your Inbox
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Manage customer communications, vendor relationships, and team coordination from one powerful platform. Save time with automation while maintaining that personal touch.
              </p>
              <div className="space-y-4">
                {[
                  'Manage multiple business email accounts in one place',
                  'Professional email templates for common scenarios',
                  'Calendar integration for meetings and appointments',
                  'Contact management with notes and history',
                  'Mobile-friendly for on-the-go business management'
                ].map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>
              <Link href="/signup">
                <Button size="lg" className="gap-2 mt-5">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <Card className="p-8 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 border-green-200 dark:border-green-800">
              <div className="space-y-6">
                <h3 className="text-xl font-semibold">Perfect for:</h3>
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { title: 'Consultants', desc: 'Manage client communications professionally' },
                    { title: 'Freelancers', desc: 'Juggle multiple projects and clients' },
                    { title: 'Agency Owners', desc: 'Coordinate team and client emails' },
                    { title: 'E-commerce', desc: 'Handle customer orders and inquiries' },
                    { title: 'Service Providers', desc: 'Schedule appointments and follow-ups' }
                  ].map((role, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-white/50 dark:bg-black/20">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm">{role.title}</p>
                        <p className="text-xs text-muted-foreground">{role.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Enterprise Teams */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <Card className="p-8 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30 border-orange-200 dark:border-orange-800">
              <div className="space-y-6">
                <h3 className="text-xl font-semibold mb-4">Enterprise Features</h3>
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { icon: Shield, title: 'Advanced Security', desc: 'SSO, 2FA, audit logs' },
                    { icon: Users, title: 'Team Management', desc: 'Role-based permissions' },
                    { icon: Zap, title: 'API Access', desc: 'Custom integrations' },
                    { icon: TrendingUp, title: 'Analytics', desc: 'Team performance insights' },
                    { icon: HeartHandshake, title: 'Priority Support', desc: 'Dedicated success manager' },
                    { icon: Building2, title: 'Custom Deployment', desc: 'On-premise options' }
                  ].map((feature, index) => (
                    <div key={index} className="flex items-start gap-4 p-3 rounded-lg bg-white/50 dark:bg-black/20">
                      <div className="w-10 h-10 rounded-lg bg-orange-600 flex items-center justify-center flex-shrink-0">
                        <feature.icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{feature.title}</p>
                        <p className="text-xs text-muted-foreground">{feature.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                <Building2 className="h-5 w-5" />
                <span className="font-semibold">Enterprise</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">
                Enterprise-Grade Email for Growing Teams
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Scale your email operations with advanced security, team collaboration, and administrative controls. Perfect for organizations with compliance requirements and complex workflows.
              </p>
              <div className="space-y-4">
                {[
                  'Centralized billing and user management',
                  'Advanced security and compliance features',
                  'Custom integrations via API',
                  'Dedicated support and onboarding',
                  'Usage analytics and reporting'
                ].map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="gap-2">
                  View Enterprise Pricing
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Education */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <GraduationCap className="h-5 w-5" />
                <span className="font-semibold">Education</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">
                Streamline Academic Communication
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Help educators manage student communications, parent outreach, and administrative emails efficiently. Special pricing for educational institutions.
              </p>
              <div className="space-y-4">
                {[
                  'Separate accounts for professional and personal email',
                  'Template library for common student/parent communications',
                  'Calendar integration for class schedules',
                  'Secure communication with privacy controls',
                  'Special educational institution pricing'
                ].map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>
              <Link href="/signup">
                <Button size="lg" className="gap-2">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <Card className="p-8 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/30 dark:to-indigo-900/30 border-indigo-200 dark:border-indigo-800">
              <div className="space-y-6">
                <h3 className="text-xl font-semibold">Ideal for:</h3>
                <div className="space-y-4">
                  {[
                    { title: 'Teachers & Professors', icon: GraduationCap },
                    { title: 'School Administrators', icon: Building2 },
                    { title: 'Academic Researchers', icon: Briefcase },
                    { title: 'Student Organizations', icon: Users }
                  ].map((group, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 rounded-lg bg-white/50 dark:bg-black/20">
                      <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                        <group.icon className="h-6 w-6 text-white" />
                      </div>
                      <p className="font-semibold">{group.title}</p>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t border-indigo-200 dark:border-indigo-800">
                  <p className="text-sm text-muted-foreground">
                    Special educational discounts available. Contact us for institution-wide licensing.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="text-3xl md:text-5xl font-bold">
              Ready to transform how you work?
            </h2>
            <p className="text-xl text-white/90">
              Join thousands of professionals who've made the switch to smarter email management.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" variant="secondary" className="text-lg px-8 mt-5">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="text-lg px-8 bg-white/10 border-white/20 hover:bg-white/20 text-white mt-5">
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
