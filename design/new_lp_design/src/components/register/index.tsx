
import Breacrumb from '@/common/Breacrumb';
import HeaderOne from '@/layouts/headers/HeaderOne';
import React from 'react';
import Cta2Area from '../homes/home/Cta2Area';
import FooterOne from '@/layouts/footers/FooterOne';
import RegisterArea from './RegisterArea';

const Register = () => {
  return (
    <>
      <HeaderOne />
      <Breacrumb title="Register" subtitle="Register" />
      <RegisterArea />
      <Cta2Area />
      <FooterOne />
    </>
  );
};

export default Register;