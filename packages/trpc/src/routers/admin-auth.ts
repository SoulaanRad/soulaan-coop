import { z } from "zod";
import { router, publicProcedure } from "../trpc.js";
import { type Context } from "../context.js";
import {
  isContractAdmin,
  verifyAdminSignature,
  generateAuthChallenge,
  getAllAdmins
} from "../services/admin-verification.js";
import { randomBytes } from 'crypto';

// Store nonces temporarily (in production, use Redis)
const nonceStore = new Map<string, { nonce: string; expiresAt: number }>();

// Clean up expired nonces every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [address, data] of nonceStore.entries()) {
    if (data.expiresAt < now) {
      nonceStore.delete(address);
    }
  }
}, 5 * 60 * 1000);

export const adminAuthRouter = router({
  /**
   * Request a challenge message for wallet authentication
   */
  requestChallenge: publicProcedure
    .input(
      z.object({
        walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
      })
    )
    .mutation(async ({ input }) => {
      const { walletAddress } = input;
      const address = walletAddress.toLowerCase();

      console.log(`\n🔑 Challenge requested for: ${address}`);

      // Generate a random nonce
      const nonce = randomBytes(32).toString('hex');

      // Store nonce with 10-minute expiration
      nonceStore.set(address, {
        nonce,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });

      // Generate challenge message
      const message = generateAuthChallenge(nonce);

      console.log(`✅ Challenge generated`);
      console.log(`   Nonce: ${nonce.slice(0, 16)}...`);
      console.log(`   Expires: ${new Date(nonceStore.get(address)!.expiresAt).toISOString()}`);

      return {
        success: true,
        message,
        nonce,
      };
    }),

  /**
   * Verify signed message and check admin status
   */
  verifySignature: publicProcedure
    .input(
      z.object({
        walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
        signature: z.string().regex(/^0x[a-fA-F0-9]{130}$/, 'Invalid signature'),
        message: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { walletAddress, signature, message } = input;
      const address = walletAddress.toLowerCase();

      console.log(`\n🔐 Verifying signature for: ${address}`);

      // Check if nonce exists and is not expired
      const storedData = nonceStore.get(address);
      if (!storedData) {
        console.log('❌ No challenge found for this address');
        throw new Error('No challenge found. Please request a new challenge.');
      }

      if (storedData.expiresAt < Date.now()) {
        console.log('❌ Challenge expired');
        nonceStore.delete(address);
        throw new Error('Challenge expired. Please request a new challenge.');
      }

      // Verify the signature
      const verification = await verifyAdminSignature(
        message,
        signature as `0x${string}`,
        walletAddress as `0x${string}`
      );

      if (!verification.valid) {
        console.log('❌ Invalid signature');
        throw new Error('Invalid signature');
      }

      if (!verification.isAdmin) {
        console.log('❌ Address is not an admin');
        throw new Error('This wallet address does not have admin privileges on the UnityCoin contract');
      }

      // Clear used nonce
      nonceStore.delete(address);

      console.log(`✅ Admin verified: ${verification.address}`);

      // Update or create user in database
      const context = ctx as Context;
      const user = await context.db.user.upsert({
        where: { walletAddress: verification.address },
        update: {
          roles: ['admin'],
          status: 'ACTIVE',
        },
        create: {
          email: `${verification.address}@wallet.soulaan.coop`,
          walletAddress: verification.address,
          name: 'Admin',
          roles: ['admin'],
          status: 'ACTIVE',
        },
      });

      console.log(`✅ User record updated: ${user.id}`);

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          walletAddress: user.walletAddress,
          roles: user.roles,
          status: user.status,
          createdAt: user.createdAt.toISOString(),
        },
        message: 'Admin authenticated successfully',
      };
    }),

  /**
   * Check if a wallet address is an admin
   */
  checkAdminStatus: publicProcedure
    .input(
      z.object({
        walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
      })
    )
    .query(async ({ input }) => {
      const { walletAddress } = input;

      const isAdmin = await isContractAdmin(walletAddress as `0x${string}`);

      return {
        walletAddress,
        isAdmin,
      };
    }),

  /**
   * Get all admin wallet addresses from the contract
   */
  getAllAdmins: publicProcedure
    .query(async () => {
      const admins = await getAllAdmins();

      return {
        admins,
        count: admins.length,
      };
    }),
});
