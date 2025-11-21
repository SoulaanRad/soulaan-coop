'use client';

import { useState } from 'react';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { useWeb3Auth } from '@/hooks/use-web3-auth';
import { Loader2 } from 'lucide-react';

export default function WalletAuth() {
  const { open } = useWeb3Modal();
  const { address, isConnected } = useAccount();
  const { isAuthenticated, isLoading, login, logout, error } = useWeb3Auth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Handle wallet connection and authentication
  const handleConnect = async () => {
    if (!isConnected) {
      await open();
    } else if (!isAuthenticated) {
      setIsAuthenticating(true);
      await login();
      setIsAuthenticating(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-slate-300">Loading...</span>
      </div>
    );
  }

  // Show authenticated state
  if (isAuthenticated) {
    return (
      <div className="flex items-center space-x-4">
        <p className="text-sm text-slate-300">
          Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
        </p>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Log Out
        </Button>
      </div>
    );
  }

  // Show connected but not authenticated state
  if (isConnected && !isAuthenticated) {
    return (
      <div className="flex items-center space-x-2">
        <p className="text-sm text-slate-300">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </p>
        <Button 
          size="sm" 
          onClick={handleConnect} 
          disabled={isAuthenticating}
        >
          {isAuthenticating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing...
            </>
          ) : (
            'Sign In'
          )}
        </Button>
      </div>
    );
  }

  // Show connect wallet button
  return (
    <div className="flex items-center space-x-2">
      <Button size="sm" onClick={handleConnect}>
        Connect Wallet
      </Button>
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
