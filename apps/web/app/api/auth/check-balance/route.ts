import { NextRequest, NextResponse } from 'next/server';
import { checkSoulaaniCoinBalance } from '@/lib/signature-verification';
import { z } from 'zod';

// Schema for request validation
const requestSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
});

/**
 * Check if a wallet has SoulaaniCoin
 * @route POST /api/auth/check-balance
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
    
    // Check if the wallet has SoulaaniCoin
    const hasSoulaaniCoin = await checkSoulaaniCoinBalance(address);
    
    // Return the result
    return NextResponse.json({ hasSoulaaniCoin });
  } catch (error) {
    console.error('Error checking SoulaaniCoin balance:', error);
    return NextResponse.json(
      { error: 'Failed to check SoulaaniCoin balance' },
      { status: 500 }
    );
  }
}
