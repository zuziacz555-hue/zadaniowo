'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

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
        const userTeams = await prisma.userTeam.findMany({
            where: { userId },
            include: {
                team: {
                    include: {
                        _count: {
                            select: {
                                tasks: true,
                                meetings: true,
                            },
                        },
                    },
                },
            },
        })
        return { success: true, data: userTeams }
    } catch (error) {
        console.error('Error fetching user teams:', error)
        return { success: false, error: 'Failed to fetch user teams' }
    }
}

export async function createTeam(nazwa: string) {
    try {
        const team = await prisma.team.create({
            data: { nazwa },
        })
        revalidatePath('/admin-teams')
        revalidatePath('/dashboard')
        return { success: true, data: team }
    } catch (error) {
        console.error('Error creating team:', error)
        return { success: false, error: 'Failed to create team' }
    }
}

export async function updateTeam(id: number, nazwa: string) {
    try {
        const team = await prisma.team.update({
            where: { id },
            data: { nazwa },
        })
        revalidatePath('/admin-teams')
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
        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error deleting team:', error)
        return { success: false, error: 'Failed to delete team' }
    }
}

export async function addUserToTeam(userId: number, teamId: number, rola: string = 'uczestniczka') {
    try {
        const userTeam = await prisma.userTeam.create({
            data: {
                userId,
                teamId,
                rola,
            },
        })
        revalidatePath('/admin-teams')
        revalidatePath('/dashboard')
        return { success: true, data: userTeam }
    } catch (error) {
        console.error('Error adding user to team:', error)
        return { success: false, error: 'Failed to add user to team' }
    }
}

export async function removeUserFromTeam(userId: number, teamId: number) {
    try {
        await prisma.userTeam.deleteMany({
            where: {
                userId,
                teamId,
            },
        })
        revalidatePath('/admin-teams')
        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error removing user from team:', error)
        return { success: false, error: 'Failed to remove user from team' }
    }
}
