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

/**
 * Returns true when a hex color is too light to use as a button background on
 * a white page (relative luminance > 0.85).  Prevents white-on-white buttons.
 */
function isColorTooLight(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return true;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.85;
}

/**
 * Returns white (#ffffff) or near-black (#1a1a1a) depending on which gives
 * better contrast against the given hex background.
 */
function contrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return '#ffffff';
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#1a1a1a' : '#ffffff';
}

export default async function CoopPublicLayout({
  children,
  params,
}: CoopPublicLayoutProps) {
  const { coopId } = await params;
  const config = await getCoopTheme(coopId);

  const DEFAULT_ACCENT = '#d97706';
  const DEFAULT_BG = '#ea580c';

  // Accept hex values; fall back to amber/orange if absent, stored as a
  // Tailwind class name, or resolves to a colour that would be invisible on a
  // white background.
  const rawAccent = config?.accentColor?.startsWith('#') ? config.accentColor : DEFAULT_ACCENT;
  const accentColor = isColorTooLight(rawAccent) ? DEFAULT_ACCENT : rawAccent;
  const accentForeground = contrastColor(accentColor);

  const rawBg = config?.bgColor?.startsWith('#') ? config.bgColor : DEFAULT_BG;
  const bgColor = isColorTooLight(rawBg) ? DEFAULT_BG : rawBg;

  return (
    <CartProvider coopId={coopId}>
      <div
        style={
          {
            '--coop-accent': accentColor,
            '--coop-accent-foreground': accentForeground,
            '--coop-bg': bgColor,
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </CartProvider>
  );
}
