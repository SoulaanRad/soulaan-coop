import { z } from "zod";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";

import { Context } from "../context.js";
import { publicProcedure } from "../procedures/index.js";
import { router } from "../trpc.js";
import { sendLoginCode, generateLoginCode, isEmailConfigured } from "../lib/email.js";

export const authRouter = router({
  /**
   * Login endpoint that checks user status
   */
  login: publicProcedure
    .input(z.object({
      email: z.string().email("Invalid email address"),
      password: z.string().min(1, "Password is required"),
    }))
    .output(z.object({
      success: z.boolean(),
      message: z.string(),
      user: z.object({
        id: z.string(),
        email: z.string(),
        name: z.string().nullable(),
        roles: z.array(z.string()),
        status: z.string(),
        walletAddress: z.string().nullable(),
        phone: z.string().nullable(),
        createdAt: z.date(),
      }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;
      
      try {
        // Find user by email
        const user = await context.db.user.findUnique({
          where: { email: input.email },
        });

        if (!user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          });
        }

        // Check if user has a password (should exist for new applications)
        if (!user.password) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(input.password, user.password);
        if (!isValidPassword) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          });
        }

        // Check user status
        if (user.status === "PENDING") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Your application is still under review. You will be notified once it's approved.",
          });
        }

        if (user.status === "REJECTED") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Your application was not approved. Please contact support for more information.",
          });
        }

        if (user.status === "SUSPENDED") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Your account has been suspended. Please contact support.",
          });
        }

        // User is active, allow login
        return {
          success: true,
          message: "Login successful",
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            roles: user.roles,
            status: user.status,
            walletAddress: user.walletAddress,
            phone: user.phone,
            createdAt: user.createdAt,
          },
        };
      } catch (error) {
        console.error("Login error:", error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Login failed. Please try again.",
        });
      }
    }),

  /**
   * Check if user can login (status check)
   */
  checkLoginStatus: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .output(z.object({
      canLogin: z.boolean(),
      status: z.string(),
      message: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;
      
      const user = await context.db.user.findUnique({
        where: { email: input.email },
        select: { status: true },
      });

      if (!user) {
        return {
          canLogin: false,
          status: "NOT_FOUND",
          message: "User not found",
        };
      }

      switch (user.status) {
        case "ACTIVE":
          return {
            canLogin: true,
            status: user.status,
            message: "Account is active",
          };
        case "PENDING":
          return {
            canLogin: false,
            status: user.status,
            message: "Application is under review",
          };
        case "REJECTED":
          return {
            canLogin: false,
            status: user.status,
            message: "Application was not approved",
          };
        case "SUSPENDED":
          return {
            canLogin: false,
            status: user.status,
            message: "Account is suspended",
          };
        default:
          return {
            canLogin: false,
            status: user.status,
            message: "Unknown status",
          };
      }
    }),

  /**
   * Request login code (passwordless authentication)
   */
  requestLoginCode: publicProcedure
    .input(z.object({
      email: z.string().email("Invalid email address"),
    }))
    .output(z.object({
      success: z.boolean(),
      message: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;

      try {
        // Find user by email
        const user = await context.db.user.findUnique({
          where: { email: input.email },
          select: { id: true, status: true },
        });

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No account found with this email address",
          });
        }

        // Check user status
        if (user.status === "PENDING") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Your application is still under review. You will be notified once it's approved.",
          });
        }

        if (user.status === "REJECTED") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Your application was not approved. Please contact support for more information.",
          });
        }

        if (user.status === "SUSPENDED") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Your account has been suspended. Please contact support.",
          });
        }

        // Generate 6-digit code
        const code = generateLoginCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store code in database
        await context.db.loginCode.create({
          data: {
            email: input.email,
            code,
            expiresAt,
          },
        });

        // Send email with code (only if email is configured)
        if (isEmailConfigured()) {
          await sendLoginCode(input.email, code);
        } else {
          // In development, log the code to console
          console.log(`[DEV] Login code for ${input.email}: ${code}`);
        }

        return {
          success: true,
          message: "Login code sent to your email",
        };
      } catch (error) {
        console.error("Request login code error:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send login code. Please try again.",
        });
      }
    }),

  /**
   * Verify login code and authenticate user
   */
  verifyLoginCode: publicProcedure
    .input(z.object({
      email: z.string().email("Invalid email address"),
      code: z.string().length(6, "Code must be 6 digits"),
    }))
    .output(z.object({
      success: z.boolean(),
      message: z.string(),
      user: z.object({
        id: z.string(),
        email: z.string(),
        name: z.string().nullable(),
        roles: z.array(z.string()),
        status: z.string(),
        walletAddress: z.string().nullable(),
        phone: z.string().nullable(),
        createdAt: z.date(),
      }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;

      try {
        // Find the login code
        const loginCode = await context.db.loginCode.findFirst({
          where: {
            email: input.email,
            code: input.code,
            used: false,
            expiresAt: {
              gt: new Date(), // Not expired
            },
          },
        });

        if (!loginCode) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid or expired code",
          });
        }

        // Mark code as used
        await context.db.loginCode.update({
          where: { id: loginCode.id },
          data: { used: true },
        });

        // Get user
        const user = await context.db.user.findUnique({
          where: { email: input.email },
        });

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        // Final status check
        if (user.status !== "ACTIVE") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Account is not active",
          });
        }

        return {
          success: true,
          message: "Login successful",
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            roles: user.roles,
            status: user.status,
            walletAddress: user.walletAddress,
            phone: user.phone,
            createdAt: user.createdAt,
          },
        };
      } catch (error) {
        console.error("Verify login code error:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Login failed. Please try again.",
        });
      }
    }),
});
