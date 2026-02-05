import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding database...')

    // Create admin user
    const admin = await prisma.user.create({
        data: {
            imieNazwisko: 'Administrator Systemu',
            haslo: 'admin123', // In production, this should be hashed
            rola: 'ADMINISTRATOR',
        },
    })

    // Create coordinator
    const coord = await prisma.user.create({
        data: {
            imieNazwisko: 'Zuzanna Koordynatorka',
            haslo: 'coord123',
            rola: 'KOORDYNATORKA',
        },
    })

    // Create participants
    const user1 = await prisma.user.create({
        data: {
            imieNazwisko: 'Anna Nowak',
            haslo: 'user123',
            rola: 'UCZESTNICZKA',
        },
    })

    const user2 = await prisma.user.create({
        data: {
            imieNazwisko: 'Maria Kowalska',
            haslo: 'user123',
            rola: 'UCZESTNICZKA',
        },
    })

    // Create teams
    const team1 = await prisma.team.create({
        data: {
            nazwa: 'Zespół Social Media',
        },
    })

    const team2 = await prisma.team.create({
        data: {
            nazwa: 'Zespół Matki',
        },
    })

    // Add users to teams
    await prisma.userTeam.createMany({
        data: [
            { userId: coord.id, teamId: team1.id, rola: 'koordynatorka' },
            { userId: user1.id, teamId: team1.id, rola: 'uczestniczka' },
            { userId: user2.id, teamId: team1.id, rola: 'uczestniczka' },
            { userId: coord.id, teamId: team2.id, rola: 'koordynatorka' },
        ],
    })

    // Create some tasks
    await prisma.task.createMany({
        data: [
            {
                teamId: team1.id,
                tytul: 'Przygotowanie grafiki',
                opis: 'Stworzenie grafik na social media',
                termin: new Date('2026-02-21'),
                priorytet: 'WYSOKI',
                utworzonePrzez: admin.imieNazwisko,
                utworzonePrzezId: admin.id,
                status: 'AKTYWNE',
            },
            {
                teamId: team2.id,
                tytul: 'Analityka matek',
                opis: 'Analiza danych dotyczących matek w projekcie',
                termin: new Date('2026-02-19'),
                priorytet: 'NISKI',
                utworzonePrzez: admin.imieNazwisko,
                utworzonePrzezId: admin.id,
                status: 'AKTYWNE',
            },
            {
                teamId: team1.id,
                tytul: 'Post walentynkowy',
                opis: 'Grafika i tekst na walentynki',
                termin: new Date('2026-02-14'),
                priorytet: 'NORMALNY',
                utworzonePrzez: coord.imieNazwisko,
                utworzonePrzezId: coord.id,
                status: 'AKTYWNE',
            }
        ],
    })

    // Create announcements
    await prisma.announcement.createMany({
        data: [
            {
                teamId: team1.id,
                tytul: 'Spotkanie zespołu',
                tresc: 'Zapraszamy na spotkanie w przyszły wtorek o 18:00',
                utworzonePrzez: coord.imieNazwisko,
            },
        ],
    })

    // Create events
    await prisma.event.create({
        data: {
            nazwa: 'Warsztaty fotograficzne',
            data: new Date('2026-03-15T10:00:00'),
            limitOsob: 20,
        },
    })

    console.log('✅ Database seeded successfully!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
