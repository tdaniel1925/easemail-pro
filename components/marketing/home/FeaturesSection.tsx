/**
 * Features Section - Homepage
 * Showcase key EaseMail features with icons
 */

'use client';

import Link from 'next/link';

export default function FeaturesSection() {
  const features = [
    {
      icon: '🤖',
      title: 'AI-Powered Assistance',
      description: 'Smart compose, instant summaries, and intelligent replies powered by advanced AI technology.',
      link: '/ai-features'
    },
    {
      icon: '📊',
      title: 'Unified Inbox',
      description: 'Manage multiple email accounts in one beautiful, organized interface. Gmail, Outlook, and more.',
      link: '/features'
    },
    {
      icon: '⚡',
      title: 'Lightning Fast',
      description: 'Optimized performance with instant search, quick actions, and seamless navigation.',
      link: '/features'
    },
    {
      icon: '🔒',
      title: 'Enterprise Security',
      description: 'Bank-level encryption, SOC 2 compliance, and privacy-first architecture.',
      link: '/ai-security'
    },
    {
      icon: '🎯',
      title: 'Smart Threading',
      description: 'Intelligent conversation grouping across accounts with context-aware organization.',
      link: '/features'
    },
    {
      icon: '🎤',
      title: 'Voice Dictation',
      description: 'Compose emails naturally with AI-powered voice-to-text technology.',
      link: '/ai-features'
    }
  ];

  return (
    <section className="uxora-section-padding">
      <div className="container">
        <div className="row justify-content-center mb-5">
          <div className="col-12 col-lg-8 text-center">
            <h2 className="mb-3 wow fadeInUp">
              Everything You Need in One Platform
            </h2>
            <p className="lead text-muted wow fadeInUp" data-wow-delay="100ms">
              Powerful features designed to make email management effortless and productive.
            </p>
          </div>
        </div>

        <div className="row g-4">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="col-12 col-md-6 col-lg-4 wow fadeInUp" 
              data-wow-delay={`${index * 100}ms`}
            >
              <div className="card h-100 border-0 shadow-sm hover-lift">
                <div className="card-body p-4">
                  <div className="d-flex align-items-start mb-3">
                    <div className="feature-icon me-3" style={{fontSize: '2.5rem'}}>
                      {feature.icon}
                    </div>
                    <div>
                      <h5 className="card-title mb-2">{feature.title}</h5>
                      <p className="card-text text-muted mb-3">{feature.description}</p>
                      <Link href={feature.link} className="text-primary text-decoration-none">
                        Learn more →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="row mt-5 justify-content-center">
          <div className="col-auto">
            <Link href="/features" className="btn btn-primary btn-lg">
              <span>EXPLORE ALL FEATURES</span>
              <span>EXPLORE ALL FEATURES</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

