'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getAnnouncements(teamId?: number, userId?: number) {
    try {
        const query: any = {
            where: teamId ? { teamId } : {},
            include: {
                team: true,
                assignments: true
            },
            orderBy: {
                dataUtworzenia: 'desc',
            },
        };

        if (userId) {
            // Check if user is coord or admin for this team to show all
            let canSeeAll = false;
            if (teamId) {
                const userTeam = await prisma.userTeam.findFirst({
                    where: { userId, teamId }
                });
                if (userTeam && (userTeam.rola.toUpperCase() === "KOORDYNATORKA" || userTeam.rola.toUpperCase() === "ADMINISTRATOR")) {
                    canSeeAll = true;
                }
            } else {
                // Global view: Check if user is global admin
                const user = await prisma.user.findUnique({ where: { id: userId } });
                if (user && user.rola === "ADMINISTRATOR") canSeeAll = true;
            }

            if (!canSeeAll) {
                query.where.OR = [
                    { typPrzypisania: "WSZYSCY" },
                    { assignments: { some: { userId } } }
                ];
            }
        }

        const announcements = await prisma.announcement.findMany(query)
        return { success: true, data: announcements }
    } catch (error) {
        console.error('Error fetching announcements:', error)
        return { success: false, error: 'Failed to fetch announcements' }
    }
}

export async function createAnnouncement(data: {
    teamId: number
    tytul: string
    tresc: string
    utworzonePrzez: string
    typPrzypisania?: string
    assignedUserIds?: number[]
}) {
    try {
        const { assignedUserIds, ...rest } = data;
        const announcement = await prisma.announcement.create({
            data: {
                ...rest,
                typPrzypisania: data.typPrzypisania || "WSZYSCY",
                assignments: assignedUserIds && assignedUserIds.length > 0 ? {
                    create: assignedUserIds.map(userId => ({
                        userId
                    }))
                } : undefined
            },
        })
        revalidatePath('/announcements')
        return { success: true, data: announcement }
    } catch (error) {
        console.error('Error creating announcement:', error)
        return { success: false, error: 'Failed to create announcement' }
    }
}

export async function deleteAnnouncement(id: number) {
    try {
        await prisma.announcement.delete({
            where: { id },
        })
        revalidatePath('/announcements')
        return { success: true }
    } catch (error) {
        console.error('Error deleting announcement:', error)
        return { success: false, error: 'Failed to delete announcement' }
    }
}

export async function checkAndCreateOverdueAnnouncements(teamId: number) {
    try {
        const now = new Date();

        // 1. Find all active, overdue task executions for this team
        // We need to check the Task's deadline, not the execution itself (unless assignments have individual deadlines, but schema says Task has 'termin')
        const overdueExecutions = await prisma.taskExecution.findMany({
            where: {
                status: "AKTYWNE",
                task: {
                    teamId: teamId,
                    termin: {
                        lt: now
                    }
                },
                // Crucial: Only care about Participants!
                user: {
                    zespoly: {
                        some: {
                            teamId: teamId,
                            rola: "uczestniczka"
                        }
                    }
                }
            },
            include: {
                task: true,
                user: true
            }
        });

        if (overdueExecutions.length === 0) return { success: true, count: 0 };

        // 2. Group by Task
        const executionsByTask: Record<number, typeof overdueExecutions> = {};
        overdueExecutions.forEach(ex => {
            if (!executionsByTask[ex.taskId]) executionsByTask[ex.taskId] = [];
            executionsByTask[ex.taskId].push(ex);
        });

        let createdCount = 0;

        // 3. Process each task group
        for (const taskIdStr in executionsByTask) {
            const taskId = parseInt(taskIdStr);
            const executions = executionsByTask[taskId];
            const task = executions[0].task; // All share the same task

            // 4. Check if announcement already exists for this task
            const announcementTitle = `⚠️ ZADANIE PO TERMINIE: ${task.tytul}`;

            const existing = await prisma.announcement.findFirst({
                where: {
                    teamId: teamId,
                    tytul: announcementTitle,
                    // Optional: check created recently? Or just ever? 
                    // Getting spammed daily for the same task might be annoying, but also motivating.
                    // For now, let's avoid duplicates entirely if one exists.
                }
            });

            if (!existing) {
                // 5. Create Announcement
                const userNames = executions.map(e => e.user.imieNazwisko).join(", ");
                const content = `Następujące osoby nie wykonały zadania w terminie (${task.termin ? new Date(task.termin).toLocaleDateString() : '?'}) i blokują postępy zespołu:\n\n${userNames}\n\nProszę o pilne uzupełnienie zaległości!`;

                await prisma.announcement.create({
                    data: {
                        teamId: teamId,
                        tytul: announcementTitle,
                        tresc: content,
                        utworzonePrzez: "SYSTEM", // System generated
                        typPrzypisania: "WSZYSCY",
                        dataUtworzenia: new Date()
                    }
                });
                createdCount++;
            }
        }

        if (createdCount > 0) {
            revalidatePath('/announcements');
        }

        return { success: true, count: createdCount };

    } catch (error) {
        console.error('Error checking overdue announcements:', error);
        return { success: false, error: 'Failed to generate announcements' };
    }
}
