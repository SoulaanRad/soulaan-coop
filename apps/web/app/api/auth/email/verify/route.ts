import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createUserSession, db } from '@/lib/signature-verification';

const verifyCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/, 'Enter the six-digit code.'),
  coopId: z.string().min(1).default('soulaan'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = verifyCodeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Enter the six-digit code from your email.' },
        { status: 400 }
      );
    }

    const email = result.data.email.trim().toLowerCase();
    const { code, coopId } = result.data;

    const loginCode = await db.loginCode.findFirst({
      where: {
        email,
        code,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!loginCode) {
      return NextResponse.json(
        { error: 'That code is invalid or expired.' },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { email },
      include: {
        memberships: {
          where: { coopId },
          take: 1,
          select: {
            coopId: true,
            status: true,
            roles: true,
          },
        },
      },
    });

    const membership = user?.memberships[0];
    if (user?.status !== 'ACTIVE' || membership?.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'No active portal account was found for that email.' },
        { status: 404 }
      );
    }

    await db.loginCode.update({
      where: { id: loginCode.id },
      data: { used: true },
    });

    const session = await createUserSession(user.id, coopId);

    return NextResponse.json({
      success: true,
      userId: session.userId || null,
      email: session.email || email,
      hasProfile: session.hasProfile,
      activeCoopId: session.activeCoopId,
      isAdmin: session.isAdmin || false,
      adminRole: session.adminRole || null,
      address: session.address,
      loginMethod: session.loginMethod,
    });
  } catch (error) {
    console.error('Error verifying portal login code:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to verify login code.' },
      { status: 500 }
    );
  }
}
