'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { PropsWithChildren, useState } from 'react';

import { lambdaQuery, lambdaQueryClient } from '@/libs/trpc/client';

// 修复类型冲突
const TRPCProvider = lambdaQuery.Provider as any;

const QueryProvider = ({ children }: PropsWithChildren) => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <TRPCProvider client={lambdaQueryClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </TRPCProvider>
  );
};

export default QueryProvider;
