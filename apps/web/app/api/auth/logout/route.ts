import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/signature-verification';

/**
 * Logout and destroy the current session
 * @route POST /api/auth/logout
 */
export async function POST(_request: NextRequest) {
  try {
    // Destroy the session
    await destroySession();
    
    // Return success
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging out:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}
