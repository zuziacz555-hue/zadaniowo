import { PrismaClient } from './src/lib/generated/client2'
const prisma = new PrismaClient()

async function main() {
    const users = await prisma.user.findMany()
    const settings = await prisma.systemSettings.findFirst()
    console.log('SETTINGS:', JSON.stringify(settings, null, 2))
    console.log('USERS:', JSON.stringify(users.map(u => ({ id: u.id, name: u.imieNazwisko, role: u.rola })), null, 2))
}
main().finally(() => prisma.$disconnect())
