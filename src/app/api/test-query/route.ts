import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');

    try {
        const teamIdNum = teamId ? Number(teamId) : undefined;
        const userIdNum = userId ? Number(userId) : undefined;

        // Direct test - replicate getTasks logic here
        const query: any = {
            where: {},
            include: {
                team: true,
                creator: true,
                executions: true
            },
            orderBy: {
                dataUtworzenia: 'desc',
            },
        };

        const isAdmin = role === "ADMINISTRATOR" || role === "admin";
        const isCoord = role === "KOORDYNATORKA" || role === "koordynatorka";

        console.log("Debug:", { role, isAdmin, isCoord, teamIdNum, userIdNum });

        if (isAdmin) {
            if (teamIdNum) {
                query.where.teamId = teamIdNum;
            }
        } else if (isCoord) {
            console.log("Is coordinator, teamIdNum:", teamIdNum);
            if (teamIdNum) {
                console.log("Setting teamId in query");
                query.where.teamId = teamIdNum;
            }
        } else {
            if (teamIdNum && userIdNum) {
                query.where = {
                    teamId: teamIdNum,
                    executions: {
                        some: { userId: userIdNum }
                    }
                };
            } else if (userIdNum) {
                query.where = {
                    executions: {
                        some: { userId: userIdNum }
                    }
                };
            }
        }

        console.log("Final query.where:", JSON.stringify(query.where));

        const tasks = await prisma.task.findMany(query);

        return NextResponse.json({
            success: true,
            params: {
                teamId: teamIdNum,
                userId: userIdNum,
                role: role || null
            },
            queryWhere: query.where,
            taskCount: tasks.length,
            tasks: tasks.slice(0, 3) // Only return first 3 for brevity
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
