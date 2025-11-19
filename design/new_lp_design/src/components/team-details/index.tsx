
import Breacrumb from '@/common/Breacrumb';
import HeaderOne from '@/layouts/headers/HeaderOne';
import React from 'react';
import Cta2Area from '../homes/home/Cta2Area';
import FooterOne from '@/layouts/footers/FooterOne';
import TeamDetailsArea from './TeamDetailsArea';

const TeamDetails = () => {
  return (
    <>
      <HeaderOne />
      <Breacrumb title="Expert Team" subtitle="Team" />
      <TeamDetailsArea /> 
      <Cta2Area />
      <FooterOne />
    </>
  );
};

export default TeamDetails;