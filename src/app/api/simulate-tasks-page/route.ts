import { NextResponse } from 'next/server';
import { getTasks } from '@/lib/actions/tasks';
import { getUserTeams } from '@/lib/actions/teams';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    try {
        // Simulate exactly what TasksPage does
        const userIdNum = Number(userId);

        // Step 1: Get user's teams
        const teamsRes = await getUserTeams(userIdNum);

        if (!teamsRes.success || !teamsRes.data || teamsRes.data.length === 0) {
            return NextResponse.json({
                error: 'No teams found',
                teamsRes
            });
        }

        // Step 2: Determine activeTeam (NEW SMART LOGIC)
        //   Priority: Coordinator teams first, then first available team
        const coordTeam = teamsRes.data.find((ut: any) =>
            ut.rola.toUpperCase() === "KOORDYNATORKA"
        );
        const activeTeamObj = coordTeam || teamsRes.data[0];
        const teamId = activeTeamObj.team.id;
        const role = activeTeamObj.rola.toUpperCase();

        // Step 3: Call getTasks with the same parameters TasksPage would use
        const tasksRes = await getTasks({
            teamId: teamId,
            userId: userIdNum,
            role: role
        });

        return NextResponse.json({
            success: true,
            simulation: {
                step1_teams: teamsRes.data.length,
                step2_activeTeam: {
                    teamId,
                    teamName: activeTeamObj.team.nazwa,
                    role
                },
                step3_getTasks: {
                    params: { teamId, userId: userIdNum, role },
                    taskCount: tasksRes.data?.length || 0,
                    tasks: tasksRes.data?.slice(0, 3) || []
                }
            }
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: String(error)
        }, { status: 500 });
    }
}
