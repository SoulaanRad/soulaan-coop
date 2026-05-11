import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '~/env';

const requestCodeSchema = z.object({
  email: z.string().email(),
  coopId: z.string().min(1).default('soulaan'),
});

function getApiTrpcUrl() {
  const apiUrl = env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/trpc';
  return apiUrl.endsWith('/trpc')
    ? apiUrl
    : `${apiUrl.replace(/\/$/, '')}/trpc`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = requestCodeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Enter a valid email address.' },
        { status: 400 }
      );
    }

    const email = result.data.email.trim().toLowerCase();
    const coopId = result.data.coopId;

    const apiResponse = await fetch(`${getApiTrpcUrl()}/auth.requestLoginCode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, coopId }),
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok || !data.result?.data?.success) {
      return NextResponse.json(
        { error: data.error?.message || 'Failed to send login code.' },
        { status: apiResponse.ok ? 400 : apiResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: data.result.data.message,
    });
  } catch (error) {
    console.error('Error requesting portal login code:', error);
    return NextResponse.json(
      { error: 'Failed to send login code.' },
      { status: 500 }
    );
  }
}
