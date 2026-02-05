
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const tasks = await prisma.task.findMany({
            take: 10,
            orderBy: { dataUtworzenia: 'desc' },
            include: {
                team: true,
                creator: true,
                assignments: true,
                executions: true
            }
        });

        const teams = await prisma.team.findMany();

        return NextResponse.json({
            success: true,
            recentTasks: tasks,
            allTeams: teams
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
    }
}
