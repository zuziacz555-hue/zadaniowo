'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { createResignationNotification } from './notifications'

export async function getTeams() {
    try {
        const teams = await prisma.team.findMany({
            include: {
                users: {
                    include: {
                        user: {
                            include: {
                                taskExecutions: true
                            }
                        },
                    },
                },
                tasks: {
                    include: {
                        assignments: true
                    }
                },
                _count: {
                    select: {
                        tasks: true,
                        meetings: true,
                        announcements: true,
                    },
                },
            },
        })
        return { success: true, data: teams }
    } catch (error) {
        console.error('Error fetching teams:', error)
        return { success: false, error: 'Failed to fetch teams' }
    }
}

export async function getTeamById(id: number) {
    try {
        const team = await prisma.team.findUnique({
            where: { id },
            include: {
                users: {
                    include: {
                        user: {
                            include: {
                                taskExecutions: true
                            }
                        },
                    },
                },
                tasks: {
                    include: {
                        assignments: true
                    }
                },
                meetings: true,
                announcements: true,
            },
        })
        return { success: true, data: team }
    } catch (error) {
        console.error('Error fetching team:', error)
        return { success: false, error: 'Failed to fetch team' }
    }
}

export async function getUserTeams(userId: number) {
    try {
        // Calculate start and end of current week (Monday to Sunday)
        const now = new Date();
        const day = now.getDay(); // 0 is Sunday
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday

        const startOfWeek = new Date(now.setDate(diff));
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const userTeamsRaw = await prisma.userTeam.findMany({
            where: { userId },
            include: {
                team: {
                    include: {
                        users: {
                            include: {
                                user: true
                            }
                        },
                        tasks: {
                            where: {
                                executions: {
                                    some: { userId }
                                }
                            },
                            select: {
                                executions: {
                                    where: { userId },
                                    select: { status: true }
                                }
                            }
                        },
                        meetings: {
                            where: {
                                data: {
                                    gte: startOfWeek,
                                    lte: endOfWeek
                                }
                            }
                        }
                    },
                },
            },
        })

        const userTeams = userTeamsRaw.map(ut => {
            const executions = ut.team.tasks.flatMap(t => t.executions);
            const toDoCount = executions.filter(ex => ex.status === 'AKTYWNE').length;
            const toFixCount = executions.filter(ex => ex.status === 'ODRZUCONE').length;

            return {
                ...ut,
                toDoCount,
                toFixCount
            };
        });

        return { success: true, data: userTeams }
    } catch (error) {
        console.error('Error fetching user teams:', error)
        return { success: false, error: 'Failed to fetch user teams' }
    }
}

export async function createTeam(nazwa: string, kolor: string = '#5400FF', opis?: string) {
    try {
        const team = await prisma.team.create({
            data: { nazwa, kolor, opis },
        })
        revalidatePath('/admin-teams')
        revalidatePath('/admin-users')
        revalidatePath('/dashboard')
        return { success: true, data: team }
    } catch (error) {
        console.error('Error creating team:', error)
        return { success: false, error: 'Failed to create team' }
    }
}

export async function updateTeam(id: number, nazwa: string, kolor?: string, opis?: string) {
    try {
        const team = await prisma.team.update({
            where: { id },
            data: {
                nazwa,
                ...(kolor && { kolor }),
                ...(opis !== undefined && { opis })
            },
        })
        revalidatePath('/admin-teams')
        revalidatePath('/admin-users')
        revalidatePath('/dashboard')
        return { success: true, data: team }
    } catch (error) {
        console.error('Error updating team:', error)
        return { success: false, error: 'Failed to update team' }
    }
}

export async function deleteTeam(id: number) {
    try {
        await prisma.team.delete({
            where: { id },
        })
        revalidatePath('/admin-teams')
        revalidatePath('/admin-users')
        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error deleting team:', error)
        return { success: false, error: 'Failed to delete team' }
    }
}

export async function addUserToTeam(userId: number, teamId: number, rola: string = 'uczestniczka') {
    try {
        // 1. Check user role - Admins cannot be added to teams
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return { success: false, error: 'Użytkownik nie istnieje.' };

        if (user.rola === 'ADMINISTRATOR') {
            return { success: false, error: 'Administratorzy nie mogą być przypisywani do zespołów.' };
        }

        // 2. Check for existing membership
        const existingMembership = await prisma.userTeam.findFirst({
            where: {
                userId,
                teamId
            }
        });

        if (existingMembership) {
            return { success: false, error: 'Użytkownik jest już członkiem tego zespołu.' };
        }

        const userTeam = await prisma.userTeam.create({
            data: {
                userId,
                teamId,
                rola,
            },
        })
        revalidatePath('/admin-teams')
        revalidatePath('/admin-users')
        revalidatePath('/dashboard')
        return { success: true, data: userTeam }
    } catch (error) {
        console.error('Error adding user to team:', error)
        return { success: false, error: 'Failed to add user to team' }
    }
}

export async function removeUserFromTeam(userId: number, teamId: number) {
    try {
        // 1. Check if user was a coordinator
        const userTeam = await prisma.userTeam.findFirst({
            where: { userId, teamId }
        });

        const wasCoordinator = userTeam?.rola === 'koordynatorka';

        // 2. Delete membership
        await prisma.userTeam.deleteMany({
            where: {
                userId,
                teamId,
            },
        })

        // 3. If was coordinator, check settings and create notification
        if (wasCoordinator) {
            const settings = await prisma.systemSettings.findFirst();
            if (settings?.coordinatorResignationAlerts !== false) {
                // Import dynamiclly to avoid circular dependency if any, 
                // or just call it if we ensure order. 
                // For simplicity, I'll just use prisma directly here or import at top.
                // But I'll import createResignationNotification at the top of the file.
                await createResignationNotification(teamId, userId);
            }
        }

        revalidatePath('/admin-teams')
        revalidatePath('/admin-users')
        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error removing user from team:', error)
        return { success: false, error: 'Failed to remove user from team' }
    }
}
export async function toggleTeamApplications(teamId: number, enabled: boolean) {
    try {
        await prisma.team.update({
            where: { id: teamId },
            data: { allowApplications: enabled }
        });
        revalidatePath('/dashboard');
        revalidatePath('/admin-teams');
        return { success: true };
    } catch (error) {
        console.error('Error toggling team applications:', error);
        return { success: false, error: 'Failed to toggle applications' };
    }
}
