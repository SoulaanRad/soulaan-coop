import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Context } from "../context.js";
import { publicProcedure } from "../procedures/index.js";
import { router } from "../trpc.js";

export const adminRouter = router({
  /**
   * Get all users with their applications
   * TODO: Add proper authentication - only admins should access this
   */
  getAllUsersWithApplications: publicProcedure
    .query(async ({ ctx }) => {
      const context = ctx as Context;

      const users = await context.db.user.findMany({
        include: {
          application: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return users;
    }),

  /**
   * Get users by status
   */
  getUsersByStatus: publicProcedure
    .input(z.object({
      status: z.enum(['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED']),
    }))
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;

      const users = await context.db.user.findMany({
        where: {
          status: input.status,
        },
        include: {
          application: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return users;
    }),

  /**
   * Get a single user with full application data
   */
  getUserWithApplication: publicProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;

      const user = await context.db.user.findUnique({
        where: {
          id: input.userId,
        },
        include: {
          application: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      return user;
    }),

  /**
   * Update user status
   * TODO: Add permission check - only admins with proper role should be able to update
   */
  updateUserStatus: publicProcedure
    .input(z.object({
      userId: z.string(),
      status: z.enum(['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED']),
      reviewNotes: z.string().optional(),
      // TODO: Add adminUserId to track who made the change
    }))
    .mutation(async ({ input, ctx }) => {
      console.log('\n🔷 updateUserStatus - START');
      console.log('📥 Received input:', JSON.stringify(input, null, 2));
      const context = ctx as Context;

      // TODO: Add permission check here
      // const adminUser = await context.db.user.findUnique({
      //   where: { id: input.adminUserId },
      // });
      // if (!adminUser || !adminUser.roles.includes('admin')) {
      //   throw new TRPCError({
      //     code: 'FORBIDDEN',
      //     message: 'Only admins can update user status',
      //   });
      // }

      const user = await context.db.user.update({
        where: {
          id: input.userId,
        },
        data: {
          status: input.status,
        },
      });

      // If there's an application, update its status and review info
      if (input.reviewNotes) {
        await context.db.application.updateMany({
          where: {
            userId: input.userId,
          },
          data: {
            status: input.status === 'ACTIVE' ? 'APPROVED' :
                   input.status === 'REJECTED' ? 'REJECTED' : 'SUBMITTED',
            reviewNotes: input.reviewNotes,
            reviewedAt: new Date(),
            // TODO: Add reviewedBy: input.adminUserId,
          },
        });
      }

      return user;
    }),

  /**
   * Get pending applications (users with PENDING status)
   */
  getPendingApplications: publicProcedure
    .query(async ({ ctx }) => {
      const context = ctx as Context;

      const users = await context.db.user.findMany({
        where: {
          status: 'PENDING',
        },
        include: {
          application: true,
        },
        orderBy: {
          createdAt: 'asc', // Oldest first
        },
      });

      return users;
    }),

  /**
   * Batch approve/reject applications
   */
  batchUpdateStatus: publicProcedure
    .input(z.object({
      userIds: z.array(z.string()),
      status: z.enum(['ACTIVE', 'REJECTED']),
      reviewNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;

      // Update all users
      await context.db.user.updateMany({
        where: {
          id: {
            in: input.userIds,
          },
        },
        data: {
          status: input.status,
        },
      });

      // Update all applications
      await context.db.application.updateMany({
        where: {
          userId: {
            in: input.userIds,
          },
        },
        data: {
          status: input.status === 'ACTIVE' ? 'APPROVED' : 'REJECTED',
          reviewNotes: input.reviewNotes,
          reviewedAt: new Date(),
        },
      });

      return { success: true, count: input.userIds.length };
    }),

  /**
   * Get application statistics
   */
  getApplicationStats: publicProcedure
    .query(async ({ ctx }) => {
      console.log('\n🔷 getApplicationStats - START');
      console.log("📊 DATABASE_URL:", process.env.DATABASE_URL ? 'Connected' : 'NOT SET');
      const context = ctx as Context;

      try {
        // First, let's check if we can query any users at all
        const allUsers = await context.db.user.findMany();
        console.log(`📈 Total users in DB: ${allUsers.length}`);
        console.log(`📋 User statuses:`, allUsers.map(u => ({ email: u.email, status: u.status })));

        const [pending, active, rejected, suspended] = await Promise.all([
          context.db.user.count({ where: { status: 'PENDING' } }),
          context.db.user.count({ where: { status: 'ACTIVE' } }),
          context.db.user.count({ where: { status: 'REJECTED' } }),
          context.db.user.count({ where: { status: 'SUSPENDED' } }),
        ]);

        console.log(`✅ Stats calculated:`, { pending, active, rejected, suspended });

        const result = {
          pending,
          active,
          rejected,
          suspended,
          total: pending + active + rejected + suspended,
        };
        
        console.log('🎉 getApplicationStats - SUCCESS');
        console.log('📤 Returning:', result);
        return result;
      } catch (error) {
        console.error('❌ Error in getApplicationStats:', error);
        throw error;
      }
    }),
});
