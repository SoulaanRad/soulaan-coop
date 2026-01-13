import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifySignature, createSession, checkSoulaaniCoinBalance } from '@/lib/signature-verification';
import { z } from 'zod';

// Schema for request validation
const requestSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  signature: z.string(),
  message: z.string(),
});

/**
 * Verify a signature and create a session
 * @route POST /api/auth/verify
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate the request body
    const body = await request.json();
    const result = requestSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: result.error.format() },
        { status: 400 }
      );
    }
    
    const { address, signature, message } = result.data;
    
    // Verify the signature
    const isValid = await verifySignature(address, signature, message);
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }
    
    // Check if the wallet has SoulaaniCoin and is an active member
    const hasSoulaaniCoin = await checkSoulaaniCoinBalance(address);
    
    if (!hasSoulaaniCoin) {
      return NextResponse.json(
        { error: 'Wallet does not have SoulaaniCoin or is not an active member' },
        { status: 403 }
      );
    }
    
    // Create a session
    const session = await createSession(address);

    // Return the session info
    return NextResponse.json({
      success: true,
      address,
      hasProfile: session.hasProfile,
      isAdmin: session.isAdmin || false,
      adminRole: session.adminRole || null,
    });
  } catch (error) {
    console.error('Error verifying signature:', error);
    return NextResponse.json(
      { error: 'Failed to verify signature' },
      { status: 500 }
    );
  }
}
