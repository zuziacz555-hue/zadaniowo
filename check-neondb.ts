import { PrismaClient } from './src/lib/generated/client2'
// Override URL for this run
process.env.DATABASE_URL = "postgresql://neondb_owner:npg_LeN2knvQHlq6@ep-weathered-cell-aiv25bye-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";
const prisma = new PrismaClient()
async function main() {
    try {
        const users = await prisma.user.findMany()
        console.log('USERS IN NEONDB:', JSON.stringify(users, null, 2))
    } catch (e) {
        console.log('Error checking NEONDB:', e.message)
    }
}
main().finally(() => prisma.$disconnect())
