import { PrismaClient } from './generated/client2'

const globalForPrisma = globalThis as unknown as {
    prisma_v2: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma_v2 ?? new PrismaClient({
    log: ['query', 'error', 'warn'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma_v2 = prisma
