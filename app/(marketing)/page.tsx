import HeroSection from '@/components/marketing/redesign/HeroSection';
import FeaturesShowcase from '@/components/marketing/redesign/FeaturesShowcase';
import HowItWorks from '@/components/marketing/redesign/HowItWorks';
import TestimonialsSection from '@/components/marketing/redesign/TestimonialsSection';
import CTASection from '@/components/marketing/redesign/CTASection';
import StatsSection from '@/components/marketing/redesign/StatsSection';

export const metadata = {
  title: 'EaseMail - AI-Powered Email Management Platform',
  description: 'Transform your inbox with intelligent AI assistance, unified multi-account management, and powerful automation. Join thousands of professionals who trust EaseMail.',
  keywords: ['email management', 'AI email assistant', 'productivity tool', 'unified inbox', 'email automation'],
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <StatsSection />
      <FeaturesShowcase />
      <HowItWorks />
      <TestimonialsSection />
      <CTASection />
    </>
  );
}
