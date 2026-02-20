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
}, callerId: number) {
    try {
        // Verify caller is "system" or "ADMINISTRATOR"
        const caller = await prisma.user.findUnique({ where: { id: callerId } });
        // Allow System user OR any Administrator
        const isSystem = (caller?.imieNazwisko || "").toLowerCase() === "system";
        const isAdmin = caller?.rola === "ADMINISTRATOR" || caller?.rola === "ADMIN";

        if (!caller || (!isSystem && !isAdmin)) {
            return { success: false, error: 'Tylko system lub administrator może dodawać użytkowników.' };
        }

        const name = data.imieNazwisko.trim();

        // 1. Manually check for existing user to provide a better error message
        const existing = await prisma.user.findFirst({
            where: { imieNazwisko: name }
        });

        if (existing) {
            return { success: false, error: 'Użytkownik o takim imieniu i nazwisku już istnieje.' }
        }

        const validRoles = ['UCZESTNICZKA', 'ADMINISTRATOR', 'SYSTEM'];
        const roleToSet = (data.rola && validRoles.includes(data.rola.toUpperCase()))
            ? data.rola.toUpperCase()
            : 'UCZESTNICZKA';

        const user = await prisma.user.create({
            data: {
                ...data,
                imieNazwisko: name,
                rola: roleToSet as any,
            },
        })
        try { revalidatePath('/admin-users') } catch (e) { }
        return { success: true, data: user }
    } catch (error: any) {
        console.error('Error creating user:', error)
        if (error.code === 'P2002') {
            return { success: false, error: 'Użytkownik o takim imieniu i nazwisku już istnieje.' }
        }
        return { success: false, error: 'Failed to create user' }
    }
}

export async function updateUser(id: number, data: Partial<{
    imieNazwisko: string
    haslo: string
    rola: string
}>, callerId: number) {
    try {
        // Verify caller is "system" if changing sensitive data
        const caller = await prisma.user.findUnique({ where: { id: callerId } });
        if (!caller) return { success: false, error: 'Błąd autoryzacji.' };

        // If changing name or password, caller MUST be system OR the user themselves
        if ((data.imieNazwisko || data.haslo)) {
            const isCallerSystem = (caller.imieNazwisko || "").toLowerCase() === "system";
            if (!isCallerSystem && caller.id !== id) {
                return { success: false, error: 'Nie masz uprawnień do zmiany tych danych.' };
            }
        }

        const validRoles = ['UCZESTNICZKA', 'ADMINISTRATOR', 'SYSTEM'];
        const roleToSet = (data.rola && validRoles.includes(data.rola.toUpperCase()))
            ? data.rola.toUpperCase()
            : undefined;

        const user = await prisma.user.update({
            where: { id },
            data: {
                ...data,
                ...(roleToSet && { rola: roleToSet as any }),
            },
        })
        try {
            revalidatePath('/admin-users')
            revalidatePath('/admin-teams')
        } catch (e) { }
        return { success: true, data: user }
    } catch (error) {
        console.error('Error updating user:', error)
        return { success: false, error: 'Failed to update user' }
    }
}

export async function deleteUser(id: number, callerId: number) {
    try {
        // 1. Fetch user to be deleted and the caller
        const [targetUser, caller] = await Promise.all([
            prisma.user.findUnique({ where: { id } }),
            prisma.user.findUnique({ where: { id: callerId } })
        ]);

        if (!targetUser) return { success: false, error: 'Użytkownik nie istnieje.' };
        if (!caller) return { success: false, error: 'Błąd autoryzacji.' };

        // 2. CRITICAL PROTECTION: Never delete main SuperAdmin ("system")
        if ((targetUser.imieNazwisko || "").toLowerCase() === "system") {
            return { success: false, error: 'Systemu nie można usunąć.' };
        }

        // 3. HIERARCHY PROTECTION: 
        // Only "system" can delete other ADMINISTRATORs
        const isTargetAdmin = targetUser.rola === "ADMINISTRATOR" || targetUser.rola === "ADMIN";
        const isCallerSystem = (caller.imieNazwisko || "").toLowerCase() === "system";

        if (isTargetAdmin && !isCallerSystem) {
            return { success: false, error: 'Tylko profil SYSTEM może usuwać innych administratorów.' };
        }

        // 4. Perform deletion
        await prisma.user.delete({
            where: { id },
        })

        try {
            revalidatePath('/admin-users')
            revalidatePath('/admin-teams')
        } catch (e) { }
        return { success: true }
    } catch (error) {
        console.error('Error deleting user:', error)
        return { success: false, error: 'Failed to delete user' }
    }
}
