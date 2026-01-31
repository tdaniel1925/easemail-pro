/**
 * Hero Section - 2026 Clean Modern Design
 * Simple, professional, no gradients
 */

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Shield, Zap, PlayCircle } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="relative py-16 sm:py-24 lg:py-32">
      {/* Simple grid overlay for depth */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05]" />

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          {/* Floating badge */}
          <div className="mb-6 inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm">
            <Sparkles className="mr-2 h-4 w-4 text-primary" />
            <span className="font-medium">Powered by Advanced AI • Save 5+ hours every week</span>
          </div>

          {/* Headline */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
            Email Management,{' '}
            <span className="text-primary">
              Reimagined
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mb-8 text-base text-muted-foreground sm:text-lg lg:text-xl max-w-3xl mx-auto leading-relaxed">
            Transform your inbox into a productivity powerhouse with intelligent AI assistance,
            unified multi-account management, and powerful automation.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link href="/signup">
              <Button size="lg" className="text-base px-8 py-6 h-auto group shadow-lg hover:shadow-xl transition-all">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/features">
              <Button size="lg" variant="outline" className="text-base px-8 py-6 h-auto group">
                <PlayCircle className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-sm text-muted-foreground mb-12">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium">SOC 2 Certified</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium">99.9% Uptime</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium">AI-Powered</span>
            </div>
          </div>
        </div>

        {/* Hero Image */}
        <div className="mt-12 mx-auto max-w-7xl">
          <div className="relative">
            {/* Mockup container */}
            <div className="relative rounded-2xl border border-border bg-background/80 backdrop-blur-xl p-2 sm:p-4 shadow-2xl">
              <div className="rounded-xl overflow-hidden bg-muted/50">
                {/* Placeholder for product screenshot */}
                <div className="aspect-video w-full bg-muted flex items-center justify-center">
                  <div className="text-center space-y-4 p-8">
                    <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                      <Sparkles className="h-10 w-10 text-primary" />
                    </div>
                    <p className="text-muted-foreground text-sm max-w-md">
                      Beautiful product mockup will go here
                      <br />
                      <span className="text-xs">(Desktop + Mobile unified inbox view)</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Social proof bar */}
        <div className="mt-16 flex flex-col items-center gap-6">
          <p className="text-sm text-muted-foreground font-medium">
            Trusted by professionals at leading companies
          </p>
          <div className="flex items-center gap-6 sm:gap-8 flex-wrap justify-center opacity-60">
            {['Company A', 'Company B', 'Company C', 'Company D', 'Company E'].map((company, i) => (
              <div key={i} className="px-6 py-3 rounded-lg bg-muted/50 text-muted-foreground text-sm font-semibold hover:bg-muted transition-colors">
                {company}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .bg-grid-pattern {
          background-image:
            linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px);
          background-size: 80px 80px;
        }
      `}</style>
    </section>
  );
}
