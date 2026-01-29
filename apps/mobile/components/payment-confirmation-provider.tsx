import React, { useState, useEffect, ReactNode } from 'react';
import { PaymentConfirmationModal } from './payment-confirmation-modal';
import { paymentConfirmationService } from '@/lib/payment-confirmation-service';

interface PaymentConfirmationProviderProps {
  children: ReactNode;
}

export function PaymentConfirmationProvider({ children }: PaymentConfirmationProviderProps) {
  const [visible, setVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  useEffect(() => {
    // Register the confirmation handler
    const handler = (paymentAmount: string): Promise<boolean> => {
      return new Promise((resolve) => {
        setAmount(paymentAmount);
        setVisible(true);
        setResolver(() => resolve);
      });
    };

    paymentConfirmationService.register(handler);

    // Cleanup on unmount
    return () => {
      paymentConfirmationService.unregister();
    };
  }, []);

  const handleConfirm = () => {
    setVisible(false);
    if (resolver) {
      resolver(true);
      setResolver(null);
    }
  };

  const handleCancel = () => {
    setVisible(false);
    if (resolver) {
      resolver(false);
      setResolver(null);
    }
  };

  return (
    <>
      {children}
      <PaymentConfirmationModal
        visible={visible}
        amount={amount}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
}
