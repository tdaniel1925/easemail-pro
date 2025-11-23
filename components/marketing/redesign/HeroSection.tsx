/**
 * Hero Section - Modern, clean design matching the dashboard
 */

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Shield, Zap } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-32">
      {/* Background with AI-generated image */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background">
        <div 
          className="absolute inset-0 opacity-30 bg-cover bg-center"
          style={{ backgroundImage: 'url(/assets/marketing/hero-background.png)' }}
        />
      </div>
      
      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center rounded-full border bg-muted px-4 py-1.5 text-sm">
            <Sparkles className="mr-2 h-4 w-4 text-primary" />
            <span>Powered by Advanced AI Technology</span>
          </div>

          {/* Headline */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Email Management,{' '}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Reimagined
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mb-8 text-lg text-muted-foreground sm:text-xl lg:text-2xl max-w-2xl mx-auto">
            Transform your inbox into a productivity powerhouse with intelligent AI assistance, 
            unified multi-account management, and powerful automation.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link href="/signup">
              <Button size="lg" className="text-base px-8">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/features">
              <Button size="lg" variant="outline" className="text-base px-8">
                Explore Features
              </Button>
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span>SOC 2 Certified</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <span>99.9% Uptime</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>AI-Powered</span>
            </div>
          </div>
        </div>

        {/* Hero Image - Product Mockup */}
        <div className="mt-16 mx-auto max-w-6xl">
          <div className="relative rounded-xl border bg-background/50 p-4 shadow-2xl backdrop-blur-sm">
            <div className="rounded-lg overflow-hidden">
              <img
                src="/assets/marketing/mobile-desktop-mockup.png"
                alt="EaseMail on Desktop and Mobile - Unified inbox with AI-powered features"
                className="w-full h-auto max-h-[600px] object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

