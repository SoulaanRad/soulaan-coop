import { NextRequest, NextResponse } from 'next/server';
import { generateChallenge } from '@/lib/signature-verification';
import { z } from 'zod';

// Schema for request validation
const requestSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
});

/**
 * Generate a challenge for wallet authentication
 * @route POST /api/auth/challenge
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
    
    const { address } = result.data;
    
    // Generate a challenge for the address
    const message = await generateChallenge(address);
    
    // Return the challenge message
    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error generating challenge:', error);
    return NextResponse.json(
      { error: 'Failed to generate challenge' },
      { status: 500 }
    );
  }
}
