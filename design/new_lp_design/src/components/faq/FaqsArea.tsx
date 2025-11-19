
import React from 'react';

const FaqsArea = () => {
  return (
    <>
      <div className="faq-page-wrapper">
        <div className="divider"></div>

        <div className="container">
          <div className="row justify-content-center">
            <div className="col-12 col-lg-10">
              <div className="faq-accordion service-details-faq">
                <div className="accordion" id="faqAccordion">

                  <div className="accordion-item">
                    <h2 className="accordion-header">
                      <button className="accordion-button" type="button" data-bs-toggle="collapse"
                        data-bs-target="#faqQuestion1" aria-expanded="true" aria-controls="faqQuestion1">
                        What is vision for the future?
                      </button>
                    </h2>
                    <div id="faqQuestion1" className="accordion-collapse collapse show" data-bs-parent="#faqAccordion">
                      <div className="accordion-body">
                        A business consultant is a professional who provides expert advice and guidance on various
                        aspects such.
                      </div>
                    </div>
                  </div>

                  <div className="accordion-item">
                    <h2 className="accordion-header">
                      <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse"
                        data-bs-target="#faqQuestion2" aria-expanded="false" aria-controls="faqQuestion2">
                        Do you offer free resources?
                      </button>
                    </h2>
                    <div id="faqQuestion2" className="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                      <div className="accordion-body">
                        A business consultant is a professional who provides expert advice and guidance on various
                        aspects such.
                      </div>
                    </div>
                  </div>

                  <div className="accordion-item">
                    <h2 className="accordion-header">
                      <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse"
                        data-bs-target="#faqQuestion3" aria-expanded="false" aria-controls="faqQuestion3">
                        Can help to find investors?
                      </button>
                    </h2>
                    <div id="faqQuestion3" className="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                      <div className="accordion-body">
                        A business consultant is a professional who provides expert advice and guidance on various
                        aspects such.
                      </div>
                    </div>
                  </div>

                  <div className="accordion-item">
                    <h2 className="accordion-header">
                      <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse"
                        data-bs-target="#faqQuestion4" aria-expanded="false" aria-controls="faqQuestion4">
                        Can help to find investors?
                      </button>
                    </h2>
                    <div id="faqQuestion4" className="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                      <div className="accordion-body">
                        A business consultant is a professional who provides expert advice and guidance on various
                        aspects such.
                      </div>
                    </div>
                  </div>

                  <div className="accordion-item">
                    <h2 className="accordion-header">
                      <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse"
                        data-bs-target="#faqQuestion5" aria-expanded="false" aria-controls="faqQuestion5">
                        What services do you offer?
                      </button>
                    </h2>
                    <div id="faqQuestion5" className="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                      <div className="accordion-body">
                        A business consultant is a professional who provides expert advice and guidance on various
                        aspects such.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="divider"></div>

        <div className="container">
          <div className="row justify-content-center">
            <div className="col-12 col-lg-9 col-xl-8">
              <div className="section-heading text-center">
                <h2>Still have questions?</h2>
                <p>You can use it in situations when you are providing guidance With over a decade of experienceor
                  information.</p>
                <a href="#" className="btn btn-primary mt-5"><span>CONTACT</span><span>CONTACT</span></a>
              </div>
            </div>
          </div>
        </div>

        <div className="divider"></div>
      </div>
    </>
  );
};

export default FaqsArea;