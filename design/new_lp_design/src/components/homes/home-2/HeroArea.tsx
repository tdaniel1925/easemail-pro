
import React from 'react';

const HeroArea = () => {
  return (
    <>
      <section className="hero-wrapper">
        <div className="divider"></div>

        <div className="container">
          <div className="row g-4">
            <div className="col-12 col-lg-8 col-xl-9">
              <div className="hero-content home2">
                <h2 className="mb-0 wow fadeInUp" data-wow-duration="1000ms" data-wow-delay="700ms">We're Design &
                  Development Agency</h2>
              </div>
            </div>

            <div className="col-12 col-md-8 col-lg-4 col-xl-3">
              <div className="hero-content home2">
                <div className="d-flex align-items-center gap-3 wow fadeInUp" data-wow-duration="1000ms"
                  data-wow-delay="900ms">
                  <div className="imgs-group">
                    <img src="/assets/img/bg-img/2.jpg" alt="" />
                    <img src="/assets/img/bg-img/3.jpg" alt="" />
                    <div><span className="counter">10</span>k</div>
                  </div>
                  <h6 className="mb-0">More than 10k+ <br />
                    trusted customers</h6>
                </div>
                <p className="my-5 wow fadeInUp" data-wow-duration="1000ms" data-wow-delay="1100ms">We believe that the
                  surest measure of success is when a client partners with us more
                  than half our clients stay with us for longer than a single longer than single longer thanproject.
                </p>
                <a href="#" className="btn btn-primary wow fadeInUp" data-wow-duration="1000ms"
                  data-wow-delay="1200ms"><span>CONTACT US</span><span>CONTACT US</span></a>
              </div>
            </div>
          </div>
        </div>

        <div className="divider"></div>
        <div className="divider"></div>
      </section>
    </>
  );
};

export default HeroArea;