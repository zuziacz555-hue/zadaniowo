const { PrismaClient } = require('../src/lib/generated/client2');
const prisma = new PrismaClient();

async function main() {
    const activeExecs = await prisma.taskExecution.findMany({
        where: {
            status: 'AKTYWNE',
        },
        include: { task: true }
    });
    console.dir(activeExecs, { depth: null });

    const pendingExecs = await prisma.taskExecution.findMany({
        where: {
            status: 'OCZEKUJACE'
        },
        include: { task: true }
    });
    console.dir(pendingExecs, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
