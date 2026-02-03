'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, ReactNode, useEffect } from 'react';
import { ThemeInitializer } from '@/components/theme/ThemeInitializer';
import { GlobalErrorBoundary } from '@/components/error/GlobalErrorBoundary';
import { initializeGlobalErrorHandlers } from '@/lib/utils/global-error-handlers';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  }));

  // Initialize global error handlers once on mount
  useEffect(() => {
    initializeGlobalErrorHandlers();
  }, []);

  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeInitializer />
        {children}
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
}

