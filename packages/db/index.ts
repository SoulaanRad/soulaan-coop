import { PrismaClient } from "@prisma/client";

export * from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma Client will automatically use DATABASE_URL from process.env
const prisma =
  globalForPrisma?.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });


// Graceful shutdown
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export { PrismaClient as PrismaClientSingleton };

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Export db for use in the application
export const db = prisma;
export { prisma };
