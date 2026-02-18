import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { authenticatedProcedure } from "../procedures/index.js";
import { router } from "../trpc.js";
import type { Context, AuthenticatedContext } from "../context.js";

export const notificationRouter = router({
  /**
   * Get user's notifications
   */
  getNotifications: authenticatedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
      cursor: z.string().optional(),
      unreadOnly: z.boolean().default(false),
    }))
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;
      const { walletAddress } = ctx as AuthenticatedContext;

      const user = await context.db.user.findUnique({
        where: { walletAddress },
        select: { id: true },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const where: any = {
        userId: user.id,
      };

      if (input.unreadOnly) {
        where.read = false;
      }

      if (input.cursor) {
        where.createdAt = { lt: new Date(input.cursor) };
      }

      const notifications = await context.db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: input.limit + 1,
      });

      let nextCursor: string | undefined;
      if (notifications.length > input.limit) {
        const next = notifications.pop();
        nextCursor = next?.createdAt.toISOString();
      }

      return {
        notifications: notifications.map(n => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          data: n.data as Record<string, any> | null,
          read: n.read,
          createdAt: n.createdAt.toISOString(),
        })),
        nextCursor,
      };
    }),

  /**
   * Get unread notification count
   */
  getUnreadCount: authenticatedProcedure
    .query(async ({ ctx }) => {
      const context = ctx as Context;
      const { walletAddress } = ctx as AuthenticatedContext;

      const user = await context.db.user.findUnique({
        where: { walletAddress },
        select: { id: true },
      });

      if (!user) {
        return { count: 0 };
      }

      const count = await context.db.notification.count({
        where: {
          userId: user.id,
          read: false,
        },
      });

      return { count };
    }),

  /**
   * Mark notification as read
   */
  markAsRead: authenticatedProcedure
    .input(z.object({
      notificationId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;
      const { walletAddress } = ctx as AuthenticatedContext;

      const user = await context.db.user.findUnique({
        where: { walletAddress },
        select: { id: true },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      await context.db.notification.updateMany({
        where: {
          id: input.notificationId,
          userId: user.id,
        },
        data: { read: true },
      });

      return { success: true };
    }),

  /**
   * Mark all notifications as read
   */
  markAllAsRead: authenticatedProcedure
    .mutation(async ({ ctx }) => {
      const context = ctx as Context;
      const { walletAddress } = ctx as AuthenticatedContext;

      const user = await context.db.user.findUnique({
        where: { walletAddress },
        select: { id: true },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      await context.db.notification.updateMany({
        where: {
          userId: user.id,
          read: false,
        },
        data: { read: true },
      });

      return { success: true };
    }),
});
