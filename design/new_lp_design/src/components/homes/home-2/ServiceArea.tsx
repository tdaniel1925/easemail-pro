"use client"
import Link from 'next/link';
import React from 'react';
import { Autoplay, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

const ServiceArea = () => {
  return (
    <>
      <div className="latest-service-wrapper bg-secondary">
        <div className="divider"></div>

        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-6">
              <div className="section-heading text-center">
                <h2 className="mb-0">Our Latest Client Solutions</h2>
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
            pagination={{
              el: ".swiper-pagination-2",
            }}
            modules={[Pagination, Autoplay]}
            breakpoints={{
              320: {
                slidesPerView: 1,
                spaceBetween: 10,
              },
              480: {
                slidesPerView: 1,
                spaceBetween: 20,
              },
              768: {
                slidesPerView: 2,
                spaceBetween: 20,
              },
              1200: {
                slidesPerView: 3,
                spaceBetween: 30,
              },
            }}
            className="swiper service-two-swiper">
            <SwiperSlide className="swiper-slide">
              <Link href="/service-details" >
                <div className="icon-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50" fill="none">
                    <g clipPath="url(#clip0_1_677)">
                      <path
                        d="M3.64583 31.2493H19.2708C21.2812 31.2493 22.9167 29.6139 22.9167 27.6035V20.3118C22.9167 18.3014 21.2812 16.666 19.2708 16.666H3.64583C1.63542 16.666 0 18.3014 0 20.3118V27.6035C0 29.6139 1.63542 31.2493 3.64583 31.2493Z"
                        fill="#ECC80B" />
                      <path
                        d="M3.64583 49.9993H19.2708C21.2812 49.9993 22.9167 48.3639 22.9167 46.3535V39.0618C22.9167 37.0514 21.2812 35.416 19.2708 35.416H3.64583C1.63542 35.416 0 37.0514 0 39.0618V46.3535C0 48.3639 1.63542 49.9993 3.64583 49.9993Z"
                        fill="#ECC80B" />
                      <path
                        d="M46.3542 0H3.64583C1.63542 0 0 1.63542 0 3.64583V8.85417C0 10.8646 1.63542 12.5 3.64583 12.5H46.3542C48.3646 12.5 50 10.8646 50 8.85417V3.64583C50 1.63542 48.3646 0 46.3542 0Z"
                        fill="#ECC80B" />
                      <path
                        d="M46.3538 16.666H30.7288C28.7184 16.666 27.083 18.3014 27.083 20.3118V46.3535C27.083 48.3639 28.7184 49.9993 30.7288 49.9993H46.3538C48.3643 49.9993 49.9997 48.3639 49.9997 46.3535V20.3118C49.9997 18.3014 48.3643 16.666 46.3538 16.666Z"
                        fill="#ECC80B" />
                    </g>
                    <defs>
                      <clipPath id="clip0_1_677">
                        <rect width="50" height="50" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                </div>
                <h2>Website Design</h2>
                <p className="mb-0">Designed user interface contributes to a positive user experience, and a good user
                  experience.
                </p>
              </Link>

            </SwiperSlide>
            <SwiperSlide className="swiper-slide">
              <Link href="/service-details" >
                <div className="icon-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50" fill="none">
                    <g clipPath="url(#clip0_1_6888)">
                      <path
                        d="M49.3896 23.5271L41.6375 15.775C41.6396 15.7229 41.6667 15.6771 41.6667 15.625V9.375C41.6667 8.225 40.7354 7.29167 39.5833 7.29167H18.75V2.08333C18.75 0.933333 17.8188 0 16.6667 0H2.08333C0.93125 0 0 0.933333 0 2.08333V16.6667C0 17.8167 0.93125 18.75 2.08333 18.75H16.6667C17.8188 18.75 18.75 17.8167 18.75 16.6667V11.4583H37.5V15.625C37.5 15.6771 37.5271 15.7229 37.5292 15.775L29.7771 23.5271C28.9625 24.3417 28.9625 25.6583 29.7771 26.4729L37.5292 34.225C37.5271 34.2771 37.5 34.3229 37.5 34.375V38.5417H18.4979C17.5458 34.375 13.8271 31.25 9.375 31.25C4.20625 31.25 0 35.4562 0 40.625C0 45.7937 4.20625 50 9.375 50C13.8271 50 17.5458 46.875 18.4979 42.7083H39.5833C40.7354 42.7083 41.6667 41.775 41.6667 40.625V34.375C41.6667 34.3229 41.6396 34.2771 41.6375 34.225L49.3896 26.4729C50.2042 25.6583 50.2042 24.3417 49.3896 23.5271ZM14.5833 14.5833H4.16667V4.16667H14.5833V14.5833ZM9.375 45.8333C6.50208 45.8333 4.16667 43.4958 4.16667 40.625C4.16667 37.7542 6.50208 35.4167 9.375 35.4167C12.2479 35.4167 14.5833 37.7542 14.5833 40.625C14.5833 43.4958 12.2479 45.8333 9.375 45.8333Z"
                        fill="#ECC80B" />
                    </g>
                    <defs>
                      <clipPath id="clip0_1_6888">
                        <rect width="50" height="50" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                </div>
                <h2>Website Development</h2>
                <p className="mb-0">Designed user interface contributes to a positive user experience, and a good user
                  experience.
                </p>
              </Link>

            </SwiperSlide>
            <SwiperSlide className="swiper-slide">
              <Link href="/service-details" >
                <div className="icon-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50" fill="none">
                    <path
                      d="M43.75 2.08398H6.25C2.80417 2.08398 0 4.88815 0 8.33398V41.6673C0 45.1131 2.80417 47.9173 6.25 47.9173H43.75C47.1958 47.9173 50 45.1131 50 41.6673V8.33398C50 4.88815 47.1958 2.08398 43.75 2.08398ZM45.8333 41.6673C45.8333 42.8173 44.8979 43.7506 43.75 43.7506H6.25C5.10208 43.7506 4.16667 42.8173 4.16667 41.6673V12.5007H45.8333V41.6673Z"
                      fill="#ECC80B" />
                    <path
                      d="M40.1042 25.5215C38.9521 25.5215 38.0208 26.4548 38.0208 27.6048V36.9798H27.0833V31.7715C27.0833 30.6215 26.1521 29.6882 25 29.6882C23.8479 29.6882 22.9167 30.6215 22.9167 31.7715V36.9798H11.9792V29.6882C11.9792 28.5382 11.0479 27.6048 9.89583 27.6048C8.74375 27.6048 7.8125 28.5382 7.8125 29.6882V39.0632C7.8125 40.2132 8.74375 41.1465 9.89583 41.1465H40.1042C41.2562 41.1465 42.1875 40.2132 42.1875 39.0632V27.6048C42.1875 26.4548 41.2562 25.5215 40.1042 25.5215Z"
                      fill="#ECC80B" />
                    <path
                      d="M40.625 15.625C39.1854 15.625 37.9833 16.6083 37.6208 17.9333L27.2104 20.7104C26.6437 20.1438 25.8625 19.7917 25 19.7917C23.9958 19.7917 23.1125 20.275 22.5396 21.0125L12.2604 19.6417C11.7917 18.5083 10.6771 17.7083 9.375 17.7083C7.65208 17.7083 6.25 19.1104 6.25 20.8333C6.25 22.5563 7.65208 23.9583 9.375 23.9583C10.3792 23.9583 11.2625 23.475 11.8354 22.7375L22.1146 24.1083C22.5833 25.2417 23.6979 26.0417 25 26.0417C26.4396 26.0417 27.6417 25.0583 28.0042 23.7333L38.4146 20.9563C38.9812 21.5229 39.7625 21.875 40.625 21.875C42.3479 21.875 43.75 20.4729 43.75 18.75C43.75 17.0271 42.3479 15.625 40.625 15.625Z"
                      fill="#ECC80B" />
                  </svg>
                </div>
                <h2>Digital Marketing</h2>
                <p className="mb-0">Designed user interface contributes to a positive user experience, and a good user
                  experience.
                </p>
              </Link>

            </SwiperSlide>
            <SwiperSlide className="swiper-slide">
              <Link href="/service-details" >
                <div className="icon-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50" fill="none">
                    <g clipPath="url(#clip0_1_6770)">
                      <path
                        d="M3.64583 31.2493H19.2708C21.2812 31.2493 22.9167 29.6139 22.9167 27.6035V20.3118C22.9167 18.3014 21.2812 16.666 19.2708 16.666H3.64583C1.63542 16.666 0 18.3014 0 20.3118V27.6035C0 29.6139 1.63542 31.2493 3.64583 31.2493Z"
                        fill="#ECC80B" />
                      <path
                        d="M3.64583 49.9993H19.2708C21.2812 49.9993 22.9167 48.3639 22.9167 46.3535V39.0618C22.9167 37.0514 21.2812 35.416 19.2708 35.416H3.64583C1.63542 35.416 0 37.0514 0 39.0618V46.3535C0 48.3639 1.63542 49.9993 3.64583 49.9993Z"
                        fill="#ECC80B" />
                      <path
                        d="M46.3542 0H3.64583C1.63542 0 0 1.63542 0 3.64583V8.85417C0 10.8646 1.63542 12.5 3.64583 12.5H46.3542C48.3646 12.5 50 10.8646 50 8.85417V3.64583C50 1.63542 48.3646 0 46.3542 0Z"
                        fill="#ECC80B" />
                      <path
                        d="M46.3538 16.666H30.7288C28.7184 16.666 27.083 18.3014 27.083 20.3118V46.3535C27.083 48.3639 28.7184 49.9993 30.7288 49.9993H46.3538C48.3643 49.9993 49.9997 48.3639 49.9997 46.3535V20.3118C49.9997 18.3014 48.3643 16.666 46.3538 16.666Z"
                        fill="#ECC80B" />
                    </g>
                    <defs>
                      <clipPath id="clip0_1_6770">
                        <rect width="50" height="50" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                </div>
                <h2>Website Design</h2>
                <p className="mb-0">Designed user interface contributes to a positive user experience, and a good user
                  experience.
                </p>
              </Link>

            </SwiperSlide>
            <SwiperSlide className="swiper-slide">
              <Link href="/service-details" >
                <div className="icon-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50" fill="none">
                    <g clipPath="url(#clip0_1_688)">
                      <path
                        d="M49.3896 23.5271L41.6375 15.775C41.6396 15.7229 41.6667 15.6771 41.6667 15.625V9.375C41.6667 8.225 40.7354 7.29167 39.5833 7.29167H18.75V2.08333C18.75 0.933333 17.8188 0 16.6667 0H2.08333C0.93125 0 0 0.933333 0 2.08333V16.6667C0 17.8167 0.93125 18.75 2.08333 18.75H16.6667C17.8188 18.75 18.75 17.8167 18.75 16.6667V11.4583H37.5V15.625C37.5 15.6771 37.5271 15.7229 37.5292 15.775L29.7771 23.5271C28.9625 24.3417 28.9625 25.6583 29.7771 26.4729L37.5292 34.225C37.5271 34.2771 37.5 34.3229 37.5 34.375V38.5417H18.4979C17.5458 34.375 13.8271 31.25 9.375 31.25C4.20625 31.25 0 35.4562 0 40.625C0 45.7937 4.20625 50 9.375 50C13.8271 50 17.5458 46.875 18.4979 42.7083H39.5833C40.7354 42.7083 41.6667 41.775 41.6667 40.625V34.375C41.6667 34.3229 41.6396 34.2771 41.6375 34.225L49.3896 26.4729C50.2042 25.6583 50.2042 24.3417 49.3896 23.5271ZM14.5833 14.5833H4.16667V4.16667H14.5833V14.5833ZM9.375 45.8333C6.50208 45.8333 4.16667 43.4958 4.16667 40.625C4.16667 37.7542 6.50208 35.4167 9.375 35.4167C12.2479 35.4167 14.5833 37.7542 14.5833 40.625C14.5833 43.4958 12.2479 45.8333 9.375 45.8333Z"
                        fill="#ECC80B" />
                    </g>
                    <defs>
                      <clipPath id="clip0_1_688">
                        <rect width="50" height="50" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                </div>
                <h2>Website Development</h2>
                <p className="mb-0">Designed user interface contributes to a positive user experience, and a good user
                  experience.
                </p>
              </Link>

            </SwiperSlide>
            <SwiperSlide className="swiper-slide">
              <Link href="/service-details" >
                <div className="icon-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50" fill="none">
                    <path
                      d="M43.75 2.08398H6.25C2.80417 2.08398 0 4.88815 0 8.33398V41.6673C0 45.1131 2.80417 47.9173 6.25 47.9173H43.75C47.1958 47.9173 50 45.1131 50 41.6673V8.33398C50 4.88815 47.1958 2.08398 43.75 2.08398ZM45.8333 41.6673C45.8333 42.8173 44.8979 43.7506 43.75 43.7506H6.25C5.10208 43.7506 4.16667 42.8173 4.16667 41.6673V12.5007H45.8333V41.6673Z"
                      fill="#ECC80B" />
                    <path
                      d="M40.1042 25.5215C38.9521 25.5215 38.0208 26.4548 38.0208 27.6048V36.9798H27.0833V31.7715C27.0833 30.6215 26.1521 29.6882 25 29.6882C23.8479 29.6882 22.9167 30.6215 22.9167 31.7715V36.9798H11.9792V29.6882C11.9792 28.5382 11.0479 27.6048 9.89583 27.6048C8.74375 27.6048 7.8125 28.5382 7.8125 29.6882V39.0632C7.8125 40.2132 8.74375 41.1465 9.89583 41.1465H40.1042C41.2562 41.1465 42.1875 40.2132 42.1875 39.0632V27.6048C42.1875 26.4548 41.2562 25.5215 40.1042 25.5215Z"
                      fill="#ECC80B" />
                    <path
                      d="M40.625 15.625C39.1854 15.625 37.9833 16.6083 37.6208 17.9333L27.2104 20.7104C26.6437 20.1438 25.8625 19.7917 25 19.7917C23.9958 19.7917 23.1125 20.275 22.5396 21.0125L12.2604 19.6417C11.7917 18.5083 10.6771 17.7083 9.375 17.7083C7.65208 17.7083 6.25 19.1104 6.25 20.8333C6.25 22.5563 7.65208 23.9583 9.375 23.9583C10.3792 23.9583 11.2625 23.475 11.8354 22.7375L22.1146 24.1083C22.5833 25.2417 23.6979 26.0417 25 26.0417C26.4396 26.0417 27.6417 25.0583 28.0042 23.7333L38.4146 20.9563C38.9812 21.5229 39.7625 21.875 40.625 21.875C42.3479 21.875 43.75 20.4729 43.75 18.75C43.75 17.0271 42.3479 15.625 40.625 15.625Z"
                      fill="#ECC80B" />
                  </svg>
                </div>
                <h2>Digital Marketing</h2>
                <p className="mb-0">Designed user interface contributes to a positive user experience, and a good user
                  experience.
                </p>
              </Link>

            </SwiperSlide>


            <div className="swiper-pagination-2"></div>
          </Swiper>
        </div>

        <div className="divider"></div>
      </div>
    </>
  );
};

export default ServiceArea;