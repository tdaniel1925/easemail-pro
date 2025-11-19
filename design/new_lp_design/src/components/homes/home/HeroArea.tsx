
import React from 'react';

const HeroArea = () => {
  return (
    <>
      <section className="hero-wrapper">
        <div className="divider"></div>

        <div className="container">
          <div className="row">
            <div className="col-12">
              <div className="hero-content">
                <h2 className="mb-0 wow fadeInUp" data-wow-duration="1000ms" data-wow-delay="500ms">Creative Digital</h2>
                <h2 className="mb-0 d-md-flex align-items-center wow fadeInUp" data-wow-duration="1000ms"
                  data-wow-delay="800ms">
                  Agency
                  <span className="hero-subtitle mt-3 wow fadeInUp" data-wow-duration="1000ms" data-wow-delay="1000ms">
                    Studio agencies excel in graphic design, design, branding,
                    and visual elements, offering comprehensive solutions for businesses' design
                    needs across graphic platforms.</span>
                </h2>
              </div>
            </div>
          </div>
        </div>

        <div className="divider"></div>
      </section>
    </>
  );
};

export default HeroArea;