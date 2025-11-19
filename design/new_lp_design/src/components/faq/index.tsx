
import React from 'react';
import FaqsArea from './FaqsArea';
import Breacrumb from '@/common/Breacrumb';
import Cta2Area from '../homes/home/Cta2Area';
import HeaderOne from '@/layouts/headers/HeaderOne';
import FooterOne from '@/layouts/footers/FooterOne';

const Faq = () => {
  return (
    <>
      <HeaderOne />
      <Breacrumb title="Faq" subtitle="Faq" />
      <FaqsArea />
      <Cta2Area />
      <FooterOne />
    </>
  );
};

export default Faq;