import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { Context } from "../context.js";
import { publicProcedure, privateProcedure } from "../procedures/index.js";
import { router } from "../trpc.js";

export const categoriesRouter = router({
  /**
   * Get all store categories (public with optional admin-only filter)
   */
  getStoreCategories: publicProcedure
    .input(z.object({
      includeAdminOnly: z.boolean().optional().default(false),
    }).optional())
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;
      const includeAdminOnly = input?.includeAdminOnly ?? false;

      const where: any = {
        isActive: true,
      };

      // Only include admin-only categories if explicitly requested
      if (!includeAdminOnly) {
        where.isAdminOnly = false;
      }

      const categories = await context.db.storeCategoryConfig.findMany({
        where,
        orderBy: [
          { sortOrder: "asc" },
          { label: "asc" },
        ],
      });

      return categories.map((cat) => ({
        id: cat.id,
        key: cat.key,
        label: cat.label,
        isAdminOnly: cat.isAdminOnly,
        sortOrder: cat.sortOrder,
      }));
    }),

  /**
   * Get all product categories (public with optional admin-only filter)
   */
  getProductCategories: publicProcedure
    .input(z.object({
      includeAdminOnly: z.boolean().optional().default(false),
    }).optional())
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;
      const includeAdminOnly = input?.includeAdminOnly ?? false;

      const where: any = {
        isActive: true,
      };

      // Only include admin-only categories if explicitly requested
      if (!includeAdminOnly) {
        where.isAdminOnly = false;
      }

      const categories = await context.db.productCategoryConfig.findMany({
        where,
        orderBy: [
          { sortOrder: "asc" },
          { label: "asc" },
        ],
      });

      return categories.map((cat) => ({
        id: cat.id,
        key: cat.key,
        label: cat.label,
        isAdminOnly: cat.isAdminOnly,
        sortOrder: cat.sortOrder,
      }));
    }),

  /**
   * Create a store category (admin only)
   */
  createStoreCategory: privateProcedure
    .input(z.object({
      key: z.string().min(2).max(50),
      label: z.string().min(2).max(100),
      isAdminOnly: z.boolean().optional().default(false),
      sortOrder: z.number().int().optional().default(0),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;

      // Check if key already exists
      const existing = await context.db.storeCategoryConfig.findUnique({
        where: { key: input.key },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A category with this key already exists",
        });
      }

      const category = await context.db.storeCategoryConfig.create({
        data: {
          key: input.key,
          label: input.label,
          isAdminOnly: input.isAdminOnly,
          sortOrder: input.sortOrder,
        },
      });

      return {
        success: true,
        category: {
          id: category.id,
          key: category.key,
          label: category.label,
          isAdminOnly: category.isAdminOnly,
          sortOrder: category.sortOrder,
        },
      };
    }),

  /**
   * Create a product category (admin only)
   */
  createProductCategory: privateProcedure
    .input(z.object({
      key: z.string().min(2).max(50),
      label: z.string().min(2).max(100),
      isAdminOnly: z.boolean().optional().default(false),
      sortOrder: z.number().int().optional().default(0),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;

      // Check if key already exists
      const existing = await context.db.productCategoryConfig.findUnique({
        where: { key: input.key },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A category with this key already exists",
        });
      }

      const category = await context.db.productCategoryConfig.create({
        data: {
          key: input.key,
          label: input.label,
          isAdminOnly: input.isAdminOnly,
          sortOrder: input.sortOrder,
        },
      });

      return {
        success: true,
        category: {
          id: category.id,
          key: category.key,
          label: category.label,
          isAdminOnly: category.isAdminOnly,
          sortOrder: category.sortOrder,
        },
      };
    }),

  /**
   * Update a store category (admin only)
   */
  updateStoreCategory: privateProcedure
    .input(z.object({
      id: z.string(),
      label: z.string().min(2).max(100).optional(),
      isAdminOnly: z.boolean().optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;

      const { id, ...updateData } = input;

      const category = await context.db.storeCategoryConfig.update({
        where: { id },
        data: updateData,
      });

      return {
        success: true,
        category: {
          id: category.id,
          key: category.key,
          label: category.label,
          isAdminOnly: category.isAdminOnly,
          isActive: category.isActive,
          sortOrder: category.sortOrder,
        },
      };
    }),

  /**
   * Update a product category (admin only)
   */
  updateProductCategory: privateProcedure
    .input(z.object({
      id: z.string(),
      label: z.string().min(2).max(100).optional(),
      isAdminOnly: z.boolean().optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;

      const { id, ...updateData } = input;

      const category = await context.db.productCategoryConfig.update({
        where: { id },
        data: updateData,
      });

      return {
        success: true,
        category: {
          id: category.id,
          key: category.key,
          label: category.label,
          isAdminOnly: category.isAdminOnly,
          isActive: category.isActive,
          sortOrder: category.sortOrder,
        },
      };
    }),
});
