/**
 * CTA Section - Homepage
 * Call-to-action to encourage signups
 */

'use client';

import Link from 'next/link';

export default function CTASection() {
  return (
    <section className="uxora-section-padding bg-light">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-10">
            <div className="card border-0 shadow-lg" style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white'
            }}>
              <div className="card-body p-5 text-center">
                <h2 className="display-4 mb-4 wow fadeInUp">
                  Ready to Transform Your Email Experience?
                </h2>
                <p className="lead mb-5 opacity-90 wow fadeInUp" data-wow-delay="100ms">
                  Join thousands of professionals who've already upgraded to EaseMail. 
                  Start your free trial today—no credit card required.
                </p>
                <div className="d-flex gap-3 justify-content-center flex-wrap wow fadeInUp" data-wow-delay="200ms">
                  <Link href="/signup" className="btn btn-light btn-lg px-5">
                    Start Free Trial
                  </Link>
                  <Link href="/pricing" className="btn btn-outline-light btn-lg px-5">
                    View Pricing
                  </Link>
                </div>
                <p className="mt-4 mb-0 small opacity-75">
                  ✓ 14-day free trial &nbsp;&nbsp; ✓ No credit card required &nbsp;&nbsp; ✓ Cancel anytime
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

