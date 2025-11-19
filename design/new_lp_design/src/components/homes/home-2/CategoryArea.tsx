
// import React from 'react';
// import Marquee from "react-fast-marquee";


// const CategoryArea = () => {
//   return (
//     <>
//       <div className="catagory-slide" id="catagorySlide">
//         <div className="marquee3k" data-speed="1">
//           <Marquee>
//             <h2 className="d-flex align-items-center mb-0">
//               <span>#</span>
//               <span>Web Design</span>
//               <span>#</span>
//               <span>Web Development</span>
//               <span>#</span>
//               <span>UI/UX Design</span>
//             </h2>
//           </Marquee>
//         </div>
//       </div>
//     </>
//   );
// };

// export default CategoryArea;
 "use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const Marquee = dynamic(() => import("react-fast-marquee"), { ssr: false });

const CategoryArea = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null; // Prevents rendering on the server

  return (
    <div className="catagory-slide" id="catagorySlide">
      <div className="marquee3k" data-speed="1">
        <Marquee gradient={false} speed={50}>
          <h2 className="d-flex align-items-center mb-0">
            <span>#</span>
            <span>Web Design</span>
            <span>#</span>
            <span>Web Development</span>
            <span>#</span>
            <span>UI/UX Design</span>
          </h2>
        </Marquee>
      </div>
    </div>
  );
};

export default CategoryArea;

