import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@repo/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { flag: string } }
) {
  try {
    const flagKey = params.flag.toUpperCase().replace(/-/g, '_');
    
    const featureFlag = await db.featureFlag.findUnique({
      where: { key: flagKey },
    });

    return NextResponse.json({
      enabled: featureFlag?.enabled || false,
      key: flagKey,
    });
  } catch (error) {
    console.error('Error checking feature flag:', error);
    return NextResponse.json(
      { enabled: false, error: 'Failed to check feature flag' },
      { status: 500 }
    );
  }
}
