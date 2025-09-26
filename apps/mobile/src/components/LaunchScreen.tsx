import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingFlow from './OnboardingFlow';

export default function LaunchScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
      if (hasSeenOnboarding === 'true') {
        setHasCompletedOnboarding(true);
      } else {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      // Default to showing onboarding if there's an error
      setShowOnboarding(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      setHasCompletedOnboarding(true);
      setShowOnboarding(false);
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  const handleSkipOnboarding = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      setHasCompletedOnboarding(true);
      setShowOnboarding(false);
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#D4AF37" />
        <Text className="mt-4 text-gray-600">Loading Soulaan...</Text>
      </View>
    );
  }

  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} onSkip={handleSkipOnboarding} />;
  }

  if (hasCompletedOnboarding) {
    // This is where you would show the main app
    // For now, we'll show a simple welcome screen
    return (
      <View className="flex-1 justify-center items-center bg-white p-6">
        <Text className="text-3xl font-bold text-gray-800 mb-4 text-center">
          Welcome to Soulaan
        </Text>
        <Text className="text-lg text-gray-600 mb-8 text-center">
          Building Black Economic Sovereignty Together
        </Text>
        <Text className="text-gray-500 text-center">
          Main app content would go here
        </Text>
      </View>
    );
  }

  return null;
}
