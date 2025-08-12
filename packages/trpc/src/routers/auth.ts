import { z } from "zod";
import { Context } from "../context";
import { publicProcedure } from "../procedures";
import { router } from "../trpc";

const signupInput = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  businessAccount: z.boolean().default(false),
  privyId: z.string().optional(),
});

const loginOrSignupInput = z.object({
  email: z.string().email(),
  privyId: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  businessAccount: z.boolean().default(false),
});

export const authRouter = router({
  signup: publicProcedure
    .input(signupInput)
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;
      
      // Check if user already exists
      const existingUser = await context.db.user.findUnique({
        where: { email: input.email }
      });
      
      if (existingUser) {
        throw new Error("User already exists with this email");
      }
      
      // Create new user with verification status false (admin will verify)
      const user = await context.db.user.create({
        data: {
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          businessAccount: input.businessAccount,
          role: input.businessAccount ? "business" : "user",
          privyId: input.privyId,
          isVerified: false, // Users need admin verification
          name: input.lastName ? `${input.firstName} ${input.lastName}` : input.firstName,
        },
      });
      
      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isVerified: user.isVerified,
          businessAccount: user.businessAccount,
        },
      };
    }),

  loginOrSignup: publicProcedure
    .input(loginOrSignupInput)
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;
      
      // Check if user already exists
      let existingUser = await context.db.user.findUnique({
        where: { email: input.email }
      });
      
      // If user exists, update their Privy ID and return them
      if (existingUser) {
        // Update Privy ID if it's different
        if (existingUser.privyId !== input.privyId) {
          existingUser = await context.db.user.update({
            where: { id: existingUser.id },
            data: { privyId: input.privyId },
          });
        }
        
        return {
          success: true,
          isNewUser: false,
          user: {
            id: existingUser.id,
            email: existingUser.email,
            name: existingUser.name,
            isVerified: existingUser.isVerified,
            businessAccount: existingUser.businessAccount,
            firstName: existingUser.firstName,
            lastName: existingUser.lastName,
          },
        };
      }
      
      // Create new user if they don't exist
      const user = await context.db.user.create({
        data: {
          email: input.email,
          firstName: input.firstName || "",
          lastName: input.lastName,
          phone: input.phone,
          businessAccount: input.businessAccount,
          role: input.businessAccount ? "business" : "user",
          privyId: input.privyId,
          isVerified: false, // Users need admin verification
          name: input.lastName ? `${input.firstName} ${input.lastName}` : (input.firstName || input.email.split('@')[0]),
        },
      });
      
      return {
        success: true,
        isNewUser: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isVerified: user.isVerified,
          businessAccount: user.businessAccount,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      };
    }),

  checkVerification: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;
      
      const user = await context.db.user.findUnique({
        where: { email: input.email },
        select: { isVerified: true, id: true, email: true, name: true }
      });
      
      return {
        user: user || null,
        isVerified: user?.isVerified || false,
      };
    }),
});