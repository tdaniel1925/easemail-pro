
"use client";
import Link from 'next/link';
import React, { useState } from 'react';
import { Autoplay, Navigation } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';


const services = [
  { icon: "ads_click", title: "Digital Marketing", description: "Designed user interface contributes to a positive and a good user experience." },
  { icon: "web", title: "Web Development", description: "Designed user interface contributes to a positive and a good user experience." },
  { icon: "stream_apps", title: "Mobile Apps", description: "Designed user interface contributes to a positive and a good user experience." },
  { icon: "design_services", title: "UI/UX Design", description: "Designed user interface contributes to a positive and a good user experience." },
  { icon: "ads_click", title: "Digital Marketing", description: "Designed user interface contributes to a positive and a good user experience." },
  { icon: "web", title: "Web Development", description: "Designed user interface contributes to a positive and a good user experience." },
  { icon: "stream_apps", title: "Mobile Apps", description: "Designed user interface contributes to a positive and a good user experience." },
  { icon: "design_services", title: "UI/UX Design", description: "Designed user interface contributes to a positive and a good user experience." },
];


const ServiceArea = () => {

  const [activeIndex, setActiveIndex] = useState<number | null>(null);



  return (
    <>
      <div className="latest-service-wrapper bg-secondary">
        <div className="divider"></div>

        <div className="container">
          <div className="row g-4 align-items-end">
            <div className="col-12 col-sm-6">
              <div className="section-heading">
                <h2 className="mb-0">Our Latest Client Solutions</h2>
              </div>
            </div>

            <div className="col-12 col-sm-6">
              <div className="swiper-navigation-container service-swiper-navigation">
                <div className="service-button-prev" style={{ cursor: "pointer" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <path
                      d="M3.93875 17.0605L12.9387 26.0605C13.2205 26.3423 13.6027 26.5006 14.0012 26.5006C14.3998 26.5006 14.782 26.3423 15.0637 26.0605C15.3455 25.7787 15.5039 25.3965 15.5039 24.998C15.5039 24.5995 15.3455 24.2173 15.0637 23.9355L8.625 17.4992H27C27.3978 17.4992 27.7794 17.3412 28.0607 17.0599C28.342 16.7786 28.5 16.3971 28.5 15.9992C28.5 15.6014 28.342 15.2199 28.0607 14.9386C27.7794 14.6573 27.3978 14.4992 27 14.4992H8.625L15.0613 8.05924C15.343 7.77745 15.5014 7.39526 15.5014 6.99674C15.5014 6.59823 15.343 6.21603 15.0613 5.93424C14.7795 5.65245 14.3973 5.49414 13.9988 5.49414C13.6002 5.49414 13.218 5.65245 12.9363 5.93424L3.93625 14.9342C3.79639 15.0738 3.68547 15.2396 3.60986 15.4221C3.53426 15.6046 3.49546 15.8003 3.49569 15.9979C3.49592 16.1955 3.53518 16.391 3.61122 16.5734C3.68725 16.7557 3.79856 16.9213 3.93875 17.0605Z"
                      fill="#0E0E0E" />
                  </svg>
                </div>

                <div className="service-button-next" style={{ cursor: "pointer" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <path
                      d="M28.0613 17.0605L19.0613 26.0605C18.7795 26.3423 18.3973 26.5006 17.9988 26.5006C17.6002 26.5006 17.218 26.3423 16.9363 26.0605C16.6545 25.7787 16.4961 25.3965 16.4961 24.998C16.4961 24.5995 16.6545 24.2173 16.9363 23.9355L23.375 17.4992H5C4.60218 17.4992 4.22064 17.3412 3.93934 17.0599C3.65804 16.7786 3.5 16.3971 3.5 15.9992C3.5 15.6014 3.65804 15.2199 3.93934 14.9386C4.22064 14.6573 4.60218 14.4992 5 14.4992H23.375L16.9387 8.05924C16.657 7.77745 16.4986 7.39526 16.4986 6.99674C16.4986 6.59823 16.657 6.21603 16.9387 5.93424C17.2205 5.65245 17.6027 5.49414 18.0012 5.49414C18.3998 5.49414 18.782 5.65245 19.0637 5.93424L28.0637 14.9342C28.2036 15.0738 28.3145 15.2396 28.3901 15.4221C28.4657 15.6046 28.5045 15.8003 28.5043 15.9979C28.5041 16.1955 28.4648 16.391 28.3888 16.5734C28.3127 16.7557 28.2014 16.9213 28.0613 17.0605Z"
                      fill="#0E0E0E" />
                  </svg>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className="divider-sm"></div>

        <div className="container">
          <Swiper
            loop={true}
            slidesPerView={4}
            spaceBetween={30}
            autoplay={{
              delay: 4000,
              disableOnInteraction: false,
            }}
            navigation={{
              nextEl: '.service-button-next',
              prevEl: '.service-button-prev',
            }}
            modules={[Navigation, Autoplay]}
            breakpoints={{
              0: {
                slidesPerView: 1,
              }, 
              576: {
                slidesPerView: 2,
                spaceBetween: 20,
              },
              768: {
                slidesPerView: 3,
                spaceBetween: 20,
              },
              1200: {
                slidesPerView: 3,
                spaceBetween: 20,
              },
              1400: {
                slidesPerView: 4,
                spaceBetween: 30,
              },
            }
            }
            className="swiper service-swiper">
            {services.map((item, i) => (
              <SwiperSlide key={i} className="swiper-slide">
                <Link href="/service-details">
                  <div
                    onMouseEnter={() => setActiveIndex(i)}
                    onMouseLeave={() => setActiveIndex(null)}
                    className={`service-slide-card  ${activeIndex === i ? "active" : ""}`}>
                    <span className="material-symbols-outlined">{item.icon}</span>
                    {/* <h2 style={{ bottom: `${activeIndex === i ? '140px' : ''}` }}>{item.title}</h2>
                    <p className="mb-0" style={{ bottom: `${activeIndex === i ? '45px' : ''}` }}>
                      {item.description}
                    </p> */}
                    <h2 className={`service-title ${activeIndex === i ? "active" : ""}`}>
                      {item.title}
                    </h2>
                    <p className={`service-description ${activeIndex === i ? "active" : ""}`}>
                      {item.description}
                    </p>
                  </div>
                </Link>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        <div className="divider"></div>
      </div>
    </>
  );
};

export default ServiceArea;
