import { z } from "zod";
import { router } from "../trpc.js";
import { publicProcedure } from "../procedures/index.js";
import { sendWaitlistWelcomeEmail } from "../services/email-service.js";

export const waitlistRouter = router({
  sendWelcomeEmail: publicProcedure
    .input(z.object({ email: z.string().email(), coopId: z.string().optional() }))
    .mutation(async ({ input }) => {
      await sendWaitlistWelcomeEmail(input.email, input.coopId);
      return { success: true };
    }),
});
