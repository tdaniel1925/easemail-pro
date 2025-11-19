
import React from 'react';

const CtaArea = () => {
  return (
    <>
      <div className="cta-wrap jarallax" data-jarallax="" data-speed="0.6"
        style={{ backgroundImage: "url(/assets/img/bg-img/1.jpg)", backgroundAttachment: "fixed" }}>
        <div className="divider"></div>

        <div className="container">
          <div className="row justify-content-end">
            <div className="col-12 col-sm-11 col-md-10 col-lg-7 col-xl-6 col-xxl-5">
              <div className="cta-card">

                <div className="total-clients-wrap">
                  <div className="total-number">
                    <h3>200+</h3>
                    <p className="mb-0">Satisfied Customers</p>
                  </div>


                  <div className="clients-images">
                    <img src="/assets/img/bg-img/5.jpg" alt="" />
                    <img src="/assets/img/bg-img/4.jpg" alt="" />
                    <img src="/assets/img/bg-img/3.jpg" alt="" />
                    <img src="/assets/img/bg-img/2.jpg" alt="" />
                  </div>
                </div>


                <div className="cta-stats">
                  <div>
                    <h2>100+</h2>
                    <p className="mb-0">Global Clients</p>
                  </div>

                  <div>
                    <h2>150+</h2>
                    <p className="mb-0">Team Members</p>
                  </div>

                  <div>
                    <h2>15+</h2>
                    <p className="mb-0">Business Experience</p>
                  </div>

                  <div>
                    <h2>300+</h2>
                    <p className="mb-0">Projects Complete</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="divider"></div>
      </div>
    </>
  );
};

export default CtaArea;