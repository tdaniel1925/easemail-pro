
import React from 'react';

const PriceArea = ({style_2}: any) => {
  return (
    <>
      <div className={` price-table-wrapper ${style_2 ? "" : "bg-secondary"}`}>
        <div className="divider"></div>

        <div className="container">
          <div className="row justify-content-center">
            <div className="col-12 col-md-8">
              <div className="section-heading text-center">
                <h2 className="mb-0">Pricing Plan to Boost Your Business</h2>
              </div>
            </div>
          </div>
        </div>

        <div className="divider-sm"></div>

        <div className="container">
          <div className="row g-4 justify-content-center">


            <div className="col-12 col-md-6 col-lg-4">
              <div className="price-card">
                <div className="price-info">
                  <h6>Startup</h6>
                  <h3 className="price">$110 <span>/mo</span></h3>
                  <p className="mb-0">We prioritize their success because is drive authentic relationships.</p>
                </div>

                <ul className="price-description list-unstyled">
                  <li><span className="material-symbols-outlined">check</span> Web & Mobile</li>
                  <li><span className="material-symbols-outlined">check</span> UI Design Create</li>
                  <li><span className="material-symbols-outlined">check</span> Blockchain Development</li>
                  <li><span className="material-symbols-outlined">check</span> Full Website Design System</li>
                  <li><span className="material-symbols-outlined">check</span> One Year Support Included</li>
                </ul>

                <div className="choose-plan">
                  <a href="#" className="btn btn-dark w-100"><span>Choose this plan</span><span>Choose this
                    plan</span></a>
                </div>
              </div>
            </div>


            <div className="col-12 col-md-6 col-lg-4">
              <div className="price-card">
                <div className="price-info">
                  <h6>Professional</h6>
                  <h3 className="price">$130 <span>/mo</span></h3>
                  <p className="mb-0">We prioritize their success because is drive authentic relationships.</p>
                </div>

                <ul className="price-description list-unstyled">
                  <li><span className="material-symbols-outlined">check</span> Web & Mobile</li>
                  <li><span className="material-symbols-outlined">check</span> UI Design Create</li>
                  <li><span className="material-symbols-outlined">check</span> Blockchain Development</li>
                  <li><span className="material-symbols-outlined">check</span> Full Website Design System</li>
                  <li><span className="material-symbols-outlined">check</span> One Year Support Included</li>
                </ul>

                <div className="choose-plan">
                  <a href="#" className="btn btn-primary w-100"><span>Choose this plan</span><span>Choose this
                    plan</span></a>
                </div>
              </div>
            </div>


            <div className="col-12 col-md-6 col-lg-4">
              <div className="price-card">
                <div className="price-info">
                  <h6>Exclusive</h6>
                  <h3 className="price">$140 <span>/mo</span></h3>
                  <p className="mb-0">We prioritize their success because is drive authentic relationships.</p>
                </div>

                <ul className="price-description list-unstyled">
                  <li><span className="material-symbols-outlined">check</span> Web & Mobile</li>
                  <li><span className="material-symbols-outlined">check</span> UI Design Create</li>
                  <li><span className="material-symbols-outlined">check</span> Blockchain Development</li>
                  <li><span className="material-symbols-outlined">check</span> Full Website Design System</li>
                  <li><span className="material-symbols-outlined">check</span> One Year Support Included</li>
                </ul>

                <div className="choose-plan">
                  <a href="#" className="btn btn-dark w-100"><span>Choose this plan</span><span>Choose this
                    plan</span></a>
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

export default PriceArea;