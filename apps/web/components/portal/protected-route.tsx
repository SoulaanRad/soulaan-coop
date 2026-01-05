'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWeb3Auth } from '@/hooks/use-web3-auth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireProfile?: boolean;
}

export default function ProtectedRoute({
  children,
  requireProfile = true,
}: ProtectedRouteProps) {
  const router = useRouter();
  const { isLoading, isAuthenticated, hasProfile } = useWeb3Auth();

  useEffect(() => {
    // If not loading and not authenticated, redirect to admin login
    if (!isLoading && !isAuthenticated) {
      router.push('/admin/access-denied');
    }
    
    // If authenticated but no profile and profile is required, redirect to profile creation
    if (!isLoading && isAuthenticated && requireProfile && !hasProfile) {
      router.push('/admin/create-profile');
    }
  }, [isLoading, isAuthenticated, hasProfile, requireProfile, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-lg font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, don't render children
  if (!isAuthenticated) {
    return null;
  }

  // If profile is required but user doesn't have one, don't render children
  if (requireProfile && !hasProfile) {
    return null;
  }

  // If all checks pass, render children
  return <>{children}</>;
}
