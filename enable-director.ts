import { PrismaClient } from './src/lib/generated/client2'
const prisma = new PrismaClient()

async function main() {
    console.log('Enabling Director role...')
    await prisma.systemSettings.upsert({
        where: { id: 1 },
        update: { enableDirectorRole: true },
        create: { id: 1, enableDirectorRole: true }
    })
    console.log('Director role enabled.')
}

main().finally(() => prisma.$disconnect())
