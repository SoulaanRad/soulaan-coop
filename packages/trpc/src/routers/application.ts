import { z } from "zod";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";

import { Context } from "../context.js";
import { publicProcedure, privateProcedure } from "../procedures/index.js";
import { router } from "../trpc.js";
import { createWalletForUser } from "../services/wallet-service.js";
import { syncMembershipToContract } from "../services/blockchain.js";
import { toE164 } from "../lib/phone.js";

// Backend wallet for contract interactions
const BACKEND_WALLET_PRIVATE_KEY = process.env.BACKEND_WALLET_PRIVATE_KEY;

// Validation schema for application submission
const applicationSchema = z.object({
  // Personal Information
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  
  // Identity & Eligibility
  identity: z.enum(["black-american", "afro-caribbean", "african-immigrant", "ally"]),
  agreeToMission: z.enum(["yes", "no"]),
  
  // Spending Habits & Demand
  spendingCategories: z.array(z.string()).min(1, "Select at least one spending category"),
  monthlyCommitment: z.enum(["less-250", "250-500", "500-1000", "over-1000"]),
  
  // Commitment & Participation
  useUC: z.enum(["yes", "no"]),
  acceptFees: z.enum(["yes", "no"]),
  voteOnInvestments: z.enum(["yes", "no"]),
  
  // Trust & Accountability
  coopExperience: z.enum(["yes", "no"]),
  transparentTransactions: z.enum(["yes", "no"]),
  
  // Short Answer (optional)
  motivation: z.string().optional(),
  desiredService: z.string().optional(),
  
  // Terms Agreement
  agreeToCoopValues: z.boolean().refine(val => val === true, "Must agree to co-op values"),
  agreeToTerms: z.boolean().refine(val => val === true, "Must agree to terms of service"),
  agreeToPrivacy: z.boolean().refine(val => val === true, "Must agree to privacy policy"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const applicationRouter = router({
  /**
   * Submit a new application to join the Soulaan co-op
   */
  submitApplication: publicProcedure
    .input(applicationSchema)
    .output(z.object({
      success: z.boolean(),
      message: z.string(),
      applicationId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;
      
      console.log('\n🔷 submitApplication - START');
      console.log('📧 Email:', input.email);
      
      try {
        // Check if user already exists
        console.log('🔍 Checking for existing user...');
        const existingUser = await context.db.user.findUnique({
          where: { email: input.email },
        });

        if (existingUser) {
          console.log('❌ User already exists');
          throw new TRPCError({
            code: "CONFLICT",
            message: "An account with this email already exists",
          });
        }
        console.log('✅ No existing user found');

        // Hash the password
        console.log('🔒 Hashing password...');
        const hashedPassword = await bcrypt.hash(input.password, 12);
        console.log('✅ Password hashed');

        // Create user and application in a transaction
        console.log('💾 Starting database transaction...');
        const result = await context.db.$transaction(async (tx) => {
          // Create user with PENDING status
          console.log('👤 Creating user...');
          // Normalize phone to E.164 format
          const normalizedPhone = toE164(input.phone);
          console.log(`📱 Phone: "${input.phone}" -> "${normalizedPhone}"`);

          const user = await tx.user.create({
            data: {
              email: input.email,
              name: `${input.firstName} ${input.lastName}`,
              phone: normalizedPhone,
              password: hashedPassword,
              roles: ["member"],
              status: "PENDING",
            },
          });
          console.log('✅ User created:', user.id);

          // Create application with JSON data
          console.log('📝 Creating application...');
          const application = await tx.application.create({
            data: {
              userId: user.id,
              status: "SUBMITTED",
              data: {
                // Personal Information
                firstName: input.firstName,
                lastName: input.lastName,
                email: input.email,
                phone: normalizedPhone,
                
                // Identity & Eligibility
                identity: input.identity,
                agreeToMission: input.agreeToMission,
                
                // Spending Habits & Demand
                spendingCategories: input.spendingCategories,
                monthlyCommitment: input.monthlyCommitment,
                
                // Commitment & Participation
                useUC: input.useUC,
                acceptFees: input.acceptFees,
                voteOnInvestments: input.voteOnInvestments,
                
                // Trust & Accountability
                coopExperience: input.coopExperience,
                transparentTransactions: input.transparentTransactions,
                
                // Short Answer
                motivation: input.motivation,
                desiredService: input.desiredService,
                
                // Terms Agreement
                agreeToCoopValues: input.agreeToCoopValues,
                agreeToTerms: input.agreeToTerms,
                agreeToPrivacy: input.agreeToPrivacy,
              },
            },
          });
          console.log('✅ Application created:', application.id);

          return { user, application };
        });
        console.log('✅ Transaction completed successfully');

        const response = {
          success: true,
          message: "Application submitted successfully. You will be notified once your application is reviewed.",
          applicationId: result.application.id,
          userId: result.user.id,
        };
        console.log('🎉 submitApplication - SUCCESS');
        console.log('📤 Response:', response);
        return response;
      } catch (error) {
        console.error('\n💥 ERROR in submitApplication:');
        console.error('Error type:', error?.constructor?.name);
        console.error('Error message:', error instanceof Error ? error.message : String(error));
        console.error('Full error:', error);
        
        if (error instanceof Error && 'code' in error) {
          console.error('Error code:', (error as Error & { code: unknown }).code);
        }
        
        if (error instanceof TRPCError) {
          console.error('🚨 Throwing TRPCError:', error.code, error.message);
          throw error;
        }
        
        console.error('🚨 Throwing generic INTERNAL_SERVER_ERROR');
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to submit application. Please try again.",
          cause: error,
        });
      }
    }),

  /**
   * Get application status by user ID
   */
  getApplicationStatus: publicProcedure
    .input(z.object({ userId: z.string() }))
    .output(z.object({
      status: z.string(),
      applicationId: z.string(),
      submittedAt: z.string(),
      reviewedAt: z.string().optional(),
      reviewNotes: z.string().optional(),
      data: z.any().optional(), // Include application data
    }))
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;
      
      const application = await context.db.application.findUnique({
        where: { userId: input.userId },
        select: {
          id: true,
          status: true,
          createdAt: true,
          reviewedAt: true,
          reviewNotes: true,
          data: true,
        },
      });

      if (!application) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found",
        });
      }

      return {
        status: application.status,
        applicationId: application.id,
        submittedAt: application.createdAt.toISOString(),
        reviewedAt: application.reviewedAt?.toISOString(),
        reviewNotes: application.reviewNotes ?? undefined,
        data: application.data,
      };
    }),

  /**
   * Get application data by user ID (for admin/review purposes)
   */
  getApplicationData: publicProcedure
    .input(z.object({ userId: z.string() }))
    .output(z.object({
      applicationId: z.string(),
      status: z.string(),
      data: z.any(),
      submittedAt: z.string(),
      reviewedAt: z.string().optional(),
      reviewNotes: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;
      
      const application = await context.db.application.findUnique({
        where: { userId: input.userId },
      });

      if (!application) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found",
        });
      }

      return {
        applicationId: application.id,
        status: application.status,
        data: application.data,
        submittedAt: application.createdAt.toISOString(),
        reviewedAt: application.reviewedAt?.toISOString(),
        reviewNotes: application.reviewNotes ?? undefined,
      };
    }),

  /**
   * Approve an application (admin only)
   * Automatically creates a wallet for the user
   */
  approveApplication: privateProcedure
    .input(z.object({
      userId: z.string(),
      reviewNotes: z.string().optional(),
    }))
    .output(z.object({
      success: z.boolean(),
      message: z.string(),
      walletAddress: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;

      console.log('\n🔷 approveApplication - START');
      console.log('👤 User ID:', input.userId);

      try {
        // Check if application exists
        console.log('🔍 Checking for application...');
        const application = await context.db.application.findUnique({
          where: { userId: input.userId },
          include: { user: true },
        });

        if (!application) {
          console.log('❌ Application not found');
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Application not found for this user",
          });
        }

        if (application.status === "APPROVED") {
          console.log('⚠️ Application already approved');
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Application is already approved",
          });
        }

        console.log('✅ Application found:', application.id);

        // Process approval in a transaction
        console.log('💾 Starting approval transaction...');
        const result = await context.db.$transaction(async (tx) => {
          // 1. Update application status to APPROVED
          console.log('📝 Updating application status to APPROVED...');
          await tx.application.update({
            where: { userId: input.userId },
            data: {
              status: "APPROVED",
              reviewedAt: new Date(),
              reviewNotes: input.reviewNotes,
            },
          });
          console.log('✅ Application approved');

          // 2. Create wallet for user (if they don't have one already)
          let walletAddress = application.user.walletAddress;

          if (!walletAddress) {
            console.log('🔐 Creating wallet for user...');
            walletAddress = await createWalletForUser(input.userId);
            console.log('✅ Wallet created:', walletAddress);
          } else {
            console.log('ℹ️ User already has wallet:', walletAddress);
          }

          // 3. Update user status to ACTIVE
          console.log('👤 Updating user status to ACTIVE...');
          await tx.user.update({
            where: { id: input.userId },
            data: { status: "ACTIVE" },
          });
          console.log('✅ User status updated to ACTIVE');

          return { walletAddress };
        });

        console.log('✅ Transaction completed successfully');

        // 4. Sync membership to blockchain contract
        if (BACKEND_WALLET_PRIVATE_KEY && result.walletAddress) {
          console.log('⛓️ Syncing membership to SoulaaniCoin contract...');
          try {
            const syncResult = await syncMembershipToContract(
              result.walletAddress,
              'ACTIVE',
              BACKEND_WALLET_PRIVATE_KEY
            );
            if (syncResult.success) {
              console.log(`✅ Membership synced: ${syncResult.action}`);
              if (syncResult.txHash) {
                console.log(`   Transaction: ${syncResult.txHash}`);
              }
            } else {
              console.warn(`⚠️ Membership sync failed: ${syncResult.error}`);
              // Don't fail the approval, just log the warning
            }
          } catch (syncError) {
            console.warn('⚠️ Failed to sync membership to contract:', syncError);
            // Don't fail the approval, just log the warning
          }
        } else {
          console.warn('⚠️ BACKEND_WALLET_PRIVATE_KEY not set, skipping contract sync');
        }

        const response = {
          success: true,
          message: `Application approved. Wallet ${result.walletAddress} created for user.`,
          walletAddress: result.walletAddress,
          userId: input.userId,
        };

        console.log('🎉 approveApplication - SUCCESS');
        console.log('📤 Response:', response);
        return response;
      } catch (error) {
        console.error('\n💥 ERROR in approveApplication:');
        console.error('Error type:', error?.constructor?.name);
        console.error('Error message:', error instanceof Error ? error.message : String(error));
        console.error('Full error:', error);

        if (error instanceof TRPCError) {
          console.error('🚨 Throwing TRPCError:', error.code, error.message);
          throw error;
        }

        console.error('🚨 Throwing generic INTERNAL_SERVER_ERROR');
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to approve application. Please try again.",
          cause: error,
        });
      }
    }),

  /**
   * Reject an application (admin only)
   */
  rejectApplication: privateProcedure
    .input(z.object({
      userId: z.string(),
      reviewNotes: z.string(),
    }))
    .output(z.object({
      success: z.boolean(),
      message: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;

      console.log('\n🔷 rejectApplication - START');
      console.log('👤 User ID:', input.userId);

      try {
        // Check if application exists
        const application = await context.db.application.findUnique({
          where: { userId: input.userId },
        });

        if (!application) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Application not found for this user",
          });
        }

        // Update application and user in transaction
        await context.db.$transaction(async (tx) => {
          // Update application status to REJECTED
          await tx.application.update({
            where: { userId: input.userId },
            data: {
              status: "REJECTED",
              reviewedAt: new Date(),
              reviewNotes: input.reviewNotes,
            },
          });

          // Update user status to REJECTED
          await tx.user.update({
            where: { id: input.userId },
            data: { status: "REJECTED" },
          });
        });

        console.log('✅ Application rejected');

        const response = {
          success: true,
          message: "Application rejected.",
          userId: input.userId,
        };

        console.log('🎉 rejectApplication - SUCCESS');
        return response;
      } catch (error) {
        console.error('\n💥 ERROR in rejectApplication:', error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to reject application. Please try again.",
          cause: error,
        });
      }
    }),
});
