  
import HeroArea from "./HeroArea";
import VideoArea from "./VideoArea";
import MissionArea from "./MissionArea";
import ServiceArea from "./ServiceArea";
import ProjectArea from "./ProjectArea";
import CategoryArea from "./CategoryArea";
import ProcessArea from "./ProcessArea";
import TeamArea from "./TeamArea";
import PriceArea from "./PriceArea";
import FaqArea from "./FaqArea";
import TestimonialArea from "./TestimonialArea";
import BlogArea from "./BlogArea";
import FooterOne from "@/layouts/footers/FooterOne";
import HeaderOne from "@/layouts/headers/HeaderOne";

const HomeTwo = () => {
	return (
		<>
			<HeaderOne style_2={true} />
      <HeroArea />
      <VideoArea />
      <MissionArea />
      <ServiceArea />
      <ProjectArea />
      <CategoryArea />
      <ProcessArea />
      <TeamArea />
      <PriceArea />
      <FaqArea />
      <TestimonialArea />
      <BlogArea />
      <FooterOne style_2={true} />
		</>
	);
};

export default HomeTwo;
