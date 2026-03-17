import { ReactNode } from 'react';
import { StripeProvider } from '@stripe/stripe-react-native';
import { env } from '@/env';

const STRIPE_PUBLISHABLE_KEY = env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

interface StripeWrapperProps {
  children: ReactNode;
}

// Native version - wraps with StripeProvider
export default function StripeWrapper({ children }: StripeWrapperProps) {
  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
      {children}
    </StripeProvider>
  );
}
