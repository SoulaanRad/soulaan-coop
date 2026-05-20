import { ReactElement } from 'react';
import { StripeProvider } from '@stripe/stripe-react-native';

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

interface StripeWrapperProps {
  children: ReactElement | ReactElement[];
}

// Native version - wraps with StripeProvider
export default function StripeWrapper({ children }: StripeWrapperProps) {
  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY} urlScheme="coop">
      {children}
    </StripeProvider>
  );
}
