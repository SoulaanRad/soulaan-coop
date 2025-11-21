'use client';

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Web3Provider } from "@/lib/web3-provider";
import { useWeb3Auth } from "@/hooks/use-web3-auth";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// Wallet Auth Component
function WalletAuth() {
  const router = useRouter();
  const { address, isAuthenticated, isLoading, logout } = useWeb3Auth();

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        <span className="text-sm text-slate-400">Loading...</span>
      </div>
    );
  }

  if (isAuthenticated && address) {
    return (
      <div className="flex items-center space-x-4">
        <p className="text-sm text-slate-300">
          {address.slice(0, 6)}...{address.slice(-4)}
        </p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={async () => {
            await logout();
            router.push('/login');
          }}
        >
          Log Out
        </Button>
      </div>
    );
  }

  return (
    <Button 
      size="sm" 
      onClick={() => router.push('/login')}
    >
      Log In
    </Button>
  );
}

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, hasProfile, isLoading } = useWeb3Auth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="mt-4 text-slate-400">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!hasProfile) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center">
        <h2 className="mb-4 text-xl font-bold">Profile Required</h2>
        <p className="mb-4 text-slate-400">
          Please complete your profile to access the portal.
        </p>
        <Button onClick={() => router.push('/login')}>
          Complete Profile
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}

function PortalLayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="sticky top-0 z-50 border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link href="/portal" className="text-xl font-bold text-white">
            Soulaan Co-op Portal
          </Link>
          <WalletAuth />
        </div>
      </header>
      <main>
        <ProtectedRoute>
          {children}
        </ProtectedRoute>
      </main>
    </div>
  );
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Web3Provider>
      <PortalLayoutContent>{children}</PortalLayoutContent>
    </Web3Provider>
  );
}