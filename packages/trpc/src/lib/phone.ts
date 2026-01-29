/**
 * Phone number utilities for E.164 format normalization
 * E.164 format: +[country code][number] e.g., +11234567890 for US
 */

/**
 * Convert a phone number to E.164 format
 * Assumes US numbers if no country code provided
 *
 * @param phone - Phone number in any format
 * @returns E.164 formatted phone number, or null if invalid
 */
export function toE164(phone: string | null | undefined): string | null {
  if (!phone) return null;

  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // If it starts with +, keep it
  if (cleaned.startsWith('+')) {
    // Already has country code, just ensure it's valid
    return cleaned;
  }

  // Remove leading 1 if present (US country code without +)
  if (cleaned.startsWith('1') && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }

  // If it's 10 digits, assume US and add +1
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }

  // If it's 11 digits starting with 1, add +
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }

  // Otherwise return with + prefix (assume international)
  if (!cleaned.startsWith('+')) {
    return `+${cleaned}`;
  }

  return cleaned;
}

/**
 * Validate that a phone number is in valid E.164 format
 * @param phone - Phone number to validate
 * @returns true if valid E.164 format
 */
export function isValidE164(phone: string | null | undefined): boolean {
  if (!phone) return false;
  // E.164: + followed by 7-15 digits
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

/**
 * Format a phone number for display (US format)
 * @param phone - E.164 phone number
 * @returns Formatted phone like (123) 456-7890
 */
export function formatPhoneForDisplay(phone: string | null | undefined): string {
  if (!phone) return '';

  // Remove + and country code for US numbers
  let digits = phone.replace(/\D/g, '');

  // If starts with 1 and is 11 digits, remove country code
  if (digits.startsWith('1') && digits.length === 11) {
    digits = digits.substring(1);
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // Return as-is for non-US numbers
  return phone;
}

/**
 * Normalize a phone number for searching
 * Returns multiple possible formats to match against
 *
 * @param phone - Phone number in any format
 * @returns Array of possible phone formats to search for
 */
export function normalizePhoneForSearch(phone: string): string[] {
  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // Always include the original cleaned input as a variant
  const variants: string[] = [cleaned];

  // Remove leading + for processing
  const hasPlus = cleaned.startsWith('+');
  if (hasPlus) {
    // Also add without the +
    variants.push(cleaned.substring(1));
    cleaned = cleaned.substring(1);
  } else {
    // Also try with + prefix
    variants.push(`+${cleaned}`);
  }

  // If 10 digits, assume US number - add +1 variant
  if (cleaned.length === 10) {
    variants.push(`+1${cleaned}`);  // E.164 US format
    variants.push(`1${cleaned}`);    // Without +
  }
  // If 11 digits starting with 1, US number with country code
  else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    variants.push(`+${cleaned}`);    // E.164 format
    variants.push(cleaned.substring(1)); // Without country code
  }

  // Remove duplicates
  return [...new Set(variants)];
}
