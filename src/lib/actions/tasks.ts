'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getTasks(filters?: {
    teamId?: number
    status?: string
    userId?: number
    role?: string
}) {
    try {
        const { teamId, status, userId, role } = filters || {};

        // Base query
        const query: any = {
            where: {},
            include: {
                team: true,
                creator: true,
                executions: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                imieNazwisko: true,
                                rola: true,
                                zespoly: {
                                    select: {
                                        teamId: true,
                                        rola: true
                                    }
                                }
                            }
                        }
                    }
                },
                submissions: {
                    include: {
                        user: true
                    },
                    orderBy: {
                        dataDodania: 'desc'
                    }
                },
                assignments: {
                    include: {
                        user: true
                    }
                }
            },
            orderBy: {
                dataUtworzenia: 'desc',
            },
        };

        // Role-based filtering - SIMPLIFIED AND FIXED
        const isAdmin = role === "ADMINISTRATOR" || role === "admin";
        const isCoord = role === "KOORDYNATORKA" || role === "koordynatorka";

        if (isAdmin) {
            // Admins see all tasks by default.
            // If they are in a specific team view in the backend (optional filtering)
            if (teamId) {
                query.where = {
                    OR: [
                        { teamId: teamId },
                        { teamId: null }
                    ]
                };
            }
            // If teamId is undefined, query.where is {}, which means "everything"
        } else if (isCoord) {
            // Coordinators see ALL tasks for their team OR tasks they are explicitly involved in
            query.where = {
                OR: [
                    { teamId: teamId },
                    { teamId: null },
                    { assignments: { some: { userId: userId } } },
                    { executions: { some: { userId: userId } } }
                ]
            };
        } else {
            // Participants see:
            // 1. Tasks assigned to their team (or global) with typPrzypisania CALY_ZESPOL
            // 2. Tasks assigned explicitly to them
            if (teamId && userId) {
                query.where = {
                    AND: [
                        { OR: [{ teamId: teamId }, { teamId: null }] },
                        {
                            OR: [
                                { typPrzypisania: "CALY_ZESPOL" },
                                { assignments: { some: { userId: userId } } },
                                { executions: { some: { userId: userId } } }
                            ]
                        }
                    ]
                };
            } else if (userId) {
                query.where = {
                    OR: [
                        { assignments: { some: { userId: userId } } },
                        { executions: { some: { userId: userId } } }
                    ]
                };
            }
        }

        // Add status filter if provided
        if (status) {
            if (query.where.AND) {
                query.where.AND.push({ status: status });
            } else if (Object.keys(query.where).length > 0) {
                const existingWhere = { ...query.where };
                query.where = {
                    AND: [
                        existingWhere,
                        { status: status }
                    ]
                };
            } else {
                query.where.status = status;
            }
        }

        const tasks = await prisma.task.findMany(query);

        return { success: true, data: tasks }
    } catch (error: any) {
        console.error('Error fetching tasks:', error)
        return { success: false, error: error.message || 'Failed to fetch tasks' }
    }
}

export async function getTaskById(id: number) {
    try {
        const task = await prisma.task.findUnique({
            where: { id },
            include: {
                team: true,
                creator: true,
                executions: {
                    include: {
                        user: true,
                    },
                },
                submissions: {
                    include: {
                        user: true,
                    },
                    orderBy: {
                        dataDodania: 'desc'
                    }
                },
            },
        })
        return { success: true, data: task }
    } catch (error) {
        console.error('Error fetching task:', error)
        return { success: false, error: 'Failed to fetch task' }
    }
}

