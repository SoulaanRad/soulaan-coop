import type { ReactNode } from 'react';
import { CartProvider } from '@/contexts/cart-context';

interface CoopPublicLayoutProps {
  children: ReactNode;
  params: Promise<{ coopId: string }>;
}

export default async function CoopPublicLayout({
  children,
  params,
}: CoopPublicLayoutProps) {
  const { coopId } = await params;
  
  return (
    <CartProvider coopId={coopId}>
      {children}
    </CartProvider>
  );
}
