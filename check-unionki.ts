import { PrismaClient } from './src/lib/generated/client2'
const prisma = new PrismaClient()
async function main() {
    const users = await prisma.user.findMany()
    console.log('USERS IN DB:', JSON.stringify(users, null, 2))
}
main().finally(() => prisma.$disconnect())
