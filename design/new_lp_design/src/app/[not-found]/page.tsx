
import ErrorArea from '@/components/error';
import Wrapper from '@/layouts/Wrapper';
import React from 'react';

export const metadata = {
	title: "404 Error || Vorix - Creative Digital Agency Next js Template",
	description: "Vorix - Creative Digital Agency HTML Template", 
};



const index = () => {
  return (
    <Wrapper>
      <ErrorArea />      
    </Wrapper>
  );
};

export default index;