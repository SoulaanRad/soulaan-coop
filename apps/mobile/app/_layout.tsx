import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import "../global.css"
import { PortalHost } from '@rn-primitives/portal';
import { StripeProvider } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';

import { useColorScheme } from '@/hooks/use-color-scheme';

const STRIPE_PUBLISHABLE_KEY = Constants.expoConfig?.extra?.stripePublishableKey || process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

export const unstable_settings = {
  anchor: 'onboarding',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
        </Stack>
        <StatusBar style="auto" />
        <PortalHost />
      </ThemeProvider>
    </StripeProvider>
  );
}
