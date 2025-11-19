
import Link from 'next/link';
import React from 'react';

const TeamArea = () => {
  return (
    <>
      <div className="team-member-wrap">
        <div className="divider"></div>

        <div className="container">
          <div className="row g-4 g-lg-5">


            <div className="col-12 col-sm-6 col-lg-4">
              <Link href="/team-details">
                <div className="team-card">
                  <img src="/assets/img/bg-img/22.jpg" alt="" />
                  <div className="team-info">
                    <h4>Daniyel Karlos</h4>
                    <p className="mb-0">Web Developer</p>
                  </div>
                </div>
              </Link>
            </div>


            <div className="col-12 col-sm-6 col-lg-4">
              <Link href="/team-details">
                <div className="team-card">
                  <img src="/assets/img/bg-img/23.jpg" alt="" />
                  <div className="team-info">
                    <h4>Reece Bronson</h4>
                    <p className="mb-0">Sr. Director</p>
                  </div>
                </div>
              </Link>
            </div>


            <div className="col-12 col-sm-6 col-lg-4">
              <Link href="/team-details">
                <div className="team-card">
                  <img src="/assets/img/bg-img/24.jpg" alt="" />
                  <div className="team-info">
                    <h4>Steve Liddle</h4>
                    <p className="mb-0">Web Developer</p>
                  </div>
                </div>
              </Link>
            </div>


            <div className="col-12 col-sm-6 col-lg-4">
              <Link href="/team-details">
                <div className="team-card">
                  <img src="/assets/img/bg-img/25.jpg" alt="" />
                  <div className="team-info">
                    <h4>Ryan Williams</h4>
                    <p className="mb-0">CEO & Founder</p>
                  </div>
                </div>
              </Link>
            </div>


            <div className="col-12 col-sm-6 col-lg-4">
              <Link href="/team-details">
                <div className="team-card">
                  <img src="/assets/img/bg-img/39.jpg" alt="" />
                  <div className="team-info">
                    <h4>Steven A. Urenda</h4>
                    <p className="mb-0">Sr. Director</p>
                  </div>
                </div>
              </Link>
            </div>


            <div className="col-12 col-sm-6 col-lg-4">
              <Link href="/team-details">
                <div className="team-card">
                  <img src="/assets/img/bg-img/40.jpg" alt="" />
                  <div className="team-info">
                    <h4>Jhone Mathus</h4>
                    <p className="mb-0">Web Designer</p>
                  </div>
                </div>
              </Link>
            </div>

          </div>
        </div>

        <div className="divider"></div>
      </div>
    </>
  );
};

export default TeamArea;