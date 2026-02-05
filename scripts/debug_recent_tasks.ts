
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("--- DEBUG: Fetching Recent Tasks ---");
    const tasks = await prisma.task.findMany({
        take: 5,
        orderBy: {
            dataUtworzenia: 'desc'
        },
        include: {
            team: true,
            creator: true
        }
    });

    console.log(JSON.stringify(tasks, null, 2));

    console.log("--- DEBUG: Fetching All Teams ---");
    const teams = await prisma.team.findMany();
    console.log(JSON.stringify(teams, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
