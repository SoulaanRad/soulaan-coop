'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useWeb3Auth } from '@/hooks/use-web3-auth';
import ProfileForm from '@/components/admin/profile-form';
import { Loader2 } from 'lucide-react';

export default function CreateProfilePage() {
  const router = useRouter();
  const params = useParams();
  const coopId = params.coopId as string;
  const { isLoading, isAuthenticated, hasProfile } = useWeb3Auth();

  useEffect(() => {
    // If not loading and not authenticated, redirect to login
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?coopId=${coopId}`);
    }
    
    // If authenticated and already has profile, redirect to portal
    if (!isLoading && isAuthenticated && hasProfile) {
      router.push(`/portal/${coopId}`);
    }
  }, [isLoading, isAuthenticated, hasProfile, coopId, router]);

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

  // If authenticated but no profile, show profile form
  if (isAuthenticated && !hasProfile) {
    return (
      <div className="container mx-auto py-10">
        <ProfileForm coopId={coopId} />
      </div>
    );
  }

  // Default fallback (should not be visible due to redirects)
  return null;
}