export async function createTask(data: {
    teamId?: number
    tytul: string
    opis?: string
    termin?: string
    priorytet: string
    utworzonePrzez: string
    utworzonePrzezId?: number
    typPrzypisania?: string
    assignedUserIds?: number[]
    includeCoordinators?: boolean
}) {
    try {
        const { assignedUserIds, teamId, includeCoordinators, ...rest } = data;

        const task = await prisma.task.create({
            data: {
                ...rest,
                teamId: teamId || null,
                termin: data.termin ? new Date(data.termin) : null,
                priorytet: data.priorytet as any,
                status: "AKTYWNE",
                assignments: assignedUserIds && assignedUserIds.length > 0 ? {
                    create: assignedUserIds.map(userId => ({
                        userId
                    }))
                } : undefined
            },
        });

        // 2. Create TaskExecutions (Critical for visibility/status)
        if (data.typPrzypisania === "CALY_ZESPOL") {
            const rolesToInclude = ["uczestniczka"];
            if (includeCoordinators) {
                rolesToInclude.push("koordynatorka");
            }

            let membersToAssign: { userId: number, imieNazwisko: string }[] = [];

            if (task.teamId) {
                const teamMembers = await prisma.userTeam.findMany({
                    where: {
                        teamId: task.teamId,
                        rola: { in: rolesToInclude }
                    },
                    include: { user: true }
                });
                membersToAssign = teamMembers.map(m => ({
                    userId: m.userId,
                    imieNazwisko: m.user.imieNazwisko || "Użytkownik"
                }));
            } else {
                const allRelevantUsers = await prisma.user.findMany({
                    where: {
                        rola: { in: rolesToInclude.map(r => r.toUpperCase()) }
                    }
                });
                membersToAssign = allRelevantUsers.map(u => ({
                    userId: u.id,
                    imieNazwisko: u.imieNazwisko || "Użytkownik"
                }));
            }

            if (membersToAssign.length > 0) {
                await prisma.taskExecution.createMany({
                    data: membersToAssign.map(m => ({
                        taskId: task.id,
                        userId: m.userId,
                        status: "AKTYWNE",
                        imieNazwisko: m.imieNazwisko,
                        dataOznaczenia: new Date()
                    }))
                });
            }
        } else if (data.typPrzypisania === "OSOBY" && assignedUserIds && assignedUserIds.length > 0) {
            const users = await prisma.user.findMany({
                where: { id: { in: assignedUserIds } }
            });

            await prisma.taskExecution.createMany({
                data: users.map(u => ({
                    taskId: task.id,
                    userId: u.id,
                    status: "AKTYWNE",
                    imieNazwisko: u.imieNazwisko || "Użytkownik",
                    dataOznaczenia: new Date()
                }))
            });
        }

        revalidatePath('/tasks')
        revalidatePath('/dashboard')
        revalidatePath('/admin-teams')
        return { success: true, data: task }
    } catch (error) {
        console.error('Error creating task:', error)
        return { success: false, error: 'Failed to create task' }
    }
}

export async function submitTaskWork(taskId: number, userId: number, userName: string, opis: string, isCorrection: boolean = false) {
    try {
        // 1. Add submission history entry
        await prisma.taskSubmission.create({
            data: {
                taskId,
                userId,
                imieNazwisko: userName,
                opis,
            }
        });

        // 2. Create or update execution entry
        await prisma.taskExecution.upsert({
            where: {
                taskId_userId: {
                    taskId,
                    userId
                }
            },
            update: {
                status: "OCZEKUJACE",
                dataOznaczenia: new Date(),
                imieNazwisko: userName, // Using correct field name from schema
                poprawione: isCorrection
            },
            create: {
                taskId,
                userId,
                status: "OCZEKUJACE",
                dataOznaczenia: new Date(),
                imieNazwisko: userName,
                poprawione: isCorrection
            }
        });

        revalidatePath('/tasks')
        revalidatePath('/admin-teams')
        return { success: true }
    } catch (error) {
        console.error('Error submitting task work:', error)
        return { success: false, error: 'Failed to submit' }
    }
}

export async function approveTaskWork(taskId: number, userId: number) {
    try {
        await prisma.taskExecution.update({
            where: {
                taskId_userId: {
                    taskId,
                    userId,
                },
            },
            data: {
                status: "ZAAKCEPTOWANE",
            },
        });

        // Optional: If we want to close the whole task once SOMEONE is accepted (custom logic)
        // For now, let's keep it per-user as requested in Participant view.

        revalidatePath('/tasks')
        revalidatePath('/admin-teams')
        return { success: true }
    } catch (error) {
        console.error('Error approving work:', error)
        return { success: false }
    }
}

export async function rejectTaskWork(taskId: number, userId: number, notes: string, correctionDeadline?: Date | null) {
    try {
        await prisma.taskExecution.update({
            where: {
                taskId_userId: {
                    taskId,
                    userId,
                },
            },
            data: {
                status: "ODRZUCONE",
                uwagiOdrzucenia: notes,
                terminPoprawki: correctionDeadline
            },
        });

        revalidatePath('/tasks')
        revalidatePath('/admin-teams')
        return { success: true }
    } catch (error) {
        console.error('Error rejecting work:', error)
        return { success: false }
    }
}

export async function closeTaskGlobally(taskId: number) {
    try {
        await prisma.task.update({
            where: { id: taskId },
            data: { status: "ZAAKCEPTOWANE" }
        });
        revalidatePath('/tasks')
        return { success: true }
    } catch (error) {
        return { success: false }
    }
}

export async function deleteTask(id: number) {
    try {
        await prisma.task.delete({
            where: { id },
        })
        revalidatePath('/tasks')
        revalidatePath('/dashboard')
        revalidatePath('/admin-teams')
        return { success: true }
    } catch (error) {
        console.error('Error deleting task:', error)
        return { success: false, error: 'Failed to delete task' }
    }
}

export async function deleteTaskExecution(taskId: number, userId: number) {
    try {
        await prisma.taskExecution.deleteMany({
            where: {
                taskId,
                userId
            }
        });

        await prisma.taskSubmission.deleteMany({
            where: {
                taskId,
                userId
            }
        });

        revalidatePath('/tasks');
        revalidatePath('/admin-teams');
        revalidatePath('/submissions');
        return { success: true };
    } catch (error) {
        console.error('Error deleting task execution:', error);
        return { success: false, error: 'Failed to delete execution' };
    }
}
