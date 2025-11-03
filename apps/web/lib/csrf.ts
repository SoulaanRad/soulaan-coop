import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';

// CSRF token configuration
const CSRF_TOKEN_COOKIE = 'soulaan_csrf_token';
const CSRF_TOKEN_HEADER = 'X-CSRF-Token';
const CSRF_TOKEN_EXPIRY = 60 * 60 * 24; // 24 hours in seconds

/**
 * Generate a CSRF token
 * @returns The generated CSRF token
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Set a CSRF token cookie
 */
export function setCsrfTokenCookie(): string {
  const token = generateCsrfToken();
  
  cookies().set({
    name: CSRF_TOKEN_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: CSRF_TOKEN_EXPIRY,
    path: '/',
  });
  
  return token;
}

/**
 * Get the CSRF token from cookies
 * @returns The CSRF token or null if not found
 */
export function getCsrfTokenFromCookies(): string | null {
  const token = cookies().get(CSRF_TOKEN_COOKIE)?.value;
  return token || null;
}

/**
 * Validate a CSRF token
 * @param request The request to validate
 * @returns Boolean indicating if the token is valid
 */
export function validateCsrfToken(request: Request): boolean {
  const cookieToken = getCsrfTokenFromCookies();
  const headerToken = request.headers.get(CSRF_TOKEN_HEADER);
  
  if (!cookieToken || !headerToken) {
    return false;
  }
  
  // Use constant-time comparison to prevent timing attacks
  return timingSafeEqual(cookieToken, headerToken);
}

/**
 * Constant-time string comparison to prevent timing attacks
 * @param a First string
 * @param b Second string
 * @returns Boolean indicating if the strings are equal
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}