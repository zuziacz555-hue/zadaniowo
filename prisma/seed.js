
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const adminEmail = 'admin'; // Using simple username as id for this app based on login logic

    // Check if admin exists
    const existing = await prisma.user.findFirst({
        where: { rola: 'ADMIN' }
    });

    if (!existing) {
        console.log('Creating initial admin user...');
        await prisma.user.create({
            data: {
                imieNazwisko: 'Administrator',
                haslo: 'admin123', // In a real app this should be hashed
                rola: 'ADMIN'
            }
        });
        console.log('Admin user created: Login: Administrator, Pass: admin123');
    } else {
        console.log('Admin user already exists.');
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
