import { PrismaClient } from "@prisma/client";
export * from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const db =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: ["query", "error", "warn"],
        // Optimize for Neon database connections
    });

// Graceful shutdown
process.on('beforeExit', async () => {
    await db.$disconnect();
});

process.on('SIGINT', async () => {
    await db.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await db.$disconnect();
    process.exit(0);
});

export { PrismaClient as PrismaClientSingleton };

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
