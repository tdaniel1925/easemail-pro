
import Link from 'next/link';
import React from 'react';

const TeamArea = () => {
  return (
    <>
      <div className="team-member-wrapper">
        <div className="divider"></div>

        <div className="container">
          <div className="row g-5">
            <div className="col-12 col-lg-5">
              <div className="section-heading">
                <h2 className="mb-4">Our Team Behind The Studio</h2>
                <Link href="/team" className="btn-link">VIEW ALL 16 MEMBERS <svg xmlns="http://www.w3.org/2000/svg"
                  width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M7 17L16.2 7.8M17 17V7H7" stroke="#ECC80B" stroke-width="2" stroke-linecap="square" />
                </svg></Link>
              </div>
            </div>

            <div className="col-12 col-lg-7">
              <div className="row g-4">


                <div className="col-12 col-sm-6">
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


                <div className="col-12 col-sm-6">
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


                <div className="col-12 col-sm-6">
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


                <div className="col-12 col-sm-6">
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

              </div>
            </div>
          </div>
        </div>

        <div className="divider"></div>
      </div>
    </>
  );
};

export default TeamArea;