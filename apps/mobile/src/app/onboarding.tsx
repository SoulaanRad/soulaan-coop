import React from 'react';
import { View } from 'react-native';
import OnboardingFlow from '@/components/OnboardingFlow';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';

export default function OnboardingScreen() {
  const router = useRouter();

  const handleOnboardingComplete = () => {
    // Navigate to the main app after onboarding is complete
    router.replace('/(tabs)');
  };

  const handleSkipOnboarding = () => {
    // Navigate to the main app if user skips onboarding
    router.replace('/(tabs)');
  };

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
