import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { Context } from "../context.js";
import { publicProcedure, privateProcedure, authenticatedProcedure } from "../procedures/index.js";
import { router } from "../trpc.js";

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
            status: "ACTIVE" as any,
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
});
