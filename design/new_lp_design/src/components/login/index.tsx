
import Breacrumb from '@/common/Breacrumb';
import HeaderOne from '@/layouts/headers/HeaderOne';
import React from 'react';
import Cta2Area from '../homes/home/Cta2Area';
import FooterOne from '@/layouts/footers/FooterOne';
import LoginArea from './LoginArea';

const Login = () => {
  return (
    <>
      <HeaderOne />
      <Breacrumb title="Login" subtitle="Login" />
      <LoginArea />
      <Cta2Area />
      <FooterOne />
    </>
  );
};

export default Login;