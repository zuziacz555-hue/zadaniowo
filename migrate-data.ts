import { PrismaClient } from './src/lib/generated/client2'

const prisma = new PrismaClient()

async function main() {
    console.log('--- Migrating Data to Neon ---')

    // Clean up existing teams and users (except seeded Admin/System if they match)
    // Actually, it's better to just add missing ones or reset if user allows.
    // Given the user wants "restored" state, let's try to match SQLite.

    // 1. Clear existing data to avoid conflicts with IDs
    await prisma.userTeam.deleteMany()
    await prisma.task.deleteMany()
    await prisma.announcement.deleteMany()
    await prisma.team.deleteMany()
    await prisma.user.deleteMany()

    console.log('Cleaned up Neon database.')

    // 2. Insert Users
    const users = [
        { id: 1, imieNazwisko: "Administrator Systemu", haslo: "admin123", rola: "ADMINISTRATOR" },
        { id: 6, imieNazwisko: "maciek", haslo: "maciek", rola: "UCZESTNICZKA" },
        { id: 7, imieNazwisko: "pawel", haslo: "pawel", rola: "UCZESTNICZKA" }
    ]

    for (const u of users) {
        await prisma.user.create({ data: u })
    }
    console.log('Migrated Users.')

    // 3. Insert Teams
    const teams = [
        { id: 1, nazwa: "Zespół Social Media" },
        { id: 2, nazwa: "Zespół Matki" },
        { id: 3, nazwa: "zespoł totalnych pojebów" }
    ]

    for (const t of teams) {
        await prisma.team.create({ data: t })
    }
    console.log('Migrated Teams.')

    // 4. Insert UserTeams
    const userTeams = [
        { id: 9, userId: 6, teamId: 1, rola: "koordynatorka" },
        { id: 11, userId: 7, teamId: 2, rola: "uczestniczka" },
        { id: 12, userId: 7, teamId: 3, rola: "koordynatorka" },
        { id: 13, userId: 6, teamId: 2, rola: "uczestniczka" },
        { id: 14, userId: 6, teamId: 3, rola: "uczestniczka" },
        { id: 15, userId: 7, teamId: 1, rola: "uczestniczka" }
    ]

    for (const ut of userTeams) {
        await prisma.userTeam.create({ data: ut })
    }
    console.log('Migrated User-Team associations.')

    console.log('✅ Migration completed successfully!')
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())
