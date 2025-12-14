'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';

// Force client-side rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

type OnboardingStep = 'connect' | 'verify' | 'profile' | 'complete';

export default function LoginPage() {
  const router = useRouter();
  const { open } = useWeb3Modal();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('connect');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_hasSoulaaniCoin, setHasSoulaaniCoin] = useState(false);
  
  // Profile form state
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
  });

  // Auto-advance to verify step when wallet is connected
  useEffect(() => {
    if (isConnected && address && currentStep === 'connect') {
      setCurrentStep('verify');
    }
  }, [isConnected, address, currentStep]);

  // Step 1: Connect Wallet
  const handleConnectWallet = async () => {
    try {
      await open();
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    }
  };

  // Step 2: Verify SoulaaniCoin and Authenticate
  const handleVerifySoulaaniCoin = async () => {
    if (!address) {
      setError('No wallet connected');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Step 1: Get challenge from server
      const challengeResponse = await fetch('/api/auth/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      
      if (!challengeResponse.ok) {
        const errorData = await challengeResponse.json();
        throw new Error(errorData.error || 'Failed to get challenge');
      }
      
      const { message } = await challengeResponse.json();
      
      // Step 2: Sign the challenge with wallet
      const signature = await signMessageAsync({ message });
      
      // Step 3: Verify signature and check SoulaaniCoin
      const verifyResponse = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature, message }),
      });
      
      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.error || 'Failed to verify signature');
      }
      
      const { hasProfile } = await verifyResponse.json();
      
      setHasSoulaaniCoin(true);
      
      // Check if user already has a profile
      if (hasProfile) {
        setCurrentStep('complete');
      } else {
        setCurrentStep('profile');
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      setError(err.message || 'Failed to verify SoulaaniCoin');
      
      // If verification failed, disconnect wallet
      disconnect();
      setCurrentStep('connect');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Create Profile
  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address) {
      setError('No wallet connected');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Validate form
      if (!profileData.name || !profileData.phoneNumber) {
        throw new Error('Please fill in all required fields');
      }
      
      // Create profile via API
      const response = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          ...profileData,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create profile');
      }
      
      setCurrentStep('complete');
    } catch (err: any) {
      setError(err.message || 'Failed to create profile');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 4: Complete - Redirect to Portal
  const handleComplete = () => {
    router.push('/portal');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to Soulaan Co-op Portal</CardTitle>
          <CardDescription>
            Connect your wallet and complete onboarding to access the portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Progress Indicator */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex flex-col items-center">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                currentStep === 'connect' ? 'bg-blue-600 text-white' :
                ['verify', 'profile', 'complete'].includes(currentStep) ? 'bg-green-600 text-white' :
                'bg-gray-300 text-gray-600'
              }`}>
                {['verify', 'profile', 'complete'].includes(currentStep) ? <CheckCircle className="h-5 w-5" /> : '1'}
              </div>
              <span className="mt-1 text-xs">Connect</span>
            </div>
            <div className="h-0.5 flex-1 bg-gray-300 mx-2" />
            <div className="flex flex-col items-center">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                currentStep === 'verify' ? 'bg-blue-600 text-white' :
                ['profile', 'complete'].includes(currentStep) ? 'bg-green-600 text-white' :
                'bg-gray-300 text-gray-600'
              }`}>
                {['profile', 'complete'].includes(currentStep) ? <CheckCircle className="h-5 w-5" /> : '2'}
              </div>
              <span className="mt-1 text-xs">Verify</span>
            </div>
            <div className="h-0.5 flex-1 bg-gray-300 mx-2" />
            <div className="flex flex-col items-center">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                currentStep === 'profile' ? 'bg-blue-600 text-white' :
                currentStep === 'complete' ? 'bg-green-600 text-white' :
                'bg-gray-300 text-gray-600'
              }`}>
                {currentStep === 'complete' ? <CheckCircle className="h-5 w-5" /> : '3'}
              </div>
              <span className="mt-1 text-xs">Profile</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Step 1: Connect Wallet */}
          {currentStep === 'connect' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Connect your Ethereum wallet to get started. Make sure you have SoulaaniCoin (SC) in your wallet.
              </p>
              <Button 
                onClick={handleConnectWallet} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect Wallet'
                )}
              </Button>
            </div>
          )}

          {/* Step 2: Verify SoulaaniCoin */}
          {currentStep === 'verify' && (
            <div className="space-y-4">
              <div className="rounded-md bg-blue-50 p-3">
                <p className="text-sm text-blue-800">
                  <strong>Wallet Connected:</strong> {address?.slice(0, 6)}...{address?.slice(-4)}
                </p>
              </div>
              <p className="text-sm text-gray-600">
                Sign a message to verify your wallet ownership and check your SoulaaniCoin balance.
              </p>
              <Button 
                onClick={handleVerifySoulaaniCoin} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Sign & Verify'
                )}
              </Button>
            </div>
          )}

          {/* Step 3: Create Profile */}
          {currentStep === 'profile' && (
            <form onSubmit={handleCreateProfile} className="space-y-4">
              <div className="rounded-md bg-green-50 p-3">
                <p className="text-sm text-green-800">
                  ✓ SoulaaniCoin verified! You're an active member.
                </p>
              </div>
              <p className="text-sm text-gray-600">
                Complete your profile to access the portal.
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number *</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="(123) 456-7890"
                  value={profileData.phoneNumber}
                  onChange={(e) => setProfileData({ ...profileData, phoneNumber: e.target.value })}
                  required
                />
              </div>

              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Profile...
                  </>
                ) : (
                  'Create Profile'
                )}
              </Button>
            </form>
          )}

          {/* Step 4: Complete */}
          {currentStep === 'complete' && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold">All Set!</h3>
              <p className="text-sm text-gray-600">
                Your profile has been created successfully. You can now access the portal.
              </p>
              <Button onClick={handleComplete} className="w-full">
                Go to Portal
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}