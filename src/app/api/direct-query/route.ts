import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        // Direct query - coordinators for team 1
        const coordTasks = await prisma.task.findMany({
            where: { teamId: 1 },
            include: { executions: true }
        });

        // Direct query - tasks with executions for user 7
        const participantTasks = await prisma.task.findMany({
            where: {
                AND: [
                    { teamId: 1 },
                    { executions: { some: { userId: 7 } } }
                ]
            },
            include: { executions: true }
        });

        return NextResponse.json({
            coordTasks: coordTasks.length,
            participantTasks: participantTasks.length,
            coordTasksData: coordTasks,
            participantTasksData: participantTasks
        });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
