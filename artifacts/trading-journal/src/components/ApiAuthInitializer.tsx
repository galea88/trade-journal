"use client";

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { setAuthTokenGetter } from '@workspace/api-client-react'; 

export function ApiAuthInitializer({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth(); 

  useEffect(() => {
    setAuthTokenGetter(async () => {
      return await getToken();
    });
  }, [getToken]);

  return <>{children}</>;
}
