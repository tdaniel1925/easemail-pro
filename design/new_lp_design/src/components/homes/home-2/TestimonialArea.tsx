"use client"
import React from 'react';
import { Autoplay, Navigation } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

 

const TestimonialArea = () => {
  return (
    <>
      <div className="testimonial-wrapper bg-secondary">
        <div className="divider"></div>

        <div className="container">
          <div className="row g-5">
            <div className="col-12 col-lg-6">
              <div className="section-heading">
                <h2 className="mb-0">What Clients Say About the Tool</h2>
              </div>
            </div>

            <div className="col-12 col-lg-6">
              <div className="testimonial-slide">
                <Swiper 
                loop={true}
                spaceBetween={30}
                autoplay={{
                  delay: 4000,
                  disableOnInteraction: false,
                }}
                navigation={{
                  nextEl: '.swiper-button-next',
                  prevEl: '.swiper-button-prev',
                }}
                modules={[Autoplay, Navigation]}
                className="swiper testimonial-swiper"> 

                    <SwiperSlide className="swiper-slide">

                      <div className="rating-info">

                        <div className="rating-average">
                          <span>4.9</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="17" viewBox="0 0 18 17"
                            fill="none">
                            <path
                              d="M4.84834 16.7794C4.09178 17.2358 3.15841 16.5586 3.35754 15.6978L4.31432 11.5616C4.39779 11.2007 4.27497 10.8233 3.99511 10.5806L0.784975 7.79752C0.117446 7.21879 0.473397 6.1221 1.35356 6.0457L5.59988 5.67709C5.96906 5.64505 6.29024 5.41147 6.43451 5.07014L8.07889 1.17942C8.42303 0.365148 9.57697 0.365148 9.92111 1.17941L11.5655 5.07014C11.7098 5.41147 12.0309 5.64505 12.4001 5.67709L16.6464 6.0457C17.5266 6.1221 17.8826 7.2188 17.215 7.79753L14.0049 10.5806C13.725 10.8233 13.6022 11.2007 13.6857 11.5616L14.6425 15.6978C14.8416 16.5586 13.9082 17.2358 13.1517 16.7794L9.51653 14.5866C9.19884 14.3949 8.80116 14.3949 8.48347 14.5866L4.84834 16.7794Z"
                              fill="#0E0E0E" />
                          </svg>
                        </div>

                        <div className="company-logo">
                          <img src="/assets/img/bg-img/27.png" alt="" />
                          <span>|</span>
                          <span>54 Reviews</span>
                        </div>
                      </div>

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

                      <div className="rating-info">

                        <div className="rating-average">
                          <span>4.9</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="17" viewBox="0 0 18 17"
                            fill="none">
                            <path
                              d="M4.84834 16.7794C4.09178 17.2358 3.15841 16.5586 3.35754 15.6978L4.31432 11.5616C4.39779 11.2007 4.27497 10.8233 3.99511 10.5806L0.784975 7.79752C0.117446 7.21879 0.473397 6.1221 1.35356 6.0457L5.59988 5.67709C5.96906 5.64505 6.29024 5.41147 6.43451 5.07014L8.07889 1.17942C8.42303 0.365148 9.57697 0.365148 9.92111 1.17941L11.5655 5.07014C11.7098 5.41147 12.0309 5.64505 12.4001 5.67709L16.6464 6.0457C17.5266 6.1221 17.8826 7.2188 17.215 7.79753L14.0049 10.5806C13.725 10.8233 13.6022 11.2007 13.6857 11.5616L14.6425 15.6978C14.8416 16.5586 13.9082 17.2358 13.1517 16.7794L9.51653 14.5866C9.19884 14.3949 8.80116 14.3949 8.48347 14.5866L4.84834 16.7794Z"
                              fill="#0E0E0E" />
                          </svg>
                        </div>

                        <div className="company-logo">
                          <img src="/assets/img/bg-img/27.png" alt="" />
                          <span>|</span>
                          <span>54 Reviews</span>
                        </div>
                      </div>
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

                      <div className="rating-info">

                        <div className="rating-average">
                          <span>4.9</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="17" viewBox="0 0 18 17"
                            fill="none">
                            <path
                              d="M4.84834 16.7794C4.09178 17.2358 3.15841 16.5586 3.35754 15.6978L4.31432 11.5616C4.39779 11.2007 4.27497 10.8233 3.99511 10.5806L0.784975 7.79752C0.117446 7.21879 0.473397 6.1221 1.35356 6.0457L5.59988 5.67709C5.96906 5.64505 6.29024 5.41147 6.43451 5.07014L8.07889 1.17942C8.42303 0.365148 9.57697 0.365148 9.92111 1.17941L11.5655 5.07014C11.7098 5.41147 12.0309 5.64505 12.4001 5.67709L16.6464 6.0457C17.5266 6.1221 17.8826 7.2188 17.215 7.79753L14.0049 10.5806C13.725 10.8233 13.6022 11.2007 13.6857 11.5616L14.6425 15.6978C14.8416 16.5586 13.9082 17.2358 13.1517 16.7794L9.51653 14.5866C9.19884 14.3949 8.80116 14.3949 8.48347 14.5866L4.84834 16.7794Z"
                              fill="#0E0E0E" />
                          </svg>
                        </div>

                        <div className="company-logo">
                          <img src="/assets/img/bg-img/27.png" alt="" />
                          <span>|</span>
                          <span>54 Reviews</span>
                        </div>
                      </div>
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

        <div className="divider"></div>
      </div>
    </>
  );
};

export default TestimonialArea;