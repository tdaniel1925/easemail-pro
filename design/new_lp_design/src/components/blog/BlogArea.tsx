"use client"
import Link from 'next/link';
import React from 'react';

const BlogArea = () => {
  return (
    <>
         <div className="blog-page-wrap">
      <div className="divider"></div>

      <div className="container">
         <div className="row g-4 g-xl-5">
            <div className="col-12 col-md-7 col-lg-8">
               <div className="d-flex flex-column gap-5">

                   
                  <div className="single-blog">
                     <img src="/assets/img/bg-img/44.jpg" alt="" />
                     <div className="blog-meta d-flex align-items-center">
                        <a href="#">March 26, 24</a>
                        <div className="dot"></div>
                        <a href="#">Branding</a>
                     </div>
                     <Link className="post-title mb-5" href="/blog-details">Graphic Design Agency your Brand Needs</Link>
                     <Link href="/blog-details" className="btn btn-primary"><span>READ MORE</span><span>READ
                           MORE</span></Link>
                  </div>

                   
                  <div className="single-blog">
                     <img src="/assets/img/bg-img/45.jpg" alt="" />
                     <div className="blog-meta d-flex align-items-center">
                        <a href="#">March 26, 24</a>
                        <div className="dot"></div>
                        <a href="#">Branding</a>
                     </div>
                     <Link className="post-title mb-5" href="/blog-details">Providing Brilliant Ideas For your Business</Link>
                     <Link href="/blog-details" className="btn btn-primary"><span>READ MORE</span><span>READ
                           MORE</span></Link>
                  </div>

                   
                  <div className="single-blog">
                     <img src="/assets/img/bg-img/46.jpg" alt="" />
                     <div className="blog-meta d-flex align-items-center">
                        <a href="#">March 26, 24</a>
                        <div className="dot"></div>
                        <a href="#">Branding</a>
                     </div>
                     <Link className="post-title mb-5" href="/blog-details">The Latest Trends With Digital Marketing</Link>
                     <Link href="/blog-details" className="btn btn-primary"><span>READ MORE</span><span>READ
                           MORE</span></Link>
                  </div>

                   
                  <ul className="blog-pagination list-unstyled">
                     <li><a href="#">1</a></li>
                     <li><a href="#">2</a></li>
                     <li><a href="#">3</a></li>
                     <li className="active">
                        <a href="#">
                           <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"
                              fill="none">
                              <path
                                 d="M28.0613 17.0605L19.0613 26.0605C18.7795 26.3423 18.3973 26.5006 17.9988 26.5006C17.6002 26.5006 17.218 26.3423 16.9363 26.0605C16.6545 25.7787 16.4961 25.3965 16.4961 24.998C16.4961 24.5995 16.6545 24.2173 16.9363 23.9355L23.375 17.4992H5C4.60218 17.4992 4.22064 17.3412 3.93934 17.0599C3.65804 16.7786 3.5 16.3971 3.5 15.9992C3.5 15.6014 3.65804 15.2199 3.93934 14.9386C4.22064 14.6573 4.60218 14.4992 5 14.4992H23.375L16.9387 8.05924C16.657 7.77745 16.4986 7.39526 16.4986 6.99674C16.4986 6.59823 16.657 6.21603 16.9387 5.93424C17.2205 5.65245 17.6027 5.49414 18.0012 5.49414C18.3998 5.49414 18.782 5.65245 19.0637 5.93424L28.0637 14.9342C28.2036 15.0738 28.3145 15.2396 28.3901 15.4221C28.4657 15.6046 28.5045 15.8003 28.5043 15.9979C28.5041 16.1955 28.4648 16.391 28.3888 16.5734C28.3127 16.7557 28.2014 16.9213 28.0613 17.0605Z"
                                 fill="#0E0E0E" />
                           </svg>
                        </a>
                     </li>
                  </ul>
               </div>
            </div>

            <div className="col-12 col-md-5 col-lg-4">
               <div className="d-flex flex-column gap-5">
                   
                  <div className="blog-widget">
                     <h4 className="mb-4">Search Here</h4>
                      
                     <form onClick={(e) => e.preventDefault()}>
                        <input type="search" placeholder="Search..." className="form-control" />
                        <button type="submit">
                           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                              fill="none">
                              <path
                                 d="M5.81127 5.43613C8.9183 2.44107 13.5422 2.56045 16.4179 5.43613C19.1677 8.186 19.3359 12.54 16.9222 15.486L21.1908 19.755L20.1302 20.8157L15.8611 16.5471C12.9151 18.9607 8.56114 18.7926 5.81127 16.0427C2.93559 13.1671 2.80038 8.33851 5.81127 5.43613ZM15.3572 6.49679C13.0141 4.15364 9.21508 4.15364 6.87193 6.49679C4.52879 8.83993 4.52879 12.6389 6.87193 14.9821C9.21508 17.3252 13.0141 17.3252 15.3572 14.9821C17.7004 12.6389 17.7004 8.83993 15.3572 6.49679Z"
                                 fill="#0E0E0E" />
                           </svg>
                        </button>
                     </form>
                  </div>

                   
                  <div className="blog-widget">
                     <h4 className="mb-4">Categories</h4>

                     <ul className="blog-list">
                        <li>
                           <Link href="/blog-details">
                              Agency
                              <span>(03)</span>
                           </Link>
                        </li>
                        <li>
                           <Link href="/blog-details">
                              Business
                              <span>(01)</span>
                           </Link>
                        </li>
                        <li>
                           <Link href="/blog-details">
                              Development
                              <span>(05)</span>
                           </Link>
                        </li>
                        <li>
                           <Link href="/blog-details">
                              UI/UX Design
                              <span>(02)</span>
                           </Link>
                        </li>
                        <li>
                           <Link href="/blog-details">
                              Marketing
                              <span>(04)</span>
                           </Link>
                        </li>
                     </ul>
                  </div>

                   
                  <div className="blog-widget">
                     <h4 className="mb-4">Recent Post</h4>

                     <div className="d-flex flex-column gap-4">
                         
                        <div className="widget-blog-post">
                           <div className="blog-thumbnail">
                              <img src="/assets/img/bg-img/41.jpg" alt="" />
                           </div>
                           <div className="blog-content">
                              <h6><Link href="/blog-details">Graphic Design Agency your Brand Needs.</Link></h6>
                              <p className="mb-0">March 26, 2024</p>
                           </div>
                        </div>

                         
                        <div className="widget-blog-post">
                           <div className="blog-thumbnail">
                              <img src="/assets/img/bg-img/42.jpg" alt="" />
                           </div>
                           <div className="blog-content">
                              <h6><Link href="/blog-details">Providing Brilliant Ideas For your Business</Link></h6>
                              <p className="mb-0">March 26, 2024</p>
                           </div>
                        </div>

                         
                        <div className="widget-blog-post">
                           <div className="blog-thumbnail">
                              <img src="/assets/img/bg-img/43.jpg" alt="" />
                           </div>
                           <div className="blog-content">
                              <h6><Link href="/blog-details">The Latest Trends With Digital Marketing</Link></h6>
                              <p className="mb-0">March 26, 2024</p>
                           </div>
                        </div>
                     </div>
                  </div>

                   
                  <div className="blog-widget">
                     <h4 className="mb-4">Tag Cloud</h4>

                     <ul className="tag-list list-unstyled">
                        <li><a href="#">Agency</a></li>
                        <li><a href="#">Business</a></li>
                        <li><a href="#">Marketing</a></li>
                        <li><a href="#">Modern</a></li>
                        <li><a href="#">Creative</a></li>
                        <li><a href="#">Digital</a></li>
                        <li><a href="#">Design</a></li>
                        <li><a href="#">Awards</a></li>
                     </ul>
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

export default BlogArea;