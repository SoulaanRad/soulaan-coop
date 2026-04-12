import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/signature-verification';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { env } from '~/env';

// Initialize Prisma client directly since @repo/db exports aren't working in Next.js
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

// Schema for request validation
const profileSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  coopId: z.string().min(1, 'Coop ID is required'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email').min(1, 'Email is required'),
  phoneNumber: z.string().min(10, 'Please enter a valid phone number'),
});

/**
 * Create or update a user profile
 * @route POST /api/auth/profile
 */
export async function POST(request: NextRequest) {
  try {
    // Get the current session
    const session = await getSession();
    
    if (!session?.isLoggedIn) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Parse and validate the request body
    const body = await request.json();
    const result = profileSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: result.error.format() },
        { status: 400 }
      );
    }
    
    const { walletAddress, coopId, name, email, phoneNumber } = result.data;
    
    // Verify the wallet address matches the authenticated user
    if (session.address !== walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address mismatch' },
        { status: 403 }
      );
    }
    
    // Verify the coopId matches the session
    if (session.activeCoopId && session.activeCoopId !== coopId) {
      return NextResponse.json(
        { error: 'Coop ID mismatch with session' },
        { status: 403 }
      );
    }
    
    // Get or create user record
    let user = await db.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          walletAddress,
          email,
          status: 'ACTIVE',
        },
      });
      
      console.log(`✅ Created User record for ${walletAddress} with email ${email}`);
    } else {
      console.log(`✅ Found existing User record for ${walletAddress}`);
    }

    // Update user record with profile data
    await db.user.update({
      where: { id: user.id },
      data: {
        name,
        email,
        phone: phoneNumber,
      },
    });

    // Create or update membership record
    const membership = await db.userCoopMembership.upsert({
      where: {
        userId_coopId: {
          userId: user.id,
          coopId,
        },
      },
      create: {
        userId: user.id,
        coopId,
        status: 'ACTIVE',
        roles: ['member'],
        joinedAt: new Date(),
      },
      update: {
        lastActiveAt: new Date(),
        updatedAt: new Date(),
      },
    });
    
    // Update the session to indicate the user has a profile
    session.hasProfile = true;
    await session.save();
    
    // Return the user/profile
    return NextResponse.json({
      success: true,
      profile: {
        id: user.id,
        userId: user.id,
        name: user.name,
        email: user.email,
        roles: membership.roles,
      },
    });
  } catch (error) {
    console.error('Error creating/updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to create/update profile' },
      { status: 500 }
    );
  }
}

/**
 * Get the current user's profile
 * @route GET /api/auth/profile
 */
export async function GET(_request: NextRequest) {
  try {
    // Get the current session
    const session = await getSession();
    
    if (!session?.isLoggedIn) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Get the user and membership for the active coop
    if (!session.activeCoopId) {
      return NextResponse.json(
        { error: 'No active coop in session' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { walletAddress: session.address },
      include: {
        memberships: {
          where: { coopId: session.activeCoopId },
        },
      },
    });
    
    if (!user || user.memberships.length === 0) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    const membership = user.memberships[0];
    
    // Return the profile from user
    return NextResponse.json({
      id: user.id,
      userId: user.id,
      walletAddress: user.walletAddress,
      name: user.name,
      email: user.email,
      phoneNumber: user.phone,
      roles: membership.roles,
      permissions: membership.permissions,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    console.error('Error getting profile:', error);
    return NextResponse.json(
      { error: 'Failed to get profile' },
      { status: 500 }
    );
  }
}