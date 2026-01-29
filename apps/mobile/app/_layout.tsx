import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import 'react-native-reanimated';
import "../global.css"
import { PortalHost } from '@rn-primitives/portal';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/contexts/auth-context';
import { PaymentConfirmationProvider } from '@/components/payment-confirmation-provider';
import StripeWrapper from '@/components/providers/StripeWrapper';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5000,
    },
  },
});

export const unstable_settings = {
  anchor: 'onboarding',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <StripeWrapper>
        <AuthProvider>
          <PaymentConfirmationProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <Stack screenOptions={{ headerShown: false }}>
              </Stack>
              <StatusBar style="auto" />
              <PortalHost />
            </ThemeProvider>
          </PaymentConfirmationProvider>
        </AuthProvider>
      </StripeWrapper>
    </QueryClientProvider>
  );
}
