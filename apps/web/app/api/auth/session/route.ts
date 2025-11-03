import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/signature-verification';

/**
 * Get the current session
 * @route GET /api/auth/session
 */
export async function GET(request: NextRequest) {
  try {
    // Get the current session
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({
        isLoggedIn: false,
      });
    }
    
    // Return the session info
    return NextResponse.json({
      isLoggedIn: true,
      address: session.address,
      hasProfile: session.hasProfile,
    });
  } catch (error) {
    console.error('Error getting session:', error);
    return NextResponse.json(
      { error: 'Failed to get session' },
      { status: 500 }
    );
  }
}
