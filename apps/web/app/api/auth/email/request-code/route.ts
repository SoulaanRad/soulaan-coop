import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/signature-verification';
import { env } from '~/env';

const requestCodeSchema = z.object({
  email: z.string().email(),
  coopId: z.string().min(1).default('soulaan'),
});

function generateLoginCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const escapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return escapes[char] || char;
  });
}

async function sendLoginCode(email: string, code: string, coopName: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'support@mail.cahootzcoops.com';
  const safeCoopName = escapeHtml(coopName);

  if (!apiKey) {
    if (env.NODE_ENV !== 'production') {
      console.log(`Portal login code for ${email}: ${code}`);
    }
    return { sent: false };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [email],
      subject: `Your ${coopName} portal login code`,
      text: `Your ${coopName} portal login code is ${code}. This code expires in 10 minutes.`,
      html: `
        <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; color: #0f172a;">
          <p>Your ${safeCoopName} portal login code is:</p>
          <p style="font-size: 28px; font-weight: 700; letter-spacing: 0.2em;">${code}</p>
          <p>This code expires in 10 minutes.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Failed to send login code: ${details}`);
  }

  return { sent: true };
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

    const user = await db.user.findUnique({
      where: { email },
      include: {
        wallets: {
          where: { isPrimary: true },
          take: 1,
        },
        memberships: {
          where: { coopId },
          take: 1,
        },
      },
    });

    const membership = user?.memberships[0];
    const hasWallet = !!(user?.walletAddress || user?.wallets[0]?.address);

    if (!user || user.status !== 'ACTIVE' || !membership || membership.status !== 'ACTIVE' || !hasWallet) {
      return NextResponse.json(
        { error: 'No active portal account was found for that email.' },
        { status: 404 }
      );
    }

    const coopConfig = await db.coopConfig.findFirst({
      where: { coopId, isActive: true },
      orderBy: { version: 'desc' },
      select: { name: true },
    });
    const coopName = coopConfig?.name || 'Soulaan Co-op';

    const code = generateLoginCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.loginCode.create({
      data: {
        email,
        code,
        expiresAt,
      },
    });

    const delivery = await sendLoginCode(email, code, coopName);

    return NextResponse.json({
      success: true,
      sent: delivery.sent,
      debugCode: env.NODE_ENV !== 'production' && !delivery.sent ? code : undefined,
    });
  } catch (error) {
    console.error('Error requesting portal login code:', error);
    return NextResponse.json(
      { error: 'Failed to send login code.' },
      { status: 500 }
    );
  }
}
