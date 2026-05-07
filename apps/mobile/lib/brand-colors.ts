const COLOR_MAP: Record<string, string> = {
  'amber-600': '#D97706',
  'blue-600': '#2563EB',
  'green-600': '#16A34A',
  'purple-600': '#9333EA',
  'red-700': '#B91C1C',
  'teal-700': '#0F766E',
  'gray-900': '#111827',
};

export function resolveBrandColor(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  const normalized = value.replace(/^bg-/, '').replace(/^text-/, '');
  if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl')) {
    return value;
  }
  return COLOR_MAP[normalized] || fallback;
}

export function withAlpha(color: string, alpha: string, fallback = '#ECFDF5') {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) {
    return `${color}${alpha}`;
  }
  return fallback;
}
