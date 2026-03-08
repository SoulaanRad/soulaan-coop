import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { db } from '@repo/db';
import { router } from '../trpc.js';
import { authenticatedProcedure, privateProcedure } from '../procedures/index.js';
import type { Context, AuthenticatedContext } from '../context.js';

export const scVerificationRouter = router({
  submitApplication: authenticatedProcedure
    .input(z.object({
      storeId: z.string(),
      whyScEligible: z.string().min(50).max(4000),
      expectedVolume: z.string().min(2).max(200).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;
      const { walletAddress } = ctx as AuthenticatedContext;

      const user = await context.db.user.findUnique({
        where: { walletAddress },
        select: { id: true },
      });

      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      const store = await context.db.store.findUnique({
        where: { id: input.storeId },
        include: {
          business: { include: { stripeAccount: true } },
          scVerificationApplication: true,
        },
      });

      if (!store) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Store not found' });
      }

      if (store.ownerId !== user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not own this store' });
      }

      if (store.status !== 'APPROVED' || !store.business?.stripeAccount?.chargesEnabled) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Complete Stripe Connect approval before applying for SC verification',
        });
      }

      const application = store.scVerificationApplication
        ? await context.db.sCVerificationApplication.update({
            where: { storeId: store.id },
            data: {
              whyScEligible: input.whyScEligible,
              expectedVolume: input.expectedVolume ?? '',
              status: 'PENDING',
              rejectionReason: null,
              reviewedBy: null,
              reviewedAt: null,
            },
          })
        : await context.db.sCVerificationApplication.create({
            data: {
              storeId: store.id,
              whyScEligible: input.whyScEligible,
              expectedVolume: input.expectedVolume ?? '',
              status: 'PENDING',
            },
          });

      await context.db.store.update({
        where: { id: store.id },
        data: {
          scApplicationStatus: 'PENDING',
        },
      });

      return {
        success: true,
        applicationId: application.id,
        status: application.status,
      };
    }),

  getMyApplicationStatus: authenticatedProcedure
    .input(z.object({
      storeId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;
      const { walletAddress } = ctx as AuthenticatedContext;

      const user = await context.db.user.findUnique({
        where: { walletAddress },
        select: { id: true },
      });

      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      const store = await context.db.store.findUnique({
        where: { id: input.storeId },
        include: {
          business: { include: { stripeAccount: true } },
          scVerificationApplication: true,
        },
      });

      if (!store) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Store not found' });
      }

      if (store.ownerId !== user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not own this store' });
      }

      return {
        storeId: store.id,
        storeStatus: store.status,
        isScVerified: store.isScVerified,
        scApplicationStatus: store.scApplicationStatus,
        canApply: store.status === 'APPROVED' && !!store.business?.stripeAccount?.chargesEnabled && !store.isScVerified,
        stripeReady: !!store.business?.stripeAccount?.chargesEnabled,
        application: store.scVerificationApplication
          ? {
              id: store.scVerificationApplication.id,
              status: store.scVerificationApplication.status,
              whyScEligible: store.scVerificationApplication.whyScEligible,
              expectedVolume: store.scVerificationApplication.expectedVolume,
              rejectionReason: store.scVerificationApplication.rejectionReason,
              reviewedAt: store.scVerificationApplication.reviewedAt,
            }
          : null,
      };
    }),

  listApplications: privateProcedure
    .input(z.object({
      status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
      limit: z.number().min(1).max(100).default(50),
    }).optional())
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;
      const status = input?.status;
      const limit = input?.limit ?? 50;

      const applications = await context.db.sCVerificationApplication.findMany({
        where: status ? { status } : undefined,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          store: {
            include: {
              owner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              business: {
                include: {
                  stripeAccount: true,
                },
              },
            },
          },
        },
      });

      return {
        applications: applications.map((application: any) => ({
          id: application.id,
          status: application.status,
          whyScEligible: application.whyScEligible,
          expectedVolume: application.expectedVolume,
          rejectionReason: application.rejectionReason,
          reviewedAt: application.reviewedAt,
          createdAt: application.createdAt,
          store: {
            id: application.store.id,
            name: application.store.name,
            status: application.store.status,
            isScVerified: application.store.isScVerified,
            owner: application.store.owner,
            stripeAccount: application.store.business?.stripeAccount
              ? {
                  onboardingStatus: application.store.business.stripeAccount.onboardingStatus,
                  chargesEnabled: application.store.business.stripeAccount.chargesEnabled,
                  payoutsEnabled: application.store.business.stripeAccount.payoutsEnabled,
                }
              : null,
          },
        })),
      };
    }),

  reviewApplication: privateProcedure
    .input(z.object({
      applicationId: z.string(),
      approve: z.boolean(),
      rejectionReason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;
      const reviewer = (ctx as any).walletAddress ?? 'admin';

      const application = await context.db.sCVerificationApplication.findUnique({
        where: { id: input.applicationId },
        include: { store: true },
      });

      if (!application) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'SC application not found' });
      }

      if (!input.approve && (!input.rejectionReason || input.rejectionReason.trim().length < 10)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'A rejection reason of at least 10 characters is required',
        });
      }

      const nextStatus = input.approve ? 'APPROVED' : 'REJECTED';

      await context.db.$transaction([
        context.db.sCVerificationApplication.update({
          where: { id: application.id },
          data: {
            status: nextStatus,
            reviewedBy: reviewer,
            reviewedAt: new Date(),
            rejectionReason: input.approve ? null : input.rejectionReason?.trim(),
          },
        }),
        context.db.store.update({
          where: { id: application.storeId },
          data: {
            isScVerified: input.approve,
            scVerifiedAt: input.approve ? new Date() : null,
            scApplicationStatus: nextStatus,
          },
        }),
      ]);

      return {
        success: true,
        status: nextStatus,
      };
    }),
});
