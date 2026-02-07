
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking Prisma Client properties...');
    if (prisma.archiveFolder) {
        console.log('prisma.archiveFolder exists');
    } else {
        console.log('ERROR: prisma.archiveFolder is UNDEFINED');
    }

    if (prisma.userArchiveFolder) {
        console.log('prisma.userArchiveFolder exists');
    } else {
        console.log('ERROR: prisma.userArchiveFolder is UNDEFINED');
    }

    // List all keys to see what IS there
    console.log('Prisma keys:', Object.keys(prisma));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
