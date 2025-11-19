'use client';

import { useEffect } from 'react'; 
import 'jarallax/dist/jarallax.css';
import Count from '@/common/count';

const counter_data = [
  {
    count: 28,
    label: "Years of Experience",
    description: "It looks like you have a great starting point for describing your creative agency. Here's a refined.",
  },
  {
    count: 427,
    label: "Successful Projects",
    description: "It looks like you have a great starting point for describing your creative agency. Here's a refined.",
  },
  {
    count: 241,
    label: "Satisfied Customers",
    description: "It looks like you have a great starting point for describing your creative agency. Here's a refined.",
  }
];


const VideoArea = ({style_2} : any) => {
 
 
   
    useEffect(() => {
      if (typeof window !== "undefined") {
        // Importing jarallax dynamically
        import("jarallax").then(({ jarallax }) => {
          jarallax(document.querySelectorAll<HTMLElement>(".jarallax"), {
            speed: 0.6,
          });
        });
  
        // Video popup logic
        const videoPopup = document.getElementById("videoPopup") as HTMLDivElement | null;
        const videoFrame = document.getElementById("videoFrame") as HTMLIFrameElement | null;
        const closeBtn = document.getElementById("videoCloseButton") as HTMLSpanElement | null;
  
        if (videoPopup && videoFrame && closeBtn) {
          document.querySelectorAll<HTMLElement>(".video-btn").forEach((button) => {
            button.addEventListener("click", function () {
              const videoUrl = (this as HTMLElement).getAttribute("data-video");
              if (videoUrl) {
                let updatedUrl = videoUrl;
                if (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) {
                  updatedUrl += "?autoplay=1";
                } else if (videoUrl.includes("vimeo.com")) {
                  updatedUrl += "?autoplay=1";
                }
                videoFrame.src = updatedUrl;
                videoPopup.style.display = "flex";
              }
            });
          });
  
          // Close button functionality
          closeBtn.onclick = () => {
            videoPopup.style.display = "none";
            videoFrame.src = "";
          };
  
          // Clicking outside of the video popup closes it
          window.onclick = (event: MouseEvent) => {
            if (event.target === videoPopup) {
              videoPopup.style.display = "none";
              videoFrame.src = "";
            }
          };
        }
      }
    }, []);


  return (
    <>

    {style_2 ? null : 
      <div id="videoPopup" className="video-popup-iframe" style={{ zIndex: "9999" }}>
        <div className="video-content">
          <span className="close-btn" id="videoCloseButton">&times;</span>
          <div className="ratio ratio-16x9">
            <iframe id="videoFrame" allowFullScreen></iframe>
          </div>
        </div>
      </div>
    
    }



      <div className="cta-video-wrapper">
        {style_2 ? <div className="divider"></div> : null} 
        <div className="container">
          {style_2 ? null :
          <div className="video-wrap bg-img" style={{ backgroundImage: `url(/assets/img/bg-img/11.jpg)` }}>
            <div className="video-popup">
              <div className="popup-video">
                <div className="video-btn" data-video="https://player.vimeo.com/video/1004501259">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <g clipPath="url(#clip0_1_434)">
                      <path
                        d="M5.10545 0.529181C2.94172 -0.711968 1.1875 0.304796 1.1875 2.79837V21.1999C1.1875 23.6959 2.94172 24.7114 5.10545 23.4714L21.1893 14.2474C23.3538 13.0059 23.3538 10.9943 21.1893 9.753L5.10545 0.529181Z"
                        fill="#0E0E0E" />
                    </g>
                    <defs>
                      <clipPath id="clip0_1_434">
                        <rect width="24" height="24" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                  <span className="video-sonar"></span>
                </div>
              </div>
            </div>
          </div>
          
          }

          <div className="row g-4 g-lg-5">
            {counter_data.map((item, i) => (
              <div key={i} className="col-12 col-md-4">
                <div className="cta-content">
                  <h2 className="mb-3"><span className="counter">
                    <Count number={item.count} text="+" />
                    </span></h2>
                  <h4>{item.label}</h4>
                  <p className="mb-0">{item.description}</p>
                </div>
              </div>
            ))} 
          </div>
        </div>

        <div className="divider"></div>
      </div>
    </>
  );
};

export default VideoArea;