'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getUsers() {
    try {
        const users = await prisma.user.findMany({
            include: {
                zespoly: {
                    include: {
                        team: true,
                    },
                },
                _count: {
                    select: {
                        tasksCreated: true,
                        taskSubmissions: true,
                    },
                },
            },
            orderBy: {
                imieNazwisko: 'asc',
            },
        })
        return { success: true, data: users }
    } catch (error) {
        console.error('Error fetching users:', error)
        return { success: false, error: 'Failed to fetch users' }
    }
}

export async function getUserById(id: number) {
    try {
        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                zespoly: {
                    include: {
                        team: true,
                    },
                },
                tasksCreated: true,
                taskSubmissions: true,
            },
        })
        return { success: true, data: user }
    } catch (error) {
        console.error('Error fetching user:', error)
        return { success: false, error: 'Failed to fetch user' }
    }
}

export async function createUser(data: {
    imieNazwisko: string
    haslo: string
    rola: string
}) {
    try {
        const user = await prisma.user.create({
            data: {
                ...data,
                rola: data.rola as any,
            },
        })
        revalidatePath('/admin-users')
        return { success: true, data: user }
    } catch (error) {
        console.error('Error creating user:', error)
        return { success: false, error: 'Failed to create user' }
    }
}

export async function updateUser(id: number, data: Partial<{
    imieNazwisko: string
    haslo: string
    rola: string
}>) {
    try {
        const user = await prisma.user.update({
            where: { id },
            data: {
                ...data,
                ...(data.rola && { rola: data.rola as any }),
            },
        })
        revalidatePath('/admin-users')
        revalidatePath('/admin-teams')
        return { success: true, data: user }
    } catch (error) {
        console.error('Error updating user:', error)
        return { success: false, error: 'Failed to update user' }
    }
}

export async function deleteUser(id: number) {
    try {
        await prisma.user.delete({
            where: { id },
        })
        revalidatePath('/admin-users')
        revalidatePath('/admin-teams')
        return { success: true }
    } catch (error) {
        console.error('Error deleting user:', error)
        return { success: false, error: 'Failed to delete user' }
    }
}
