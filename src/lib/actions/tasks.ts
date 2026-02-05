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
                                role: true,
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
            // Admins see all tasks, optionally filtered by team
            if (teamId) {
                query.where.teamId = teamId;
            }
        } else if (isCoord) {
            // Coordinators see ALL tasks for their team OR tasks they are explicitly assigned to (for personal view)
            if (teamId && userId) {
                query.where = {
                    OR: [
                        { teamId: teamId }, // Management: Team tasks
                        { assignments: { some: { userId: userId } } }, // Personal: Explicit assignment
                        { executions: { some: { userId: userId } } } // Personal: Execution record
                    ]
                };
            } else if (teamId) {
                query.where.teamId = teamId;
            } else if (userId) {
                query.where = {
                    OR: [
                        { assignments: { some: { userId: userId } } },
                        { executions: { some: { userId: userId } } }
                    ]
                };
            }
        } else {
            // Participants see:
            // 1. Tasks assigned to EVERYONE in their team
            // 2. Tasks assigned explicitly to them via TaskAssignment
            // 3. Tasks they already have an execution record for (legacy/fallback)
            if (teamId && userId) {
                query.where = {
                    teamId: teamId,
                    OR: [
                        { typPrzypisania: "WSZYSCY" },
                        {
                            assignments: {
                                some: { userId: userId }
                            }
                        },
                        {
                            executions: {
                                some: { userId: userId }
                            }
                        }
                    ]
                };
            } else if (userId) {
                // If no team context, just find tasks they are involved in across any team
                query.where = {
                    OR: [
                        {
                            assignments: {
                                some: { userId: userId }
                            }
                        },
                        {
                            executions: {
                                some: { userId: userId }
                            }
                        }
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
        if (data.typPrzypisania === "CALY_ZESPOL" && task.teamId) {
            // Fetch team members
            const rolesToInclude = ["uczestniczka"];
            if (includeCoordinators) {
                rolesToInclude.push("koordynatorka");
            }

            const teamMembers = await prisma.userTeam.findMany({
                where: {
                    teamId: task.teamId,
                    rola: { in: rolesToInclude }
                },
                include: { user: true }
            });

            if (teamMembers.length > 0) {
                await prisma.taskExecution.createMany({
                    data: teamMembers.map(m => ({
                        taskId: task.id,
                        userId: m.userId,
                        status: "AKTYWNE",
                        imieNazwisko: m.user.imieNazwisko || "Użytkownik",
                        dataOznaczenia: new Date()
                    }))
                });
            }
        } else if (data.typPrzypisania === "OSOBY" && assignedUserIds && assignedUserIds.length > 0) {
            // Fetch names for assigned users
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
