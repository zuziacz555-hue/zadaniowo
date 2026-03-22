import { PrismaClient } from '../src/lib/generated/client2';
const prisma = new PrismaClient();

async function main() {
    const activeExecs = await prisma.taskExecution.findMany({
        where: {
            status: 'AKTYWNE',
        },
        include: { task: true }
    });
    console.log("AKTYWNE executions:");
    console.log(JSON.stringify(activeExecs, null, 2));

    const pendingExecs = await prisma.taskExecution.findMany({
        where: {
            status: 'OCZEKUJACE'
        },
        include: { task: true }
    });
    console.log("OCZEKUJACE executions:");
    console.log(JSON.stringify(pendingExecs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
