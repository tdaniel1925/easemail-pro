"use client" 

const MissionArea = () => {

  if(typeof window !== "undefined") {
    require("bootstrap/dist/js/bootstrap");
  }

 


  return (
    <>
      <div className="mission-vision-wrapper">
        <div className="divider"></div>

        <div className="container">
          <div className="row g-4 align-items-center">

            <div className="col-12 col-lg-6">
              <div className="mission-vision-img-container">
                <img src="/assets/img/bg-img/6.jpg" alt="" />

                <div className="experience">
                  <h3 className="mb-0">20+</h3>
                  <span>Years Experience</span>
                </div>
              </div>
            </div>


            <div className="col-12 col-lg-6">
              <div className="mission-vision-content">
                <h2>Digital Solutions Made Simple</h2>
                <p className="mb-4">Aliquam eu nunc imperdiet, volutpat mi vel, lobortis ligula. In lorem pharetra
                  dignissim lacus, faucibus volutpat lorem suscipit nec. vel Nunc fringilla arcu eu massa ornare
                  pharetra.</p>

                <div className="mission-vision-accordion">
                  <div className="accordion" id="missionVision">

                    <div className="accordion-item">
                      <h2 className="accordion-header">
                        <button className="accordion-button" type="button" data-bs-toggle="collapse"
                          data-bs-target="#collapseOne" aria-expanded="true" aria-controls="collapseOne">
                          Our Mission
                        </button>
                      </h2>
                      <div id="collapseOne" className="accordion-collapse collapse show"
                        data-bs-parent="#missionVision">
                        <div className="accordion-body">
                          Etiam id justo vitae lacus hendrerit ornare sit amet in justo. Donec non felis tempus
                          augue malesuada accumsan non nisl.Embrace growth with dynamic vitality.
                        </div>
                      </div>
                    </div>

                    <div className="accordion-item">
                      <h2 className="accordion-header">
                        <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse"
                          data-bs-target="#collapseTwo" aria-expanded="false" aria-controls="collapseTwo">
                          Our Vision
                        </button>
                      </h2>
                      <div id="collapseTwo" className="accordion-collapse collapse" data-bs-parent="#missionVision">
                        <div className="accordion-body">
                          Etiam id justo vitae lacus hendrerit ornare sit amet in justo. Donec non felis tempus
                          augue malesuada accumsan non nisl.Embrace growth with dynamic vitality.
                        </div>
                      </div>
                    </div>
                  </div>
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

export default MissionArea;