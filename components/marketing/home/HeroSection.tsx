/**
 * Hero Section - Homepage
 * Modern hero with animated headline and CTA buttons
 */

'use client';

import Link from 'next/link';

export default function HeroSection() {
  return (
    <section className="hero-wrapper">
      <div className="divider"></div>

      <div className="container">
        <div className="row">
          <div className="col-12">
            <div className="hero-content">
              <h2 
                className="mb-0 wow fadeInUp" 
                data-wow-duration="1000ms" 
                data-wow-delay="500ms"
              >
                Email Management,
              </h2>
              <h2 
                className="mb-0 d-md-flex align-items-center wow fadeInUp" 
                data-wow-duration="1000ms"
                data-wow-delay="800ms"
              >
                Reimagined with AI
                <span 
                  className="hero-subtitle mt-3 wow fadeInUp" 
                  data-wow-duration="1000ms" 
                  data-wow-delay="1000ms"
                >
                  Transform your inbox into a productivity powerhouse with intelligent AI assistance, 
                  unified accounts, and powerful automation. EaseMail brings the future of email to you today.
                </span>
              </h2>
            </div>
          </div>
        </div>
      </div>

      <div className="divider"></div>
    </section>
  );
}

