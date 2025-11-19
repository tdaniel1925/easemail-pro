
import React from 'react';
import Link from 'next/link';
import Breacrumb from '@/common/Breacrumb';
import Cta2Area from '../homes/home/Cta2Area';
import HeaderOne from '@/layouts/headers/HeaderOne';
import FooterOne from '@/layouts/footers/FooterOne';

const ErrorArea = () => {
  return (
    <>
      <HeaderOne />
      <Breacrumb title="Error" subtitle="Error" />
      <div className="error-content text-center">
        <div className="divider"></div>

        <div className="container">
          <div className="row">
            <div className="col-12">
              <div className="d-flex justify-content-center">
                <img className="pb-2 dark-mode-404" src="/assets/img/core-img/404.png" alt="" />
                <img className="pb-2 light-mode-404" src="/assets/img/core-img/404-light.png" alt="" />
              </div>
              <div className="section-heading mt-5">
                <h2 className="mb-4">Look Like You're Lost</h2>
                <p>The link you followed probably broken or the page has been removed</p>
                <Link href="/" className="btn btn-primary mt-5"><span>BACK TO HOME</span><span>BACK TO
                  HOME</span></Link>
              </div>
            </div>
          </div>
        </div>

        <div className="divider"></div>
      </div>
      <Cta2Area />
      <FooterOne />

    </>
  );
};

export default ErrorArea;