/**
 * Testimonials Section - Homepage
 * Customer testimonials and social proof
 */

'use client';

export default function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Marketing Director',
      company: 'TechCorp',
      image: '👩‍💼',
      quote: 'EaseMail has transformed how our team handles email. The AI summaries alone save us hours every day.',
      rating: 5
    },
    {
      name: 'Michael Chen',
      role: 'Founder & CEO',
      company: 'StartupXYZ',
      image: '👨‍💻',
      quote: 'Managing multiple client accounts used to be a nightmare. EaseMail makes it effortless.',
      rating: 5
    },
    {
      name: 'Emily Rodriguez',
      role: 'Executive Assistant',
      company: 'Global Enterprises',
      image: '👩‍💼',
      quote: 'The voice dictation feature is a game-changer. I can compose emails while on the go.',
      rating: 5
    }
  ];

  return (
    <section className="uxora-section-padding bg-light">
      <div className="container">
        <div className="row justify-content-center mb-5">
          <div className="col-12 col-lg-8 text-center">
            <h2 className="mb-3 wow fadeInUp">
              Trusted by Thousands of Professionals
            </h2>
            <p className="lead text-muted wow fadeInUp" data-wow-delay="100ms">
              See what our customers have to say about EaseMail
            </p>
          </div>
        </div>

        <div className="row g-4">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index} 
              className="col-12 col-md-6 col-lg-4 wow fadeInUp" 
              data-wow-delay={`${index * 100}ms`}
            >
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body p-4">
                  {/* Rating Stars */}
                  <div className="mb-3">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <span key={i} className="text-warning">★</span>
                    ))}
                  </div>

                  {/* Quote */}
                  <p className="card-text mb-4 fst-italic">
                    "{testimonial.quote}"
                  </p>

                  {/* Author */}
                  <div className="d-flex align-items-center">
                    <div className="me-3" style={{fontSize: '2.5rem'}}>
                      {testimonial.image}
                    </div>
                    <div>
                      <h6 className="mb-0">{testimonial.name}</h6>
                      <small className="text-muted">{testimonial.role}</small><br/>
                      <small className="text-muted">{testimonial.company}</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="row mt-5 justify-content-center">
          <div className="col-12 text-center">
            <p className="text-muted mb-3">Trusted by leading companies worldwide</p>
            <div className="d-flex gap-4 justify-content-center align-items-center flex-wrap">
              <div className="badge bg-light text-dark p-3">🏢 500+ Companies</div>
              <div className="badge bg-light text-dark p-3">👥 50,000+ Users</div>
              <div className="badge bg-light text-dark p-3">⭐ 4.9/5 Rating</div>
              <div className="badge bg-light text-dark p-3">🔒 SOC 2 Certified</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

