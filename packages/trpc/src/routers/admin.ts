import { createTRPCRouter, privateProcedure } from "../trpc";
import { z } from "zod";

// Mock data - in a real app, this would come from a database or smart contract
const mockMembers = [
  { id: "1", address: "0x1234...5678", status: "Active" },
  { id: "2", address: "0xabcd...efgh", status: "Suspended" },
  { id: "3", address: "0x9876...5432", status: "Banned" },
];

const mockRedemptions = [
    { id: "req-1", user: "0x1234...5678", amount: "100 UC", date: "2023-10-26", status: "Pending" },
    { id: "req-2", user: "0xabcd...efgh", amount: "250 UC", date: "2023-10-25", status: "Pending" },
    { id: "req-3", user: "0x9012...5432", amount: "1200 UC", date: "2023-10-26", status: "Needs Review", reason: "High amount" },
];

export const adminRouter = createTRPCRouter({
  getMembers: privateProcedure.query(async () => {
    // In a real app, you would fetch members from the SoulaaniCoin contract
    return mockMembers;
  }),

  updateMemberStatus: privateProcedure
    .input(z.object({ id: z.string(), status: z.string() }))
    .mutation(async ({ input }) => {
      // In a real app, you would call the setMemberStatus function on the SoulaaniCoin contract
      console.log(`Updating member ${input.id} to status ${input.status}`);
      const member = mockMembers.find((m) => m.id === input.id);
      if (member) {
        member.status = input.status;
      }
      return member;
    }),
  
  getRedemptionRequests: privateProcedure.query(async () => {
    // In a real app, you'd fetch this from your smart contract events or a database
    return mockRedemptions;
  }),

  processRedemption: privateProcedure
    .input(z.object({ id: z.string(), action: z.string() }))
    .mutation(async ({ input }) => {
      // In a real app, you would call the corresponding smart contract function
      console.log(`Processing redemption ${input.id} with action: ${input.action}`);
      const index = mockRedemptions.findIndex((r) => r.id === input.id);
      if (index > -1) {
        mockRedemptions.splice(index, 1);
      }
      return { success: true, id: input.id, action: input.action };
    }),
});
