/**
 * Testimonials Section - Social proof and customer reviews
 */

'use client';

import { Card } from '@/components/ui/card';
import { Quote, Star } from 'lucide-react';

export default function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Marketing Director',
      company: 'TechCorp Inc.',
      content: 'EaseMail has completely transformed how our team handles email. The AI summaries alone save us 2+ hours every day. Best investment we\'ve made this year!',
      avatar: '👩‍💼',
      rating: 5,
    },
    {
      name: 'Michael Chen',
      role: 'Founder & CEO',
      company: 'StartupXYZ',
      content: 'Managing multiple client email accounts used to be a nightmare. EaseMail makes it effortless with their unified inbox. The smart threading is a game-changer.',
      avatar: '👨‍💻',
      rating: 5,
    },
    {
      name: 'Emily Rodriguez',
      role: 'Executive Assistant',
      company: 'Global Enterprises',
      content: 'The voice dictation and AI compose features have revolutionized my workflow. I can now handle emails while on the move. Absolutely love it!',
      avatar: '👩‍💼',
      rating: 5,
    },
    {
      name: 'David Park',
      role: 'Sales Manager',
      company: 'SalesPro Solutions',
      content: 'Finally, an email client that understands productivity. The AI-powered follow-up reminders ensure I never miss important conversations.',
      avatar: '👨‍💼',
      rating: 5,
    },
    {
      name: 'Lisa Thompson',
      role: 'Product Manager',
      company: 'InnovateTech',
      content: 'The search functionality is incredible. I can find any email instantly, even from years ago. The filters and organization features are top-notch.',
      avatar: '👩‍💼',
      rating: 5,
    },
    {
      name: 'James Wilson',
      role: 'Consultant',
      company: 'Wilson Consulting',
      content: 'Security was my main concern, but EaseMail exceeded my expectations. SOC 2 certified with bank-level encryption. Plus, the interface is beautiful!',
      avatar: '👨‍💼',
      rating: 5,
    },
  ];

  return (
    <section className="py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Trusted by Thousands of Professionals
          </h2>
          <p className="text-lg text-muted-foreground">
            See what our customers have to say about EaseMail
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
              {/* Quote Icon */}
              <Quote className="h-8 w-8 text-primary/20 mb-4" />

              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>

              {/* Content */}
              <p className="text-sm text-muted-foreground mb-6">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="text-3xl">{testimonial.avatar}</div>
                <div>
                  <div className="font-semibold text-sm">{testimonial.name}</div>
                  <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                  <div className="text-xs text-muted-foreground">{testimonial.company}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="mt-16 border-t pt-12">
          <p className="text-center text-sm text-muted-foreground mb-6">
            Trusted by leading companies worldwide
          </p>
          <div className="flex flex-wrap justify-center gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="text-3xl font-bold text-primary">50,000+</div>
              <div className="text-sm text-muted-foreground">Active Users</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-3xl font-bold text-primary">10M+</div>
              <div className="text-sm text-muted-foreground">Emails Processed</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-3xl font-bold text-primary">4.9/5</div>
              <div className="text-sm text-muted-foreground">Average Rating</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-3xl font-bold text-primary">99.9%</div>
              <div className="text-sm text-muted-foreground">Uptime SLA</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

