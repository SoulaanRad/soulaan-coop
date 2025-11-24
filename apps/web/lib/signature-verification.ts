import { SiweMessage } from 'siwe';
import { generateNonce } from 'siwe';
import { verifyMessage } from 'viem';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { checkSoulaaniCoinBalance as checkBalance } from './balance-checker';
import { config, getServerConfig } from './config';
import { env } from '~/env';

// Initialize Prisma client directly since @repo/db exports aren't working in Next.js
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const db =
  globalForPrisma?.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

// Session type definition
export interface AuthSession {
  address: string;
  isLoggedIn: boolean;
  hasProfile: boolean;
  nonce?: string;
  expiresAt?: Date;
  save: () => Promise<void>;
  destroy: () => void;
};

// Iron session configuration (server-side only)
function getSessionOptions() {
  const serverConfig = getServerConfig();
  return {
    password: serverConfig.session.secret,
    cookieName: serverConfig.session.cookieName,
    cookieOptions: {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: serverConfig.session.maxAge,
    },
  };
}

/**
 * Generate a challenge for the user to sign
 * @param address - The wallet address requesting the challenge
 * @returns The challenge message
 */
export async function generateChallenge(address: string): Promise<string> {
  // Generate a random nonce
  const nonce = generateNonce();
  
  // Create expiration date (10 minutes from now)
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10);
  
  // Create a SIWE message
  const message = new SiweMessage({
    domain: config.app.domain,
    address,
    statement: 'Sign in to Soulaan Co-op Admin Panel',
    uri: config.app.uri,
    version: '1',
    chainId: config.chain.id,
    nonce,
  });
  
  // Store the challenge in the database
  await db.authChallenge.create({
    data: {
      address,
      nonce,
      expiresAt,
    },
  });
  
  console.log(`🔐 Generated challenge for ${address}`);
  
  // Return the message to be signed
  return message.prepareMessage();
}

/**
 * Verify a signature against a challenge
 * @param address - The wallet address that signed the message
 * @param signature - The signature to verify
 * @param message - The original message that was signed
 * @returns Boolean indicating if the signature is valid
 */
export async function verifySignature(
  address: string,
  signature: string,
  message: string
): Promise<boolean> {
  try {
    // Parse the SIWE message
    const siweMessage = new SiweMessage(message);
    
    // Get the nonce from the message
    const { nonce } = siweMessage;
    
    // Find the challenge in the database
    const challenge = await db.authChallenge.findFirst({
      where: {
        address,
        nonce,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });
    
    // If no challenge is found or it's expired, return false
    if (!challenge) {
      console.error(`❌ No valid challenge found for ${address}`);
      return false;
    }
    
    // Verify the signature using viem
    const isValid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
    
    if (!isValid) {
      console.error(`❌ Invalid signature for ${address}`);
      return false;
    }
    
    // Mark the challenge as used
    await db.authChallenge.update({
      where: { id: challenge.id },
      data: { used: true },
    });
    
    console.log(`✅ Signature verified for ${address}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error verifying signature:', error);
    return false;
  }
}

/**
 * Check if a wallet has SoulaaniCoin and is an active member
 * @param address - The wallet address to check
 * @returns Boolean indicating if the wallet has SoulaaniCoin and is an active member
 */
export async function checkSoulaaniCoinBalance(address: string): Promise<boolean> {
  return checkBalance(address);
}

/**
 * Get the current session
 * @returns The current session or null if not authenticated
 */
export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const session = await getIronSession<AuthSession>(cookieStore, getSessionOptions());
  
  if (!session.isLoggedIn) {
    return null;
  }
  
  return session;
}

/**
 * Create a new session for an authenticated user
 * @param address - The wallet address of the authenticated user
 * @returns The created session
 */
export async function createSession(address: string): Promise<AuthSession> {
  const cookieStore = await cookies();
  const session = await getIronSession<AuthSession>(cookieStore, getSessionOptions());
  
  // Check if the user has a profile
  const profile = await db.userProfile.findUnique({
    where: { walletAddress: address },
  });
  
  // Update the session
  session.address = address;
  session.isLoggedIn = true;
  session.hasProfile = !!profile;
  
  // Update last login time if profile exists
  if (profile) {
    await db.userProfile.update({
      where: { walletAddress: address },
      data: { lastLogin: new Date() },
    });
  }
  
  // Save the session
  await session.save();
  
  console.log(`✅ Session created for ${address}, hasProfile: ${!!profile}`);
  
  return session;
}

/**
 * Destroy the current session (logout)
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const session = await getIronSession<AuthSession>(cookieStore, getSessionOptions());
  
  const address = session.address;
  session.destroy();
  
  console.log(`🚪 Session destroyed for ${address}`);
}