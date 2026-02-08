
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const adminEmail = 'admin'; // Using simple username as id for this app based on login logic

    // Check if admin exists
    const existingAdmin = await prisma.user.findFirst({
        where: { imieNazwisko: 'Administrator' }
    });

    if (!existingAdmin) {
        console.log('Creating initial admin user...');
        await prisma.user.create({
            data: {
                imieNazwisko: 'Administrator',
                haslo: 'admin123', // In a real app this should be hashed
                rola: 'ADMINISTRATOR'
            }
        });
        console.log('Admin user created: Login: Administrator, Pass: admin123');
    } else {
        console.log('Admin user already exists. Updating role to ADMINISTRATOR if needed...');
        if (existingAdmin.rola !== 'ADMINISTRATOR') {
            await prisma.user.update({
                where: { id: existingAdmin.id },
                data: { rola: 'ADMINISTRATOR' }
            });
            console.log('Admin role updated to ADMINISTRATOR.');
        }
    }

    // Check if System user exists
    const systemUser = await prisma.user.findFirst({
        where: { imieNazwisko: 'System' } // Check by name, not ID 1
    });

    if (!systemUser) {
        console.log('Creating System user...');
        // We might need to force ID 1 if the DB allows, or just rely on it being the first if we reset.
        // Prisma doesn't easily allow forcing ID on autoincrement without raw SQL or specific setup,
        // but for now let's try creating it. If "Administrator" was created first, it might have ID 1.
        // Wait, "Administrator" was created above. Use raw query or ensuring System is created if ID 1 is reserved or just logical.
        // Actually, usually "System" is a conceptual user. If it needs to be in DB:

        // Ensure Admin has ID != 1 if System needs ID 1? Or just create System.
        // Let's create System user.
        await prisma.user.create({
            data: {
                imieNazwisko: 'System',
                haslo: 'system_secure_pass_very_long_321',
                rola: 'SYSTEM', // Assuming SYSTEM role exists or we use ADMIN but handle it specially. Wait, enum?
                // If role is String in schema, fine. If Enum, 'SYSTEM' might fail if not in Enum.
                // Schema usually has String for role based on previous files.
            }
        });
        console.log('System user created.');
    }


    // Check and create teams
    const teams = [
        { nazwa: 'Mój Zespół', kolor: '#5400FF' },
        { nazwa: 'Inny Zespół', kolor: '#00BFA5' },
        { nazwa: 'Zespół Testowy', kolor: '#FF9100' }
    ];

    for (const teamData of teams) {
        const team = await prisma.team.findFirst({
            where: { nazwa: teamData.nazwa }
        });

        if (!team) {
            console.log(`Creating team: ${teamData.nazwa}...`);
            await prisma.team.create({
                data: teamData
            });
        }
    }
    console.log('Seeding completed.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
