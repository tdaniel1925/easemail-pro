 
import Breacrumb from '@/common/Breacrumb';
import HeaderOne from '@/layouts/headers/HeaderOne';
import Cta2Area from '../homes/home/Cta2Area';
import AboutArea from '../homes/home/AboutArea';
import VideoArea from '../homes/home-2/VideoArea';
import WorkprocessArea from '../homes/home/WorkprocessArea';
import VideoAreaHomeOne from '../homes/home/VideoAreaHomeOne';
import TeamArea from '../homes/home-2/TeamArea';
import TestimonialArea from '../homes/home-2/TestimonialArea';
import FooterOne from '@/layouts/footers/FooterOne';

const Aboutus = () => {
  return (
    <>
      <HeaderOne />
      <Breacrumb title="About us" subtitle="About" />
      <AboutArea />
      <VideoArea style_2={true} />
      <WorkprocessArea />
      <VideoAreaHomeOne />
      <TeamArea />
      <TestimonialArea />
      <Cta2Area />
      <FooterOne />
    </>
  );
};

export default Aboutus;