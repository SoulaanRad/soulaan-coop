import type { ReactNode } from 'react';
import { CartProvider } from '@/contexts/cart-context';
import { env } from '@/env';

interface CoopPublicLayoutProps {
  children: ReactNode;
  params: Promise<{ coopId: string }>;
}

async function getCoopTheme(coopId: string) {
  try {
    const apiUrl = env.NEXT_PUBLIC_API_URL;
    const input = JSON.stringify({ coopId });
    const url = `${apiUrl}/coopConfig.getActive?input=${encodeURIComponent(input)}`;
    const response = await fetch(url, { method: 'GET', cache: 'no-store' });
    if (!response.ok) return null;
    const data = await response.json();
    return data.result.data;
  } catch {
    return null;
  }
}

export default async function CoopPublicLayout({
  children,
  params,
}: CoopPublicLayoutProps) {
  const { coopId } = await params;
  const config = await getCoopTheme(coopId);

  // Accept hex values; fall back to amber/orange if absent or stored as Tailwind class names
  const accentColor =
    config?.accentColor?.startsWith('#') ? config.accentColor : '#d97706';
  const bgColor =
    config?.bgColor?.startsWith('#') ? config.bgColor : '#ea580c';

  return (
    <CartProvider coopId={coopId}>
      <div
        style={
          {
            '--coop-accent': accentColor,
            '--coop-bg': bgColor,
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </CartProvider>
  );
}
