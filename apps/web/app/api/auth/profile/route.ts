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
  globalForPrisma?.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

// Schema for request validation
const profileSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  coopId: z.string().min(1, 'Coop ID is required'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email').optional(),
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
          status: 'ACTIVE',
        },
      });
    }

    // Create or update the profile with coop-scoped unique key
    const profile = await db.userProfile.upsert({
      where: { 
        walletAddress_coopId: {
          walletAddress,
          coopId,
        },
      },
      update: {
        name,
        email,
        phoneNumber,
        updatedAt: new Date(),
      },
      create: {
        walletAddress,
        coopId,
        name,
        email,
        phoneNumber,
        role: 'member',
      },
    });

    // Create or update membership record (for users who got SC tokens directly without application)
    await db.userCoopMembership.upsert({
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
      },
    });
    
    // Update the session to indicate the user has a profile
    session.hasProfile = true;
    await session.save();
    
    // Return the profile
    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        walletAddress: profile.walletAddress,
        name: profile.name,
        role: profile.role,
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
    
    // Get the profile for the active coop
    if (!session.activeCoopId) {
      return NextResponse.json(
        { error: 'No active coop in session' },
        { status: 400 }
      );
    }

    const profile = await db.userProfile.findUnique({
      where: { 
        walletAddress_coopId: {
          walletAddress: session.address,
          coopId: session.activeCoopId,
        },
      },
    });
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }
    
    // Return the profile
    return NextResponse.json({
      id: profile.id,
      walletAddress: profile.walletAddress,
      name: profile.name,
      email: profile.email,
      phoneNumber: profile.phoneNumber,
      role: profile.role,
      permissions: profile.permissions,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    });
  } catch (error) {
    console.error('Error getting profile:', error);
    return NextResponse.json(
      { error: 'Failed to get profile' },
      { status: 500 }
    );
  }
}