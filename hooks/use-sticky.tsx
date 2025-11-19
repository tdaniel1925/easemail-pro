/**
 * useSticky Hook
 * 
 * Detects when user scrolls past a threshold and returns sticky state.
 * Used for sticky header behavior in marketing pages.
 */

import { useEffect, useState } from 'react';

const useSticky = () => {
  const [sticky, setSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setSticky(scrollTop > 80);
    };

    window.addEventListener('scroll', handleScroll);
    
    // Clean up event listener
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return { sticky };
};

export default useSticky;

