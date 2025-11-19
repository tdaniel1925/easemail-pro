/**
 * EaseMail Marketing Homepage
 * Modern, Vorix-styled landing page
 */

import HeroSection from '@/components/marketing/home/HeroSection';
import FeaturesSection from '@/components/marketing/home/FeaturesSection';
import TestimonialsSection from '@/components/marketing/home/TestimonialsSection';
import CTASection from '@/components/marketing/home/CTASection';

export const metadata = {
  title: 'EaseMail - AI-Powered Email Management',
  description: 'Transform your inbox into a productivity powerhouse with intelligent AI assistance, unified accounts, and powerful automation.',
  keywords: ['email management', 'AI email', 'productivity', 'unified inbox', 'smart email'],
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <TestimonialsSection />
      <CTASection />
    </>
  );
}
