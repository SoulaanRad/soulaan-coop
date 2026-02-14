import React, { useState, useEffect, ReactNode } from 'react';
import { PaymentConfirmationModal } from './payment-confirmation-modal';
import { paymentConfirmationService, PaymentConfirmationData } from '@/lib/payment-confirmation-service';

interface PaymentConfirmationProviderProps {
  children: ReactNode;
}

export function PaymentConfirmationProvider({ children }: PaymentConfirmationProviderProps) {
  const [visible, setVisible] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentConfirmationData>({ amount: '' });
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  useEffect(() => {
    // Register the confirmation handler
    const handler = (data: PaymentConfirmationData): Promise<boolean> => {
      return new Promise((resolve) => {
        setPaymentData(data);
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
        amount={paymentData.amount}
        processorFee={paymentData.processorFee}
        fromBalance={paymentData.fromBalance}
        fromCard={paymentData.fromCard}
        total={paymentData.total}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
}
