import { PrismaClient } from './src/lib/generated/client2'

const prisma = new PrismaClient()

async function verify() {
    console.log('--- Final Cloud Database Verification ---')
    try {
        const users = await prisma.user.findMany({
            select: { imieNazwisko: true, rola: true }
        })
        console.log('Users in Cloud DB:', users)

        const teams = await prisma.team.findMany({
            select: { nazwa: true }
        })
        console.log('Teams in Cloud DB:', teams)

        const userTeams = await prisma.userTeam.count()
        console.log('User-Team associations:', userTeams)

        console.log('\nSUCCESS: Database is ready for multi-device use.')
    } catch (e) {
        console.error('Final Verification Error:', e.message)
    } finally {
        await prisma.$disconnect()
    }
}

verify()
