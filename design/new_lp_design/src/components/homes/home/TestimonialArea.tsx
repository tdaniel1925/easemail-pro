"use client"
import React from 'react';
import { Autoplay, Navigation } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
 

const TestimonialArea = () => {
  return (
    <>
      <div className="testimonial-contact-wrapper">
        <div className="divider"></div>

        <div className="container">
          <div className="row">
            <div className="col-12 col-lg-6">
              <div className="section-heading">
                <h2 className="mb-0">Testimonials</h2>
              </div>

              <div className="divider-sm"></div>


              <div className="testimonial-slide">
              <svg className="mb-3" xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"
                    fill="none">
                    <path
                      d="M16.2504 7.5C24.2359 7.5 30.0004 14.0926 30.0002 23.8541C29.9491 38.0369 19.2871 48.0646 3.90567 49.9903C2.47864 50.169 1.9284 48.1922 3.24251 47.6078C9.14448 44.9835 12.1253 41.6533 12.5103 38.3571C12.798 35.8944 11.4592 33.7372 9.77821 33.3333C5.42025 32.286 2.50038 26.859 2.50038 21.25C2.50038 13.6561 8.65647 7.5 16.2504 7.5Z"
                      fill="#ECC80B" />
                    <path
                      d="M46.2504 7.5C54.2359 7.5 60.0004 14.0926 60.0002 23.8541C59.9491 38.0369 49.2871 48.0646 33.9057 49.9903C32.4786 50.169 31.9284 48.1922 33.2425 47.6078C39.1445 44.9835 42.1253 41.6533 42.5103 38.3571C42.798 35.8944 41.4592 33.7372 39.7782 33.3333C35.4203 32.286 32.5004 26.859 32.5004 21.25C32.5004 13.6561 38.6565 7.5 46.2504 7.5Z"
                      fill="#ECC80B" />
                  </svg>
                <Swiper 
                loop={true}
                spaceBetween={30}
                autoplay={{
                  delay: 4000,
                  disableOnInteraction: false
                }}
                navigation={{
                  nextEl: '.swiper-button-next',
                  prevEl: '.swiper-button-prev',
                }}
                modules={[Navigation, Autoplay]}
                className="swiper testimonial-swiper">

          

                    <SwiperSlide className="swiper-slide">
                      <p>“He quickly delivered excellent design a per required specifications. New landing page
                        will
                        have refreshing simple look, while keeping page load light on images and at the same
                        keeping
                        professional look. Finally, it also seems very reasonable to implement responsive design,
                        so
                        I'm very happy with that.”</p>
                      <div className="border-line"></div>
                      <div className="testimonial-info d-flex align-items-center">
                        <img src="/assets/img/bg-img/16.png" alt="" />
                        <div>
                          <h4>Daniyel Karlos</h4>
                          <p className="mb-0">UX Designer</p>
                        </div>
                      </div>
                    </SwiperSlide>


                    <SwiperSlide className="swiper-slide">
                      <p>“He quickly delivered excellent design a per required specifications. New landing page
                        will
                        have refreshing simple look, while keeping page load light on images and at the same
                        keeping
                        professional look. Finally, it also seems very reasonable to implement responsive design,
                        so
                        I'm very happy with that.”</p>
                      <div className="border-line"></div>
                      <div className="testimonial-info d-flex align-items-center">
                        <img src="/assets/img/bg-img/16.png" alt="" />
                        <div>
                          <h4>Daniyel Karlos</h4>
                          <p className="mb-0">UX Designer</p>
                        </div>
                      </div>
                    </SwiperSlide>


                    <SwiperSlide className="swiper-slide">
                      <p>“He quickly delivered excellent design a per required specifications. New landing page
                        will
                        have refreshing simple look, while keeping page load light on images and at the same
                        keeping
                        professional look. Finally, it also seems very reasonable to implement responsive design,
                        so
                        I'm very happy with that.”</p>
                      <div className="border-line"></div>
                      <div className="testimonial-info d-flex align-items-center">
                        <img src="/assets/img/bg-img/16.png" alt="" />
                        <div>
                          <h4>Daniyel Karlos</h4>
                          <p className="mb-0">UX Designer</p>
                        </div>
                      </div>
                    </SwiperSlide>
               


                  <div className="swiper-navigation-container">
                    <div className="swiper-button-prev">
                      <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26"
                        fill="none">
                        <path
                          d="M3.22024 13.8603L10.5175 21.1576C10.746 21.3861 11.0559 21.5144 11.379 21.5144C11.7021 21.5144 12.012 21.3861 12.2405 21.1576C12.469 20.9291 12.5973 20.6192 12.5973 20.2961C12.5973 19.973 12.469 19.6631 12.2405 19.4346L7.0199 14.216H21.9185C22.2411 14.216 22.5505 14.0879 22.7785 13.8598C23.0066 13.6317 23.1348 13.3224 23.1348 12.9998C23.1348 12.6773 23.0066 12.3679 22.7785 12.1398C22.5505 11.9117 22.2411 11.7836 21.9185 11.7836H7.0199L12.2385 6.56199C12.467 6.33351 12.5953 6.02362 12.5953 5.7005C12.5953 5.37738 12.467 5.0675 12.2385 4.83902C12.01 4.61054 11.7001 4.48218 11.377 4.48218C11.0539 4.48218 10.744 4.61054 10.5155 4.83902L3.21821 12.1363C3.10481 12.2495 3.01487 12.3839 2.95357 12.5319C2.89227 12.6799 2.86081 12.8385 2.861 12.9987C2.86119 13.1589 2.89302 13.3175 2.95467 13.4654C3.01632 13.6132 3.10657 13.7474 3.22024 13.8603Z"
                          fill="#0E0E0E" />
                      </svg>
                    </div>

                    <div className="swiper-button-next">
                      <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26"
                        fill="none">
                        <path
                          d="M22.7798 13.8603L15.4825 21.1576C15.254 21.3861 14.9441 21.5144 14.621 21.5144C14.2979 21.5144 13.988 21.3861 13.7595 21.1576C13.531 20.9291 13.4027 20.6192 13.4027 20.2961C13.4027 19.973 13.531 19.6631 13.7595 19.4346L18.9801 14.216H4.08145C3.75889 14.216 3.44954 14.0879 3.22146 13.8598C2.99337 13.6317 2.86523 13.3224 2.86523 12.9998C2.86523 12.6773 2.99337 12.3679 3.22146 12.1398C3.44954 11.9117 3.75889 11.7836 4.08145 11.7836H18.9801L13.7615 6.56199C13.533 6.33351 13.4047 6.02362 13.4047 5.7005C13.4047 5.37738 13.533 5.0675 13.7615 4.83902C13.99 4.61054 14.2999 4.48218 14.623 4.48218C14.9461 4.48218 15.256 4.61054 15.4845 4.83902L22.7818 12.1363C22.8952 12.2495 22.9851 12.3839 23.0464 12.5319C23.1077 12.6799 23.1392 12.8385 23.139 12.9987C23.1388 13.1589 23.107 13.3175 23.0453 13.4654C22.9837 13.6132 22.8934 13.7474 22.7798 13.8603Z"
                          fill="#0E0E0E" />
                      </svg>
                    </div>
                  </div>

                </Swiper>
              </div>
            </div>
          </div>
        </div>


        <div className="contact-wrapper" style={{ backgroundImage: 'url(/assets/img/bg-img/12.jpg)' }}>
          <div className="contact-form">
            <h3 className="mb-4">Get in Touch</h3>

            <form onClick={e => e.preventDefault()} className="mt-3">
              <input type="text" name="text" className="form-control" placeholder="Your Name" />
              <input type="email" name="email" className="form-control" placeholder="Email Address" />
              <textarea name="message" className="form-control" placeholder="Message" id="message"></textarea>
              <button className="btn btn-primary mt-3"><span>SEND MESSAGE</span><span>SEND MESSAGE</span></button>
            </form>
          </div>
        </div>

        <div className="divider d-none d-lg-block"></div>
      </div>
    </>
  );
};

export default TestimonialArea;

