/**
 * Hero Section - 2026 Modern Design
 * Inspired by Stripe's flowing gradients + Linear's minimalism
 */

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Shield, Zap, PlayCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';

export default function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Stripe-style flowing gradient animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let animationId: number;
    let time = 0;

    const animate = () => {
      time += 0.005;

      // Create flowing gradient
      const gradient1 = ctx.createRadialGradient(
        canvas.width / 2 + Math.sin(time) * 200,
        canvas.height / 2 + Math.cos(time) * 200,
        0,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width / 2
      );

      gradient1.addColorStop(0, 'rgba(59, 130, 246, 0.3)'); // primary blue
      gradient1.addColorStop(0.5, 'rgba(147, 51, 234, 0.2)'); // purple
      gradient1.addColorStop(1, 'rgba(59, 130, 246, 0.1)');

      const gradient2 = ctx.createRadialGradient(
        canvas.width / 2 + Math.cos(time * 1.2) * 250,
        canvas.height / 2 + Math.sin(time * 1.2) * 250,
        0,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width / 2
      );

      gradient2.addColorStop(0, 'rgba(236, 72, 153, 0.2)'); // pink
      gradient2.addColorStop(0.5, 'rgba(251, 146, 60, 0.15)'); // orange
      gradient2.addColorStop(1, 'rgba(59, 130, 246, 0.05)');

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = gradient1;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = gradient2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <section className="relative overflow-hidden py-20 sm:py-32 lg:py-40">
      {/* Animated gradient background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full opacity-60 dark:opacity-40"
        style={{ filter: 'blur(80px)' }}
      />

      {/* Grid overlay for depth */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05]" />

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          {/* Floating badge with animation */}
          <div className="mb-8 inline-flex items-center rounded-full border border-primary/20 bg-primary/5 backdrop-blur-sm px-4 py-1.5 text-sm animate-in fade-in slide-in-from-bottom-3 duration-700">
            <Sparkles className="mr-2 h-4 w-4 text-primary animate-pulse" />
            <span className="font-medium">Powered by Advanced AI • Save 5+ hours every week</span>
          </div>

          {/* Headline with gradient */}
          <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl xl:text-8xl animate-in fade-in slide-in-from-bottom-4 duration-1000">
            Email Management,{' '}
            <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent animate-gradient">
              Reimagined
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mb-10 text-lg text-muted-foreground sm:text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-150">
            Transform your inbox into a productivity powerhouse with intelligent AI assistance,
            unified multi-account management, and powerful automation.
          </p>

          {/* CTAs with hover effects */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300">
            <Link href="/signup">
              <Button size="lg" className="text-base px-8 py-6 h-auto group shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/features">
              <Button size="lg" variant="outline" className="text-base px-8 py-6 h-auto group hover:bg-primary/5 transition-all duration-300">
                <PlayCircle className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                Watch Demo
              </Button>
            </Link>
          </div>

          {/* Trust indicators with icons */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground mb-16 animate-in fade-in duration-1000 delay-500">
            <div className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium">SOC 2 Certified</span>
            </div>
            <div className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium">99.9% Uptime</span>
            </div>
            <div className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium">AI-Powered</span>
            </div>
          </div>
        </div>

        {/* Hero Image - Modern 3D mockup style */}
        <div className="mt-16 mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-700">
          <div className="relative">
            {/* Glow effect behind mockup */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 blur-3xl opacity-50 transform -translate-y-8" />

            {/* Mockup container */}
            <div className="relative rounded-2xl border border-border/50 bg-background/80 backdrop-blur-xl p-2 sm:p-4 shadow-2xl hover:shadow-3xl transition-shadow duration-500 group">
              <div className="rounded-xl overflow-hidden bg-gradient-to-br from-muted/50 to-muted">
                {/* Placeholder for product screenshot */}
                <div className="aspect-video w-full bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 flex items-center justify-center">
                  <div className="text-center space-y-4 p-8">
                    <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-500">
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

              {/* Floating elements for depth */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-primary to-purple-500 rounded-2xl opacity-20 blur-2xl animate-pulse" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-pink-500 to-orange-500 rounded-2xl opacity-20 blur-2xl animate-pulse delay-1000" />
            </div>
          </div>
        </div>

        {/* Social proof bar */}
        <div className="mt-20 flex flex-col items-center gap-6 animate-in fade-in duration-1000 delay-1000">
          <p className="text-sm text-muted-foreground font-medium">
            Trusted by professionals at leading companies
          </p>
          <div className="flex items-center gap-8 flex-wrap justify-center opacity-60">
            {/* Placeholder for company logos */}
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

        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 8s ease infinite;
        }
      `}</style>
    </section>
  );
}
