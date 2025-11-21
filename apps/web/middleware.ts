import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { db } from '@repo/db';
import { validateCsrfToken } from './lib/csrf';
import { AuthSession } from './lib/signature-verification';

// Define protected API routes
const PROTECTED_API_ROUTES = [
  '/api/admin/',
  '/api/members/',
  '/api/redemptions/',
];

// Define state-changing methods that require CSRF protection
const STATE_CHANGING_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];

// Session options
const sessionOptions = {
  password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long',
  cookieName: 'soulaan_auth_session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 60 * 60 * 24 * 7, // 1 week
  },
};

// Rate limiting map (in-memory for development, should use Redis in production)
const rateLimitMap = new Map<string, { count: number, resetAt: number }>();

// Rate limit configuration
const RATE_LIMIT = 10; // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Check if the request is for a protected API route
  const isProtectedApiRoute = PROTECTED_API_ROUTES.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );
  
  // Skip middleware for non-protected routes
  if (!isProtectedApiRoute) {
    return response;
  }
  
  // Apply rate limiting
  const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  
  // Get or create rate limit entry
  let rateLimit = rateLimitMap.get(clientIp);
  if (!rateLimit || rateLimit.resetAt < now) {
    rateLimit = { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
    rateLimitMap.set(clientIp, rateLimit);
  }
  
  // Increment count
  rateLimit.count++;
  
  // Check if rate limit exceeded
  if (rateLimit.count > RATE_LIMIT) {
    return new NextResponse(
      JSON.stringify({ error: 'Rate limit exceeded' }),
      { 
        status: 429, 
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((rateLimit.resetAt - now) / 1000))
        }
      }
    );
  }
  
  // Check CSRF token for state-changing requests
  if (STATE_CHANGING_METHODS.includes(request.method)) {
    const isValidCsrf = validateCsrfToken(request);
    
    if (!isValidCsrf) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid CSRF token' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
  
  // Get session
  const cookieStore = cookies();
  const session = await getIronSession<AuthSession>(cookieStore, sessionOptions);
  
  // Check if authenticated
  if (!session.isLoggedIn || !session.address) {
    return new NextResponse(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  // Check if user has a profile
  const profile = await db.userProfile.findUnique({
    where: { walletAddress: session.address },
  });
  
  if (!profile) {
    return new NextResponse(
      JSON.stringify({ error: 'Profile not found' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  // Check if SoulaaniCoin balance is still valid (if last check was more than 1 day ago)
  const lastBalanceCheck = profile.lastBalanceCheck;
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  
  if (!lastBalanceCheck || lastBalanceCheck < oneDayAgo) {
    // TODO: Implement actual balance check with contract
    // For now, just update the lastBalanceCheck timestamp
    await db.userProfile.update({
      where: { walletAddress: session.address },
      data: { lastBalanceCheck: new Date() },
    });
  }
  
  // Add user info to request headers for downstream handlers
  response.headers.set('X-User-Address', session.address);
  response.headers.set('X-User-Role', profile.role);
  
  return response;
}

// Configure the middleware to run only for API routes
export const config = {
  matcher: ['/api/:path*'],
};