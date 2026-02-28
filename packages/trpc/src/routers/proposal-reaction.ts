import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router } from "../trpc.js";
import { authenticatedProcedure, publicProcedure } from "../procedures/index.js";
import { ReactionType } from "@repo/db";
import type { AuthenticatedContext } from "../context.js";

export const proposalReactionRouter = router({
  /**
   * Upsert a reaction (toggle off if same reaction already exists)
   */
  upsert: authenticatedProcedure
    .input(z.object({
      proposalId: z.string().min(1),
      reaction: z.enum(["SUPPORT", "CONCERN"]),
    }))
    .output(z.object({
      support: z.number(),
      concern: z.number(),
      myReaction: z.enum(["SUPPORT", "CONCERN"]).nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { walletAddress } = ctx as AuthenticatedContext;

      // Verify proposal exists
      const proposal = await ctx.db.proposal.findUnique({ where: { id: input.proposalId } });
      if (!proposal) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proposal not found" });
      }

      // Check if existing reaction
      const existing = await ctx.db.proposalReaction.findUnique({
        where: { proposalId_voterWallet: { proposalId: input.proposalId, voterWallet: walletAddress } },
      });

      let myReaction: "SUPPORT" | "CONCERN" | null = null;

      if (existing && existing.reaction === input.reaction) {
        // Toggle off: delete the reaction
        await ctx.db.proposalReaction.delete({
          where: { proposalId_voterWallet: { proposalId: input.proposalId, voterWallet: walletAddress } },
        });
        myReaction = null;
      } else {
        // Upsert (create or replace)
        await ctx.db.proposalReaction.upsert({
          where: { proposalId_voterWallet: { proposalId: input.proposalId, voterWallet: walletAddress } },
          create: {
            proposalId: input.proposalId,
            voterWallet: walletAddress,
            reaction: input.reaction as ReactionType,
          },
          update: {
            reaction: input.reaction as ReactionType,
          },
        });
        myReaction = input.reaction;
      }

      // Return updated counts
      const counts = await getCounts(ctx.db, input.proposalId);
      return { ...counts, myReaction };
    }),

  /**
   * Get reaction counts for a proposal, with optional current user's reaction
   */
  getCounts: publicProcedure
    .input(z.object({
      proposalId: z.string().min(1),
      walletAddress: z.string().optional(),
    }))
    .output(z.object({
      support: z.number(),
      concern: z.number(),
      myReaction: z.enum(["SUPPORT", "CONCERN"]).nullable(),
    }))
    .query(async ({ input, ctx }) => {
      const counts = await getCounts(ctx.db, input.proposalId);
      let myReaction: "SUPPORT" | "CONCERN" | null = null;

      if (input.walletAddress) {
        const existing = await ctx.db.proposalReaction.findUnique({
          where: { proposalId_voterWallet: { proposalId: input.proposalId, voterWallet: input.walletAddress } },
        });
        if (existing) {
          myReaction = existing.reaction as "SUPPORT" | "CONCERN";
        }
      }

      return { ...counts, myReaction };
    }),
});

async function getCounts(db: any, proposalId: string) {
  const [support, concern] = await Promise.all([
    db.proposalReaction.count({ where: { proposalId, reaction: "SUPPORT" } }),
    db.proposalReaction.count({ where: { proposalId, reaction: "CONCERN" } }),
  ]);
  return { support, concern };
}
