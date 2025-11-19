
import React from 'react';
import BlogArea from './BlogArea';
import Breacrumb from '@/common/Breacrumb';
import Cta2Area from '../homes/home/Cta2Area';
import HeaderOne from '@/layouts/headers/HeaderOne';
import FooterOne from '@/layouts/footers/FooterOne';

const Blog = () => {
  return (
    <>
      <HeaderOne />
      <Breacrumb title="Blog" subtitle="Blog" />
      <BlogArea />
      <Cta2Area />
      <FooterOne />
    </>
  );
};

export default Blog;