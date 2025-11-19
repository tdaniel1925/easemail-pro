
import Breacrumb from '@/common/Breacrumb';
import HeaderOne from '@/layouts/headers/HeaderOne';
import React from 'react';
import Cta2Area from '../homes/home/Cta2Area';
import FooterOne from '@/layouts/footers/FooterOne';
import ServiceDetailsArea from './ServiceDetailsArea';

const ServiceDetails = () => {
  return (
    <>
      <HeaderOne />
      <Breacrumb title="Service Details" subtitle="Service Details" />
      <ServiceDetailsArea />
      <Cta2Area />
      <FooterOne />
    </>
  );
};

export default ServiceDetails;