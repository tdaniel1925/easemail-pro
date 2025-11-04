'use client';

import { ReactNode } from 'react';

export function DashboardProviders({ 
  children, 
  userId 
}: { 
  children: ReactNode; 
  userId: string;
}) {
  return (
    <>
      {children}
    </>
  );
}

