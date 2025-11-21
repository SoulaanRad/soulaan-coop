import { NextRequest, NextResponse } from 'next/server';
import { setCsrfTokenCookie } from '@/lib/csrf';

/**
 * Generate a CSRF token and set it as a cookie
 * @route GET /api/auth/csrf
 */
export async function GET(request: NextRequest) {
  try {
    // Generate a new CSRF token and set it as a cookie
    const csrfToken = setCsrfTokenCookie();
    
    // Return the token to the client
    return NextResponse.json({ csrfToken });
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}
