import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { Context } from "../context.js";
import { publicProcedure, privateProcedure, authenticatedProcedure } from "../procedures/index.js";
import { router } from "../trpc.js";
import { chargePaymentMethod } from "../services/stripe-customer.js";
import { mintUCToUser, awardStoreTransactionReward } from "../services/wallet-service.js";
import { sendToSoulaanUser } from "../services/p2p-service.js";
import { convertUSDToUC } from "../utils/currency-converter.js";

// Enums for validation
const StoreCategoryEnum = z.enum([
  "FOOD_BEVERAGE",
  "RETAIL",
  "SERVICES",
  "HEALTH_WELLNESS",
  "ENTERTAINMENT",
  "EDUCATION",
  "PROFESSIONAL",
  "HOME_GARDEN",
  "AUTOMOTIVE",
  "FOUNDER_PACKAGE",
  "OTHER",
]);

const ProductCategoryEnum = z.enum([
  "FOOD",
  "BEVERAGES",
  "CLOTHING",
  "ELECTRONICS",
  "HOME",
  "BEAUTY",
  "HEALTH",
  "SPORTS",
  "TOYS",
  "BOOKS",
  "SERVICES",
  "FOUNDER_BADGES",
  "OTHER",
]);

export const storeRouter = router({
  // ══════════════════════════════════════════════════════════════
  // PUBLIC ENDPOINTS - Browse stores and products
  // ══════════════════════════════════════════════════════════════

  /**
   * Get all approved stores with optional filters
   */
  getStores: publicProcedure
    .input(z.object({
      category: StoreCategoryEnum.optional(),
      scVerifiedOnly: z.boolean().optional(),
      featured: z.boolean().optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).optional().default(20),
      cursor: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;
      const { category, scVerifiedOnly, featured, search, cursor } = input || {};
      const limit = input?.limit ?? 20;

      const where: any = {
        status: "APPROVED",
      };

      if (category) where.category = category;
      if (scVerifiedOnly) where.isScVerified = true;
      if (featured) where.isFeatured = true;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ];
      }

      const stores = await context.db.store.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: [
          { isFeatured: "desc" },
          { isScVerified: "desc" },
          { createdAt: "desc" },
        ],
        include: {
          _count: {
            select: { products: { where: { isActive: true } } },
          },
        },
      });

      let nextCursor: string | undefined;
      if (stores.length > limit) {
        const nextItem = stores.pop();
        nextCursor = nextItem?.id;
      }

      return {
        stores: stores.map((store) => ({
          id: store.id,
          name: store.name,
          description: store.description,
          category: store.category,
          imageUrl: store.imageUrl,
          isScVerified: store.isScVerified,
          acceptsUC: store.acceptsUC,
          ucDiscountPercent: store.ucDiscountPercent,
          isFeatured: store.isFeatured,
          rating: store.rating,
          reviewCount: store.reviewCount,
          productCount: store._count.products,
          city: store.city,
          state: store.state,
        })),
        nextCursor,
      };
    }),

  /**
   * Get single store details
   */
  getStore: publicProcedure
    .input(z.object({
      storeId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;

      const store = await context.db.store.findUnique({
        where: { id: input.storeId },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: { products: { where: { isActive: true } } },
          },
        },
      });

      if (!store) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Store not found",
        });
      }

      // Only show approved stores publicly
      if (store.status !== "APPROVED") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Store not found",
        });
      }

      return {
        id: store.id,
        name: store.name,
        description: store.description,
        category: store.category,
        imageUrl: store.imageUrl,
        bannerUrl: store.bannerUrl,
        address: store.address,
        city: store.city,
        state: store.state,
        zipCode: store.zipCode,
        phone: store.phone,
        email: store.email,
        website: store.website,
        isScVerified: store.isScVerified,
        acceptsUC: store.acceptsUC,
        ucDiscountPercent: store.ucDiscountPercent,
        isFeatured: store.isFeatured,
        rating: store.rating,
        reviewCount: store.reviewCount,
        totalOrders: store.totalOrders,
        productCount: store._count.products,
        owner: store.owner,
      };
    }),

  /**
   * Get products for a store
   */
  getProducts: publicProcedure
    .input(z.object({
      storeId: z.string().optional(),
      category: ProductCategoryEnum.optional(),
      featured: z.boolean().optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).optional().default(20),
      cursor: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;
      const { storeId, category, featured, search, limit, cursor } = input;

      const where: any = {
        isActive: true,
        store: {
          status: "APPROVED",
        },
      };

      if (storeId) where.storeId = storeId;
      if (category) where.category = category;
      if (featured) where.isFeatured = true;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ];
      }

      const products = await context.db.product.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: [
          { isFeatured: "desc" },
          { createdAt: "desc" },
        ],
        include: {
          store: {
            select: {
              id: true,
              name: true,
              isScVerified: true,
              acceptsUC: true,
              ucDiscountPercent: true,
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (products.length > limit) {
        const nextItem = products.pop();
        nextCursor = nextItem?.id;
      }

      return {
        products: products.map((product) => ({
          id: product.id,
          name: product.name,
          description: product.description,
          category: product.category,
          imageUrl: product.imageUrl,
          priceUSD: product.priceUSD,
          ucDiscountPrice: product.ucDiscountPrice,
          quantity: product.trackInventory ? product.quantity : null,
          isFeatured: product.isFeatured,
          store: product.store,
        })),
        nextCursor,
      };
    }),

  /**
   * Get single product details
   */
  getProduct: publicProcedure
    .input(z.object({
      productId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;

      const product = await context.db.product.findUnique({
        where: { id: input.productId },
        include: {
          store: {
            select: {
              id: true,
              name: true,
              isScVerified: true,
              acceptsUC: true,
              ucDiscountPercent: true,
              status: true,
            },
          },
        },
      });

      if (!product || !product.isActive || product.store.status !== "APPROVED") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        category: product.category,
        imageUrl: product.imageUrl,
        images: product.images,
        priceUSD: product.priceUSD,
        ucDiscountPrice: product.ucDiscountPrice,
        quantity: product.trackInventory ? product.quantity : null,
        trackInventory: product.trackInventory,
        allowBackorder: product.allowBackorder,
        isFeatured: product.isFeatured,
        totalSold: product.totalSold,
        store: {
          id: product.store.id,
          name: product.store.name,
          isScVerified: product.store.isScVerified,
          acceptsUC: product.store.acceptsUC,
          ucDiscountPercent: product.store.ucDiscountPercent,
        },
      };
    }),

  // ══════════════════════════════════════════════════════════════
  // AUTHENTICATED ENDPOINTS - User actions
  // ══════════════════════════════════════════════════════════════

  /**
   * Get user's store (if they have one)
   */
  getMyStore: authenticatedProcedure
    .query(async ({ ctx }) => {
      const context = ctx as Context;
      const walletAddress = (ctx as any).walletAddress;

      // Find user by wallet address
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

      const store = await context.db.store.findFirst({
        where: { ownerId: user.id },
        include: {
          application: true,
          _count: {
            select: { products: true },
          },
        },
      });

      if (!store) {
        return null;
      }

      return {
        id: store.id,
        name: store.name,
        description: store.description,
        category: store.category,
        imageUrl: store.imageUrl,
        bannerUrl: store.bannerUrl,
        status: store.status,
        isScVerified: store.isScVerified,
        acceptsUC: store.acceptsUC,
        ucDiscountPercent: store.ucDiscountPercent,
        communityCommitmentPercent: store.communityCommitmentPercent,
        totalSales: store.totalSales,
        totalOrders: store.totalOrders,
        productCount: store._count.products,
        application: store.application ? {
          status: store.application.status,
          reviewNotes: store.application.reviewNotes,
          rejectionReason: store.application.rejectionReason,
          communityBenefitStatement: store.application.communityBenefitStatement,
        } : null,
        createdAt: store.createdAt,
      };
    }),

  /**
   * Apply to become a store
   */
  applyForStore: authenticatedProcedure
    .input(z.object({
      // Store info
      storeName: z.string().min(2).max(100),
      storeDescription: z.string().min(10).max(1000), // Required - what the store sells/offers
      category: StoreCategoryEnum,

      // Business info
      businessName: z.string().min(2),
      businessAddress: z.string().min(5),
      businessCity: z.string().min(2),
      businessState: z.string().min(2),
      businessZip: z.string().min(5),

      // Owner info
      ownerName: z.string().min(2),
      ownerEmail: z.string().email(),
      ownerPhone: z.string().min(10),

      // Application details
      communityBenefitStatement: z.string().min(20).max(2000), // How store benefits community
      communityCommitmentPercent: z.number().min(5).max(100), // Percentage committed to coop
      estimatedMonthlyRevenue: z.string().optional(),
      websiteUrl: z.preprocess(
        (val) => {
          // Convert empty/whitespace strings to undefined
          if (typeof val === "string") {
            const trimmed = val.trim();
            return trimmed === "" ? undefined : trimmed;
          }
          return val === "" ? undefined : val;
        },
        z.string().url("Please enter a valid URL (e.g., https://yourwebsite.com)").optional()
      ),
      socialMediaUrls: z.array(z.string().url()).optional(),

      // Documents (IPFS CIDs) - optional
      businessLicenseCID: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;
      const walletAddress = (ctx as any).walletAddress;

      // Find user by wallet address
      const user = await context.db.user.findUnique({
        where: { walletAddress },
        select: { id: true, status: true },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (user.status !== "ACTIVE") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Your account must be active to apply for a store",
        });
      }

      // Check if user already has a store
      const existingStore = await context.db.store.findFirst({
        where: { ownerId: user.id },
      });

      if (existingStore) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You already have a store application",
        });
      }

      // Create store and application in a transaction
      const store = await context.db.$transaction(async (tx) => {
        // Create the store with PENDING status
        const newStore = await tx.store.create({
          data: {
            ownerId: user.id,
            name: input.storeName,
            description: input.storeDescription,
            category: input.category as any,
            communityCommitmentPercent: input.communityCommitmentPercent,
            status: "PENDING",
          },
        });

        // Create the application
        await tx.storeApplication.create({
          data: {
            storeId: newStore.id,
            businessName: input.businessName,
            businessAddress: input.businessAddress,
            businessCity: input.businessCity,
            businessState: input.businessState,
            businessZip: input.businessZip,
            ownerName: input.ownerName,
            ownerEmail: input.ownerEmail,
            ownerPhone: input.ownerPhone,
            storeDescription: input.storeDescription,
            communityBenefitStatement: input.communityBenefitStatement,
            communityCommitmentPercent: input.communityCommitmentPercent,
            estimatedMonthlyRevenue: input.estimatedMonthlyRevenue || null,
            websiteUrl: input.websiteUrl || null, // Convert empty string to null
            socialMediaUrls: input.socialMediaUrls || [],
            businessLicenseCID: input.businessLicenseCID || null,
            status: "PENDING",
          },
        });

        return newStore;
      });

      return {
        success: true,
        storeId: store.id,
        message: "Store application submitted successfully. You will be notified once it's reviewed.",
      };
    }),

  /**
   * Get my products (for store owners)
   */
  getMyProducts: authenticatedProcedure
    .input(z.object({
      includeInactive: z.boolean().optional().default(false),
    }).optional())
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;
      const walletAddress = (ctx as any).walletAddress;

      // Find user's store
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

      const store = await context.db.store.findFirst({
        where: { ownerId: user.id },
      });

      if (!store) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "You don't have a store",
        });
      }

      const where: any = { storeId: store.id };
      if (!input?.includeInactive) {
        where.isActive = true;
      }

      const products = await context.db.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      return products.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        category: product.category,
        imageUrl: product.imageUrl,
        priceUSD: product.priceUSD,
        ucDiscountPrice: product.ucDiscountPrice,
        quantity: product.quantity,
        trackInventory: product.trackInventory,
        isActive: product.isActive,
        isFeatured: product.isFeatured,
        totalSold: product.totalSold,
        createdAt: product.createdAt,
      }));
    }),

  /**
   * Add a product to my store
   */
  addProduct: authenticatedProcedure
    .input(z.object({
      name: z.string().min(2).max(200),
      description: z.string().max(2000).optional(),
      category: ProductCategoryEnum,
      imageUrl: z.string().url().optional(),
      images: z.array(z.string().url()).optional(),
      priceUSD: z.number().positive(),
      ucDiscountPrice: z.number().positive().optional(),
      sku: z.string().optional(),
      quantity: z.number().int().min(0).optional().default(0),
      trackInventory: z.boolean().optional().default(true),
      allowBackorder: z.boolean().optional().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;
      const walletAddress = (ctx as any).walletAddress;

      // Find user's store
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

      const store = await context.db.store.findFirst({
        where: { ownerId: user.id },
      });

      if (!store) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "You don't have a store",
        });
      }

      if (store.status !== "APPROVED") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Your store must be approved before adding products",
        });
      }

      // Check if the category is admin-only
      const categoryConfig = await context.db.productCategoryConfig.findUnique({
        where: { key: input.category },
      });

      if (categoryConfig?.isAdminOnly) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This product category is restricted to admin use only",
        });
      }

      const product = await context.db.product.create({
        data: {
          storeId: store.id,
          name: input.name,
          description: input.description,
          category: input.category as any,
          imageUrl: input.imageUrl,
          images: input.images || [],
          priceUSD: input.priceUSD,
          ucDiscountPrice: input.ucDiscountPrice,
          sku: input.sku,
          quantity: input.quantity,
          trackInventory: input.trackInventory,
          allowBackorder: input.allowBackorder,
          isActive: true,
        },
      });

      return {
        success: true,
        product: {
          id: product.id,
          name: product.name,
        },
      };
    }),

  /**
   * Update a product
   */
  updateProduct: authenticatedProcedure
    .input(z.object({
      productId: z.string(),
      name: z.string().min(2).max(200).optional(),
      description: z.string().max(2000).optional(),
      category: ProductCategoryEnum.optional(),
      imageUrl: z.string().url().nullable().optional(),
      images: z.array(z.string().url()).optional(),
      priceUSD: z.number().positive().optional(),
      ucDiscountPrice: z.number().positive().nullable().optional(),
      sku: z.string().nullable().optional(),
      quantity: z.number().int().min(0).optional(),
      trackInventory: z.boolean().optional(),
      allowBackorder: z.boolean().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;
      const walletAddress = (ctx as any).walletAddress;

      // Find user's store
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

      const store = await context.db.store.findFirst({
        where: { ownerId: user.id },
      });

      if (!store) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "You don't have a store",
        });
      }

      // Verify product belongs to this store
      const product = await context.db.product.findUnique({
        where: { id: input.productId },
      });

      if (!product || product.storeId !== store.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      const { productId, ...updateData } = input;

      const updatedProduct = await context.db.product.update({
        where: { id: productId },
        data: updateData as any,
      });

      return {
        success: true,
        product: {
          id: updatedProduct.id,
          name: updatedProduct.name,
        },
      };
    }),

  /**
   * Delete a product
   */
  deleteProduct: authenticatedProcedure
    .input(z.object({
      productId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;
      const walletAddress = (ctx as any).walletAddress;

      // Find user's store
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

      const store = await context.db.store.findFirst({
        where: { ownerId: user.id },
      });

      if (!store) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "You don't have a store",
        });
      }

      // Verify product belongs to this store
      const product = await context.db.product.findUnique({
        where: { id: input.productId },
      });

      if (!product || product.storeId !== store.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      // Soft delete - just mark as inactive
      await context.db.product.update({
        where: { id: input.productId },
        data: { isActive: false },
      });

      return {
        success: true,
        message: "Product deleted",
      };
    }),

  // ══════════════════════════════════════════════════════════════
  // ADMIN ENDPOINTS - Store management
  // ══════════════════════════════════════════════════════════════

  /**
   * Get all store applications (admin)
   */
  getStoreApplications: privateProcedure
    .input(z.object({
      status: z.enum(["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"]).optional(),
      limit: z.number().min(1).max(100).optional().default(20),
      cursor: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;
      const { status, cursor } = input || {};
      const limit = input?.limit ?? 20;

      const where: any = {};
      if (status) {
        where.application = { status };
      }

      const stores = await context.db.store.findMany({
        where: {
          application: status ? { status } : { isNot: null },
        },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          application: true,
        },
      });

      let nextCursor: string | undefined;
      if (stores.length > limit) {
        const nextItem = stores.pop();
        nextCursor = nextItem?.id;
      }

      return {
        stores: stores.map((store) => ({
          id: store.id,
          name: store.name,
          description: store.description,
          category: store.category,
          status: store.application?.status || store.status, // Use application status for filtering display
          storeStatus: store.status,
          communityCommitmentPercent: store.communityCommitmentPercent,
          isScVerified: store.isScVerified,
          acceptsUC: store.acceptsUC,
          ucDiscountPercent: store.ucDiscountPercent,
          owner: store.owner,
          application: store.application,
          createdAt: store.createdAt,
        })),
        nextCursor,
      };
    }),

  /**
   * Approve a store application (admin)
   */
  approveStore: privateProcedure
    .input(z.object({
      storeId: z.string(),
      reviewNotes: z.string().optional(),
      grantScVerification: z.boolean().optional().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;

      const store = await context.db.store.findUnique({
        where: { id: input.storeId },
        include: { application: true },
      });

      if (!store || !store.application) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Store application not found",
        });
      }

      await context.db.$transaction([
        context.db.store.update({
          where: { id: input.storeId },
          data: {
            status: "APPROVED",
            isScVerified: input.grantScVerification,
            scVerifiedAt: input.grantScVerification ? new Date() : null,
          },
        }),
        context.db.storeApplication.update({
          where: { storeId: input.storeId },
          data: {
            status: "APPROVED",
            reviewedAt: new Date(),
            reviewNotes: input.reviewNotes,
          },
        }),
      ]);

      return {
        success: true,
        message: "Store approved successfully",
      };
    }),

  /**
   * Reject a store application (admin)
   */
  rejectStore: privateProcedure
    .input(z.object({
      storeId: z.string(),
      rejectionReason: z.string().min(10),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;

      const store = await context.db.store.findUnique({
        where: { id: input.storeId },
        include: { application: true },
      });

      if (!store || !store.application) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Store application not found",
        });
      }

      await context.db.$transaction([
        context.db.store.update({
          where: { id: input.storeId },
          data: {
            status: "REJECTED",
          },
        }),
        context.db.storeApplication.update({
          where: { storeId: input.storeId },
          data: {
            status: "REJECTED",
            reviewedAt: new Date(),
            rejectionReason: input.rejectionReason,
          },
        }),
      ]);

      return {
        success: true,
        message: "Store application rejected",
      };
    }),

  /**
   * Toggle SC verification for a store (admin)
   */
  toggleScVerification: privateProcedure
    .input(z.object({
      storeId: z.string(),
      verified: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;

      await context.db.store.update({
        where: { id: input.storeId },
        data: {
          isScVerified: input.verified,
          scVerifiedAt: input.verified ? new Date() : null,
        },
      });

      return {
        success: true,
        message: input.verified ? "Store SC verified" : "SC verification removed",
      };
    }),

  /**
   * Toggle featured status for a store (admin)
   */
  toggleFeatured: privateProcedure
    .input(z.object({
      storeId: z.string(),
      featured: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;

      await context.db.store.update({
        where: { id: input.storeId },
        data: {
          isFeatured: input.featured,
        },
      });

      return {
        success: true,
        message: input.featured ? "Store featured" : "Store unfeatured",
      };
    }),

  /**
   * Get all stores for admin management
   */
  getAllStores: privateProcedure
    .input(z.object({
      status: z.enum(["PENDING", "APPROVED", "SUSPENDED", "REJECTED"]).optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).optional().default(50),
      cursor: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;
      const { status, search, cursor } = input || {};
      const limit = input?.limit ?? 50;

      const where: any = {};
      if (status) {
        where.status = status;
      }
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { owner: { name: { contains: search, mode: "insensitive" } } },
          { owner: { email: { contains: search, mode: "insensitive" } } },
        ];
      }

      const stores = await context.db.store.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          _count: {
            select: {
              products: true,
              orders: true,
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (stores.length > limit) {
        const nextItem = stores.pop();
        nextCursor = nextItem?.id;
      }

      return {
        stores: stores.map((store) => ({
          id: store.id,
          name: store.name,
          description: store.description,
          category: store.category,
          status: store.status,
          isScVerified: store.isScVerified,
          isFeatured: store.isFeatured,
          acceptsUC: store.acceptsUC,
          ucDiscountPercent: store.ucDiscountPercent,
          communityCommitmentPercent: store.communityCommitmentPercent,
          owner: store.owner,
          productCount: store._count.products,
          orderCount: store._count.orders,
          createdAt: store.createdAt,
        })),
        nextCursor,
      };
    }),

  /**
   * Get all products for a store (admin)
   */
  getStoreProductsAdmin: privateProcedure
    .input(z.object({
      storeId: z.string(),
      includeInactive: z.boolean().optional().default(true),
    }))
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;

      const products = await context.db.product.findMany({
        where: {
          storeId: input.storeId,
          ...(input.includeInactive ? {} : { isActive: true }),
        },
        orderBy: [
          { isFeatured: "desc" },
          { createdAt: "desc" },
        ],
      });

      return products.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        category: product.category,
        imageUrl: product.imageUrl,
        priceUSD: product.priceUSD,
        compareAtPrice: product.compareAtPrice,
        quantity: product.quantity,
        isActive: product.isActive,
        isFeatured: product.isFeatured,
        totalSold: product.totalSold,
        createdAt: product.createdAt,
      }));
    }),

  /**
   * Toggle featured status for a product (admin)
   */
  toggleProductFeatured: privateProcedure
    .input(z.object({
      productId: z.string(),
      featured: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;

      const product = await context.db.product.update({
        where: { id: input.productId },
        data: {
          isFeatured: input.featured,
        },
        include: {
          store: {
            select: { name: true },
          },
        },
      });

      return {
        success: true,
        message: input.featured
          ? `"${product.name}" is now featured on the home page`
          : `"${product.name}" removed from featured`,
        product: {
          id: product.id,
          name: product.name,
          storeName: product.store.name,
          isFeatured: product.isFeatured,
        },
      };
    }),

  /**
   * Get featured products for home page (public)
   */
  getFeaturedProducts: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(20).optional().default(8),
    }).optional())
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;
      const limit = input?.limit ?? 8;

      const products = await context.db.product.findMany({
        where: {
          isFeatured: true,
          isActive: true,
          store: {
            status: "APPROVED",
          },
        },
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          store: {
            select: {
              id: true,
              name: true,
              isScVerified: true,
              acceptsUC: true,
              ucDiscountPercent: true,
            },
          },
        },
      });

      return products.map((product: any) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        imageUrl: product.imageUrl,
        priceUSD: product.priceUSD,
        compareAtPrice: product.compareAtPrice,
        ucDiscountPrice: product.ucDiscountPrice,
        store: product.store,
      }));
    }),

  /**
   * Update product (admin) - can set compareAtPrice
   */
  updateProductAdmin: privateProcedure
    .input(z.object({
      productId: z.string(),
      name: z.string().min(2).max(200).optional(),
      description: z.string().max(2000).optional(),
      priceUSD: z.number().positive().optional(),
      compareAtPrice: z.number().positive().nullable().optional(),
      isActive: z.boolean().optional(),
      isFeatured: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;
      const { productId, ...data } = input;

      const product = await context.db.product.update({
        where: { id: productId },
        data,
        include: {
          store: {
            select: { name: true },
          },
        },
      });

      return {
        success: true,
        product: {
          id: product.id,
          name: product.name,
          storeName: product.store.name,
        },
      };
    }),

  // ══════════════════════════════════════════════════════════════
  // ADMIN ENDPOINTS - Store and Product Management
  // ══════════════════════════════════════════════════════════════

  /**
   * Create a store (admin only) - bypasses application process
   */
  createStoreAdmin: privateProcedure
    .input(z.object({
      ownerId: z.string(),
      name: z.string().min(2).max(100),
      description: z.string().max(1000).optional(),
      category: StoreCategoryEnum,
      imageUrl: z.string().url().optional(),
      bannerUrl: z.string().url().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      website: z.string().url().optional(),
      communityCommitmentPercent: z.number().min(5).max(100).optional().default(10),
      acceptsUC: z.boolean().optional().default(true),
      ucDiscountPercent: z.number().min(0).max(100).optional().default(20),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;

      // Verify owner exists
      const owner = await context.db.user.findUnique({
        where: { id: input.ownerId },
      });

      if (!owner) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Owner user not found",
        });
      }

      // Check if owner already has a store
      const existingStore = await context.db.store.findFirst({
        where: { ownerId: input.ownerId },
      });

      if (existingStore) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This user already has a store",
        });
      }

      const store = await context.db.store.create({
        data: {
          ownerId: input.ownerId,
          name: input.name,
          description: input.description,
          category: input.category as any,
          imageUrl: input.imageUrl,
          bannerUrl: input.bannerUrl,
          address: input.address,
          city: input.city,
          state: input.state,
          zipCode: input.zipCode,
          phone: input.phone,
          email: input.email,
          website: input.website,
          communityCommitmentPercent: input.communityCommitmentPercent,
          acceptsUC: input.acceptsUC,
          ucDiscountPercent: input.ucDiscountPercent,
          status: "APPROVED", // Admin-created stores are auto-approved
        },
      });

      return {
        success: true,
        store: {
          id: store.id,
          name: store.name,
          status: store.status,
        },
      };
    }),

  /**
   * Add a product to any store (admin only) - can use admin-only categories
   */
  addProductAdmin: privateProcedure
    .input(z.object({
      storeId: z.string(),
      name: z.string().min(2).max(200),
      description: z.string().max(2000).optional(),
      category: ProductCategoryEnum,
      imageUrl: z.string().url().optional(),
      images: z.array(z.string().url()).optional(),
      priceUSD: z.number().positive(),
      compareAtPrice: z.number().positive().optional(),
      ucDiscountPrice: z.number().positive().optional(),
      sku: z.string().optional(),
      quantity: z.number().int().min(0).optional().default(0),
      trackInventory: z.boolean().optional().default(true),
      allowBackorder: z.boolean().optional().default(false),
      isActive: z.boolean().optional().default(true),
      isFeatured: z.boolean().optional().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;

      // Verify store exists
      const store = await context.db.store.findUnique({
        where: { id: input.storeId },
      });

      if (!store) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Store not found",
        });
      }

      // Admin can create products in any category, including admin-only ones
      const product = await context.db.product.create({
        data: {
          storeId: input.storeId,
          name: input.name,
          description: input.description,
          category: input.category as any,
          imageUrl: input.imageUrl,
          images: input.images || [],
          priceUSD: input.priceUSD,
          compareAtPrice: input.compareAtPrice,
          ucDiscountPrice: input.ucDiscountPrice,
          sku: input.sku,
          quantity: input.quantity,
          trackInventory: input.trackInventory,
          allowBackorder: input.allowBackorder,
          isActive: input.isActive,
          isFeatured: input.isFeatured,
        },
      });

      return {
        success: true,
        product: {
          id: product.id,
          name: product.name,
          category: product.category,
          priceUSD: product.priceUSD,
        },
      };
    }),

  // ══════════════════════════════════════════════════════════════
  // ORDER ENDPOINTS - Checkout & Order Management
  // ══════════════════════════════════════════════════════════════

  /**
   * Create an order from cart items
   * Supports payment via wallet balance, card, or hybrid (balance + card)
   */
  createOrder: authenticatedProcedure
    .input(z.object({
      storeId: z.string(),
      items: z.array(z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
      })).min(1),
      shippingAddress: z.string().optional(),
      note: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;
      const walletAddress = (ctx as any).walletAddress as string;

      console.log('\n🛒 createOrder - START');
      console.log('🏪 Store ID:', input.storeId);
      console.log('📦 Items:', input.items.length);

      // Get buyer
      const buyer = await context.db.user.findUnique({
        where: { walletAddress },
        include: { paymentMethods: true },
      });

      if (!buyer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Get store with owner
      const store = await context.db.store.findUnique({
        where: { id: input.storeId },
        include: {
          owner: {
            select: { id: true, walletAddress: true },
          },
        },
      });

      if (!store || store.status !== "APPROVED") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Store not found",
        });
      }

      // Validate all products and calculate totals
      const productIds = input.items.map(i => i.productId);
      const products = await context.db.product.findMany({
        where: {
          id: { in: productIds },
          storeId: input.storeId,
          isActive: true,
        },
      });

      if (products.length !== input.items.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Some products are unavailable",
        });
      }

      // Calculate totals
      let subtotalUSD = 0;
      const orderItems: Array<{
        productId: string;
        quantity: number;
        priceUSD: number;
        totalUSD: number;
      }> = [];

      for (const item of input.items) {
        const product = products.find(p => p.id === item.productId);
        if (!product) continue;

        // Check inventory
        if (product.trackInventory && product.quantity < item.quantity && !product.allowBackorder) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Not enough stock for "${product.name}"`,
          });
        }

        const itemTotal = product.priceUSD * item.quantity;
        subtotalUSD += itemTotal;
        orderItems.push({
          productId: product.id,
          quantity: item.quantity,
          priceUSD: product.priceUSD,
          totalUSD: itemTotal,
        });
      }

      const totalUSD = subtotalUSD; // Could add taxes/fees later
      const totalUC = convertUSDToUC(totalUSD);

      // Execute payment using p2p service
      // The p2p service handles:
      // - Checking buyer's balance
      // - JIT charging if insufficient balance (using default payment method)
      // - Minting UC after card charge
      // - Executing blockchain transfer
      let transactionHash: string | null = null;
      let fundingSource: 'BALANCE' | 'CARD' = 'BALANCE';

      try {
        console.log('💳 Processing payment for $', totalUSD);

        // Use the p2p service to handle the transfer
        // It automatically does JIT charging if buyer lacks balance
        const transferResult = await sendToSoulaanUser({
          senderId: buyer.id,
          recipientId: store.owner.id,
          amountUSD: totalUSD,
          note: `Order from ${store.name}`,
          transferType: 'STORE',
          transferMetadata: {
            storeName: store.name,
            storeId: store.id,
            itemCount: orderItems.length.toString(),
          },
        });

        transactionHash = transferResult.transactionHash;
        fundingSource = transferResult.fundingSource;

        console.log('✅ Payment complete:', transactionHash);
        console.log('💳 Funding source:', fundingSource);
      } catch (error: any) {
        console.error('❌ Payment failed:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Payment failed. Please try again.",
        });
      }

      // Determine payment type for the order record
      const paymentType = fundingSource === 'CARD' ? 'CARD' : 'UC_BALANCE';

      // Create order in database
      const order = await context.db.storeOrder.create({
        data: {
          storeId: store.id,
          buyerId: buyer.id,
          subtotalUSD,
          discountUSD: 0,
          totalUSD,
          totalUC,
          paymentMethod: paymentType,
          paymentStatus: 'COMPLETED',
          transactionHash,
          fulfillmentStatus: 'PENDING',
          shippingAddress: input.shippingAddress,
          note: input.note,
          items: {
            create: orderItems.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              priceUSD: item.priceUSD,
              totalUSD: item.totalUSD,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: { name: true, imageUrl: true },
              },
            },
          },
          store: {
            select: { name: true, imageUrl: true },
          },
        },
      });

      // Update product inventory
      for (const item of orderItems) {
        const product = products.find(p => p.id === item.productId);
        if (product?.trackInventory) {
          await context.db.product.update({
            where: { id: item.productId },
            data: {
              quantity: { decrement: item.quantity },
              totalSold: { increment: item.quantity },
            },
          });
        }
      }

      // Update store stats
      await context.db.store.update({
        where: { id: store.id },
        data: {
          totalSales: { increment: totalUSD },
          totalOrders: { increment: 1 },
        },
      });

      // Award SC rewards if store is SC-verified (after order is created)
      if (store.isScVerified) {
        try {
          await awardStoreTransactionReward(
            buyer.id,
            store.owner.id,
            totalUSD,
            true,
            order.id,  // Pass orderId
            store.id   // Pass storeId
          );
          console.log('🪙 SC rewards distributed and tracked');
        } catch (error) {
          console.error('Failed to award SC (non-critical):', error);
        }
      }

      // Create notifications
      await context.db.notification.createMany({
        data: [
          {
            userId: buyer.id,
            type: 'ORDER_PLACED',
            title: 'Order Placed',
            body: `Your order from ${store.name} for $${totalUSD.toFixed(2)} has been placed.`,
            data: { orderId: order.id, storeId: store.id, amount: totalUSD },
          },
          {
            userId: store.owner.id,
            type: 'ORDER_RECEIVED',
            title: 'New Order',
            body: `You have a new order for $${totalUSD.toFixed(2)}.`,
            data: { orderId: order.id, amount: totalUSD },
          },
        ],
      });

      console.log('🎉 Order created:', order.id);

      return {
        success: true,
        orderId: order.id,
        order: {
          id: order.id,
          totalUSD: order.totalUSD,
          paymentMethod: order.paymentMethod,
          transactionHash: order.transactionHash,
          fulfillmentStatus: order.fulfillmentStatus,
          items: order.items.map(item => ({
            productId: item.productId,
            productName: item.product.name,
            quantity: item.quantity,
            priceUSD: item.priceUSD,
            totalUSD: item.totalUSD,
          })),
          store: order.store,
          createdAt: order.createdAt.toISOString(),
        },
      };
    }),

  /**
   * Get buyer's order history
   */
  getMyOrders: authenticatedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).optional().default(20),
      cursor: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;
      const walletAddress = (ctx as any).walletAddress as string;
      const { limit, cursor } = input || { limit: 20 };

      const buyer = await context.db.user.findUnique({
        where: { walletAddress },
      });

      if (!buyer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const orders = await context.db.storeOrder.findMany({
        where: { buyerId: buyer.id },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: 'desc' },
        include: {
          store: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
            },
          },
          items: {
            include: {
              product: {
                select: { name: true, imageUrl: true },
              },
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (orders.length > limit) {
        const nextItem = orders.pop();
        nextCursor = nextItem?.id;
      }

      return {
        orders: orders.map(order => ({
          id: order.id,
          totalUSD: order.totalUSD,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          fulfillmentStatus: order.fulfillmentStatus,
          itemCount: order.items.length,
          store: order.store,
          items: order.items.map(item => ({
            productName: item.product.name,
            productImage: item.product.imageUrl,
            quantity: item.quantity,
            priceUSD: item.priceUSD,
          })),
          createdAt: order.createdAt.toISOString(),
        })),
        nextCursor,
      };
    }),

  /**
   * Get single order details
   */
  getOrder: authenticatedProcedure
    .input(z.object({
      orderId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;
      const walletAddress = (ctx as any).walletAddress as string;

      const user = await context.db.user.findUnique({
        where: { walletAddress },
        include: {
          stores: { select: { id: true } },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const order = await context.db.storeOrder.findUnique({
        where: { id: input.orderId },
        include: {
          store: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              ownerId: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                },
              },
            },
          },
        },
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      // Check if user is buyer or store owner
      const isBuyer = order.buyerId === user.id;
      const isStoreOwner = order.store.ownerId === user.id;

      if (!isBuyer && !isStoreOwner) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this order",
        });
      }

      return {
        id: order.id,
        subtotalUSD: order.subtotalUSD,
        discountUSD: order.discountUSD,
        totalUSD: order.totalUSD,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        transactionHash: order.transactionHash,
        fulfillmentStatus: order.fulfillmentStatus,
        shippingAddress: order.shippingAddress,
        trackingNumber: order.trackingNumber,
        note: order.note,
        store: {
          id: order.store.id,
          name: order.store.name,
          imageUrl: order.store.imageUrl,
        },
        items: order.items.map(item => ({
          id: item.id,
          productId: item.product.id,
          productName: item.product.name,
          productImage: item.product.imageUrl,
          quantity: item.quantity,
          priceUSD: item.priceUSD,
          totalUSD: item.totalUSD,
        })),
        isBuyer,
        isStoreOwner,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      };
    }),

  /**
   * Get store's incoming orders (for store owners)
   */
  getStoreOrders: authenticatedProcedure
    .input(z.object({
      status: z.enum(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional(),
      limit: z.number().min(1).max(50).optional().default(20),
      cursor: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;
      const walletAddress = (ctx as any).walletAddress as string;
      const { status, limit, cursor } = input || { limit: 20 };

      const user = await context.db.user.findUnique({
        where: { walletAddress },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const store = await context.db.store.findFirst({
        where: { ownerId: user.id },
      });

      if (!store) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "You don't have a store",
        });
      }

      const where: any = { storeId: store.id };
      if (status) where.fulfillmentStatus = status;

      const orders = await context.db.storeOrder.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              product: {
                select: { name: true },
              },
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (orders.length > limit) {
        const nextItem = orders.pop();
        nextCursor = nextItem?.id;
      }

      return {
        orders: orders.map(order => ({
          id: order.id,
          totalUSD: order.totalUSD,
          paymentStatus: order.paymentStatus,
          fulfillmentStatus: order.fulfillmentStatus,
          itemCount: order.items.length,
          itemSummary: order.items.slice(0, 2).map(i => i.product.name).join(', '),
          shippingAddress: order.shippingAddress,
          createdAt: order.createdAt.toISOString(),
        })),
        nextCursor,
      };
    }),

  /**
   * Update order fulfillment status (for store owners)
   */
  updateOrderStatus: authenticatedProcedure
    .input(z.object({
      orderId: z.string(),
      status: z.enum(['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
      trackingNumber: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;
      const walletAddress = (ctx as any).walletAddress as string;

      const user = await context.db.user.findUnique({
        where: { walletAddress },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const store = await context.db.store.findFirst({
        where: { ownerId: user.id },
      });

      if (!store) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "You don't have a store",
        });
      }

      const order = await context.db.storeOrder.findUnique({
        where: { id: input.orderId },
      });

      if (!order || order.storeId !== store.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      const updatedOrder = await context.db.storeOrder.update({
        where: { id: input.orderId },
        data: {
          fulfillmentStatus: input.status,
          trackingNumber: input.trackingNumber,
        },
      });

      // Create notification for buyer
      const statusMessages: Record<string, string> = {
        PROCESSING: 'is being processed',
        SHIPPED: 'has been shipped',
        DELIVERED: 'has been delivered',
        CANCELLED: 'has been cancelled',
      };

      await context.db.notification.create({
        data: {
          userId: order.buyerId,
          type: 'ORDER_STATUS_UPDATE',
          title: 'Order Update',
          body: `Your order ${statusMessages[input.status]}.${input.trackingNumber ? ` Tracking: ${input.trackingNumber}` : ''}`,
          data: {
            orderId: order.id,
            status: input.status,
            trackingNumber: input.trackingNumber,
          },
        },
      });

      return {
        success: true,
        order: {
          id: updatedOrder.id,
          fulfillmentStatus: updatedOrder.fulfillmentStatus,
          trackingNumber: updatedOrder.trackingNumber,
        },
      };
    }),
});
