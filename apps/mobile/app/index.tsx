import { useEffect } from 'react';
import OnboardingFlow from '@/components/onboarding-flow';


export default function OnboardingScreen() {
  // Debug environment variables only once on mount
  useEffect(() => {
    console.log("EXPO_PUBLIC_API_BASE_URL:", process.env.EXPO_PUBLIC_API_BASE_URL);
    console.log("EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY:", process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY);
    console.log("EXPO_PUBLIC_COOP_ID:", process.env.EXPO_PUBLIC_COOP_ID);
  }, []);
  
  return <OnboardingFlow />;
}