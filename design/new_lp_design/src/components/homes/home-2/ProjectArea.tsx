"use client";
import React from 'react';
import { Autoplay, Navigation } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';


const setting = {
  loop: true,
  slidesPerView: 2,
  spaceBetween: 60,
  autoplay: {
      delay: 4000,
      disableOnInteraction: false,
  },
  navigation: {
      nextEl: '.portfolio-button-next',
      prevEl: '.portfolio-button-prev',
  },
 
}

const ProjectArea = () => {
  return (
    <>
      <div className="projects-wrapper-two">
        <div className="divider"></div>

        <div className="container">
          <div className="row g-5 align-items-end justify-content-between">
            <div className="col-12 col-md-6 col-lg-5">
              <div className="section-heading">
                <h2 className="mb-0">Let's See Our Projects</h2>
              </div>
            </div>


            <div className="col-12 col-md-6 col-lg-4">
              <div className="swiper-navigation-container portfolio-swiper-navigation justify-content-md-end">
                <div style={{cursor: 'pointer'}} className="portfolio-button-prev">
                  <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26" fill="none">
                    <path
                      d="M3.22024 13.8602L10.5175 21.1575C10.746 21.386 11.0559 21.5143 11.379 21.5143C11.7021 21.5143 12.012 21.386 12.2405 21.1575C12.469 20.929 12.5973 20.6191 12.5973 20.296C12.5973 19.9729 12.469 19.663 12.2405 19.4345L7.0199 14.2159H21.9185C22.2411 14.2159 22.5505 14.0878 22.7785 13.8597C23.0066 13.6316 23.1348 13.3223 23.1348 12.9997C23.1348 12.6771 23.0066 12.3678 22.7785 12.1397C22.5505 11.9116 22.2411 11.7835 21.9185 11.7835H7.0199L12.2385 6.56187C12.467 6.33339 12.5953 6.0235 12.5953 5.70038C12.5953 5.37726 12.467 5.06738 12.2385 4.83889C12.01 4.61041 11.7001 4.48206 11.377 4.48206C11.0539 4.48206 10.744 4.61041 10.5155 4.83889L3.21821 12.1362C3.10481 12.2493 3.01487 12.3838 2.95357 12.5318C2.89227 12.6798 2.86081 12.8384 2.861 12.9986C2.86119 13.1588 2.89302 13.3174 2.95467 13.4652C3.01632 13.6131 3.10657 13.7473 3.22024 13.8602Z"
                      fill="#0E0E0E" />
                  </svg>
                </div>

                <div style={{cursor: 'pointer'}} className="portfolio-button-next">
                  <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26" fill="none">
                    <path
                      d="M22.7798 13.8602L15.4825 21.1575C15.254 21.386 14.9441 21.5143 14.621 21.5143C14.2979 21.5143 13.988 21.386 13.7595 21.1575C13.531 20.929 13.4027 20.6191 13.4027 20.296C13.4027 19.9729 13.531 19.663 13.7595 19.4345L18.9801 14.2159H4.08145C3.75889 14.2159 3.44954 14.0878 3.22146 13.8597C2.99337 13.6316 2.86523 13.3223 2.86523 12.9997C2.86523 12.6771 2.99337 12.3678 3.22146 12.1397C3.44954 11.9116 3.75889 11.7835 4.08145 11.7835H18.9801L13.7615 6.56187C13.533 6.33339 13.4047 6.0235 13.4047 5.70038C13.4047 5.37726 13.533 5.06738 13.7615 4.83889C13.99 4.61041 14.2999 4.48206 14.623 4.48206C14.9461 4.48206 15.256 4.61041 15.4845 4.83889L22.7818 12.1362C22.8952 12.2493 22.9851 12.3838 23.0464 12.5318C23.1077 12.6798 23.1392 12.8384 23.139 12.9986C23.1388 13.1588 23.107 13.3174 23.0453 13.4652C22.9837 13.6131 22.8934 13.7473 22.7798 13.8602Z"
                      fill="#0E0E0E" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="divider-sm"></div>

          <div className="container">
            <Swiper 
            loop={true}
            slidesPerView={3}
            spaceBetween={30}
            autoplay={{
              delay: 4000,
              disableOnInteraction: false,
            }} 
            navigation={{
              nextEl: ".portfolio-button-next",
              prevEl: ".portfolio-button-prev",
            }}
            modules={[Navigation, Autoplay]}
            breakpoints={{
              320: {
                  slidesPerView: 1,
                  spaceBetween: 10,
              },
              480: {
                  slidesPerView: 1,
                  spaceBetween: 20,
              },
              576: {
                  slidesPerView: 1,
                  spaceBetween: 20,
              },
              768: {
                  slidesPerView: 2,
                  spaceBetween: 30,
              }
          }}
            className="swiper portfolio-swiper">           

                <SwiperSlide className="swiper-slide">
                  <div className="portfolio-card-two">
                    <img src="/assets/img/bg-img/20.jpg" alt="" />


                    <div className="portfolio-overlay-content d-flex align-items-center justify-content-between">
                      <a href="#">
                        <span className="material-symbols-outlined">
                          arrow_outward
                        </span>
                      </a>
                    </div>
                  </div>


                  <div className="portfolio-content-two">
                    <h3>Branding Design platform</h3>
                    <p className="mb-0">Branding Design</p>
                  </div>
                </SwiperSlide>

                <SwiperSlide className="swiper-slide">
                  <div className="portfolio-card-two">
                    <img src="/assets/img/bg-img/21.jpg" alt="" />


                    <div className="portfolio-overlay-content d-flex align-items-center justify-content-between">
                      <a href="#">
                        <span className="material-symbols-outlined">
                          arrow_outward
                        </span>
                      </a>
                    </div>
                  </div>


                  <div className="portfolio-content-two">
                    <h3>Product Development</h3>
                    <p className="mb-0">Product Development</p>
                  </div>
                </SwiperSlide>

                <SwiperSlide className="swiper-slide">
                  <div className="portfolio-card-two">
                    <img src="/assets/img/bg-img/20.jpg" alt="" />


                    <div className="portfolio-overlay-content d-flex align-items-center justify-content-between">
                      <a href="#">
                        <span className="material-symbols-outlined">
                          arrow_outward
                        </span>
                      </a>
                    </div>
                  </div>


                  <div className="portfolio-content-two">
                    <h3>Branding Design platform</h3>
                    <p className="mb-0">Branding Design</p>
                  </div>
                </SwiperSlide>

                <SwiperSlide className="swiper-slide">
                  <div className="portfolio-card-two">
                    <img src="/assets/img/bg-img/21.jpg" alt="" />


                    <div className="portfolio-overlay-content d-flex align-items-center justify-content-between">
                      <a href="#">
                        <span className="material-symbols-outlined">
                          arrow_outward
                        </span>
                      </a>
                    </div>
                  </div>


                  <div className="portfolio-content-two">
                    <h3>Product Development</h3>
                    <p className="mb-0">Product Development</p>
                  </div>
                </SwiperSlide>
             
            </Swiper>
          </div>
        </div>

        <div className="divider"></div>
      </div>
    </>
  );
};

export default ProjectArea;