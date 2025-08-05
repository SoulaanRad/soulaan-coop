import { PrismaClient } from "@prisma/client";
export * from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: ["query", "error", "warn"],
        // Optimize for Neon database connections
    });

// Graceful shutdown
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});

process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

export { PrismaClient as PrismaClientSingleton };

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export { prisma as db };
