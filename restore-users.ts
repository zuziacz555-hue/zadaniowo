import { PrismaClient } from './src/lib/generated/client2'

const prisma = new PrismaClient()

async function main() {
    console.log('Restoring users and teams...')

    // Cleanup
    await prisma.userTeam.deleteMany()
    await prisma.user.deleteMany()
    await prisma.team.deleteMany()

    // Create Teams
    const team1 = await prisma.team.create({
        data: {
            nazwa: 'Zespół Główny',
            kolor: '#5400FF',
        },
    })

    const team2 = await prisma.team.create({
        data: {
            nazwa: 'Zespół Social Media',
            kolor: '#FF00A8',
        },
    })

    // Create Administrator
    const admin = await prisma.user.create({
        data: {
            imieNazwisko: 'Administrator Systemu',
            haslo: 'admin123',
            rola: 'ADMINISTRATOR',
        },
    })

    // Create Coordinator
    const zuzanna = await prisma.user.create({
        data: {
            imieNazwisko: 'Zuzanna',
            haslo: 'zuzia123',
            rola: 'KOORDYNATORKA',
        },
    })

    // Assign Zuzanna to teams
    await prisma.userTeam.create({
        data: {
            userId: zuzanna.id,
            teamId: team1.id,
            rola: 'koordynatorka',
        },
    })

    // Other Users
    const otherUsers = ['Kasia', 'Zosia', 'Nikola', 'Wiktoria', 'Anita', 'Ania']

    for (const name of otherUsers) {
        const user = await prisma.user.create({
            data: {
                imieNazwisko: name,
                haslo: 'user123',
                rola: 'UCZESTNICZKA',
            },
        })

        // Assign to team1
        await prisma.userTeam.create({
            data: {
                userId: user.id,
                teamId: team1.id,
                rola: 'uczestniczka',
            },
        })
    }

    console.log('Restoration complete!')
    console.log('Users created:', [admin.imieNazwisko, zuzanna.imieNazwisko, ...otherUsers])
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
