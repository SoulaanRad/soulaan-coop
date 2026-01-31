import { ReactNode } from 'react';

interface StripeWrapperProps {
  children: ReactNode;
}

// Web version - no Stripe provider needed (handled by Elements in CardInput.web.tsx)
export default function StripeWrapper({ children }: StripeWrapperProps) {
  return <>{children}</>;
}
