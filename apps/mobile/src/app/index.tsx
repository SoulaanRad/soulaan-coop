import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import OnboardingFlow from '@/components/OnboardingFlow';
import { View } from 'react-native';

export default function LaunchScreen() {
  const router = useRouter();

  const handleOnboardingComplete = () => {
    // Navigate to the main app after onboarding is complete
    router.replace('/(tabs)');
  };

  const handleSkipOnboarding = () => {
    // Navigate to the main app if user skips onboarding
    router.replace('/(tabs)');
  };

  useEffect(() => {
    console.log('LaunchScreen');
    // Always show onboarding first
    router.replace('/onboarding');
  }, []);

  // Don't render anything while navigating
  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          title: '',
          headerBackVisible: false,
        }} 
      />
      <View style={{ flex: 1 }}>
        <OnboardingFlow 
          onComplete={handleOnboardingComplete} 
          onSkip={handleSkipOnboarding} 
        />
      </View>
    </>
  );
}
