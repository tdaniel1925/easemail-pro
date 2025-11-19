
import Link from 'next/link';
import React from 'react';

const BlogArea = () => {
  return (
    <>
      <div className="blog-wrapper">
        <div className="divider"></div>

        <div className="container">
          <div className="row justify-content-center">
            <div className="col-12 col-lg-7">
              <div className="section-heading text-center">
                <h2 className="mb-0">Read Our Articles and News</h2>
              </div>
            </div>
          </div>
        </div>

        <div className="divider-sm"></div>

        <div className="container">
          <div className="row g-4">


            <div className="col-12 col-md-6 col-lg-4">
              <div className="blog-card-two">
                <img src="/assets/img/bg-img/28.png" alt="" />
                <div className="blog-content">
                  <div className="blog-meta d-flex align-items-center">
                    <a href="#">March 26, 24</a>
                    <div className="dot"></div>
                    <a href="#">Branding</a>
                  </div>
                  <Link className="post-title" href="/blog-details">Providing brilliant ideas For your business</Link>
                </div>
              </div>
            </div>


            <div className="col-12 col-md-6 col-lg-4">
              <div className="blog-card-two">
                <img src="/assets/img/bg-img/29.png" alt="" />
                <div className="blog-content">
                  <div className="blog-meta d-flex align-items-center">
                    <a href="#">March 26, 24</a>
                    <div className="dot"></div>
                    <a href="#">Branding</a>
                  </div>
                  <Link className="post-title" href="/blog-details">Top tools for efficient web development</Link>
                </div>
              </div>
            </div>


            <div className="col-12 col-md-6 col-lg-4">
              <div className="blog-card-two">
                <img src="/assets/img/bg-img/30.png" alt="" />
                <div className="blog-content">
                  <div className="blog-meta d-flex align-items-center">
                    <a href="#">March 26, 24</a>
                    <div className="dot"></div>
                    <a href="#">Branding</a>
                  </div>
                  <Link className="post-title" href="/blog-details">The Role Of Color Theory In Web Design</Link>
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