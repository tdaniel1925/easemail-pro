// "use client";
import ScrollToTop from "@/common/ScrollToTop"; 

 

const Wrapper = ({ children }: any) => {
 
	return <>

  {children}
  <ScrollToTop />
  </>;
};

export default Wrapper;
