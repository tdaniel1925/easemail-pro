/**
 * Features Showcase - Highlighting key features with visuals
 */

'use client';

import { Card } from '@/components/ui/card';
import { 
  Brain, 
  Mail, 
  Zap, 
  Shield, 
  Users, 
  MessageSquare,
  Sparkles,
  Clock,
  FolderTree
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function FeaturesShowcase() {
  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Smart Compose',
      description: 'Write emails faster with AI suggestions that match your writing style. Get intelligent replies with one click.',
      color: 'text-blue-500',
      image: '/assets/marketing/smart-compose.png',
    },
    {
      icon: Sparkles,
      title: 'Instant AI Summaries',
      description: 'Get the gist of long email threads instantly. AI extracts key points so you stay informed without reading everything.',
      color: 'text-purple-500',
      image: '/assets/marketing/ai-assistant-feature.png',
    },
    {
      icon: Mail,
      title: 'Unified Multi-Account Inbox',
      description: 'Manage Gmail, Outlook, and more in one beautiful interface. Switch between accounts seamlessly.',
      color: 'text-green-500',
      image: '/assets/marketing/email-organization.png',
    },
    {
      icon: MessageSquare,
      title: 'Smart Threading',
      description: 'Intelligent conversation grouping across all your accounts with context-aware organization.',
      color: 'text-orange-500',
      image: '/assets/marketing/threading-visualization.png',
    },
    {
      icon: Zap,
      title: 'Lightning Fast Search',
      description: 'Find any email instantly with powerful search that understands context and intent.',
      color: 'text-yellow-500',
      image: '/assets/marketing/productivity-dashboard.png',
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Bank-level encryption, SOC 2 compliance, and privacy-first architecture protect your data.',
      color: 'text-red-500',
      image: '/assets/marketing/email-organization.png',
    },
    {
      icon: Clock,
      title: 'Smart Scheduling',
      description: 'Send emails at the perfect time with AI-powered send later and follow-up reminders.',
      color: 'text-indigo-500',
      image: '/assets/marketing/productivity-dashboard.png',
    },
    {
      icon: FolderTree,
      title: 'Advanced Organization',
      description: 'Folders, labels, filters, and rules that work across all your accounts automatically.',
      color: 'text-pink-500',
      image: '/assets/marketing/email-organization.png',
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Shared inboxes, delegated access, and team features for organizations of any size.',
      color: 'text-teal-500',
      image: '/assets/marketing/team-collaboration.png',
    },
  ];

  return (
    <section className="py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Everything You Need in One Platform
          </h2>
          <p className="text-lg text-muted-foreground">
            Powerful features designed to transform how you handle email, powered by cutting-edge AI technology.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => (
            <Card key={index} className="p-6 hover:shadow-lg transition-shadow overflow-hidden group">
              {/* Image */}
              <div className="mb-4 rounded-lg overflow-hidden bg-muted/50 -mx-6 -mt-6">
                <img 
                  src={feature.image} 
                  alt={feature.title}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              
              {/* Icon and content */}
              <div className="pt-2">
                <feature.icon className={`h-10 w-10 ${feature.color} mb-4`} />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link href="/features">
            <Button size="lg" variant="outline">
              Explore All Features
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

