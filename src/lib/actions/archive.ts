"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { PrismaClient } from "../generated/client2";

// 1. Get Archive Folders
export async function getArchiveFolders(userId: number, role: string) {
    const localPrisma = new PrismaClient();
    try {
        console.log("getArchiveFolders (LOCAL) called for user:", userId, "role:", role);

        if (!userId) return { success: false, error: "Unauthorized" };

        // Administratorzy widzą wszystkie foldery (ACCEPTED)
        // Inni widzą tylko te, które im udostępniono I zaakceptowali

        let folders;
        if (role === 'ADMIN' || role === 'ADMINISTRATOR') {
            folders = await localPrisma.archiveFolder.findMany({
                include: {
                    sharedWithUsers: true,
                    _count: {
                        select: { executions: true }
                    }
                },
                orderBy: { dataUtworzenia: 'desc' }
            });
        } else {
            folders = await localPrisma.archiveFolder.findMany({
                where: {
                    sharedWithUsers: {
                        some: {
                            userId: userId,
                            status: 'ACCEPTED'
                        }
                    }
                },
                include: {
                    sharedWithUsers: true,
                    _count: {
                        select: { executions: true }
                    }
                },
                orderBy: { dataUtworzenia: 'desc' }
            });
        }

        // Pobierz zaproszenia (PENDING)
        const invites = await localPrisma.archiveFolder.findMany({
            where: {
                sharedWithUsers: {
                    some: {
                        userId: userId,
                        status: 'PENDING'
                    }
                }
            },
            include: {
                sharedWithUsers: {
                    where: { userId: userId }
                }
            }
        });

        const formattedFolders = folders.map(f => ({
            ...f,
            executionCount: f._count.executions
        }));

        return { success: true, data: formattedFolders, invites };
    } catch (error: any) {
        console.error("Error fetching archive folders:", error);
        return { success: false, error: error.message };
    } finally {
        await localPrisma.$disconnect();
    }
}

// 7. Unarchive Single Execution
export async function unarchiveTaskExecution(executionId: number) {
    const localPrisma = new PrismaClient();
    try {
        await localPrisma.taskExecution.update({
            where: { id: executionId },
            data: {
                isArchived: false,
                archiveFolderId: null
            }
        });
        try { revalidatePath('/tasks'); revalidatePath('/archive'); } catch (e) { }
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    } finally {
        await localPrisma.$disconnect();
    }
}

// 2. Create Archive Folder
export async function createArchiveFolder(name: string, userId?: number) {
    console.log("createArchiveFolder (LOCAL) called:", name, "for user:", userId);
    const localPrisma = new PrismaClient();
    try {
        console.log("Local Prisma models check:", !!localPrisma.archiveFolder);

        const folder = await localPrisma.archiveFolder.create({
            data: {
                nazwa: name
            }
        });
        console.log("Folder created:", folder.id);

        // Automatically share with creator if userId is provided
        if (userId) {
            console.log("Sharing with creator:", userId);
            await localPrisma.userArchiveFolder.create({
                data: {
                    userId: userId,
                    folderId: folder.id,
                    status: 'ACCEPTED'
                }
            });
        }

        try {
            revalidatePath('/tasks');
            revalidatePath('/archive');
        } catch (e) {
            console.warn("Revalidate failed:", e);
        }
        return { success: true, data: folder };
    } catch (error: any) {
        console.error("Create folder error details:", error);
        return { success: false, error: error.message };
    } finally {
        await localPrisma.$disconnect();
    }
}

// 2.1 Update Archive Folder Name
export async function updateArchiveFolder(folderId: number, name: string) {
    const localPrisma = new PrismaClient();
    try {
        const folder = await localPrisma.archiveFolder.update({
            where: { id: folderId },
            data: { nazwa: name }
        });
        try {
            revalidatePath('/tasks');
            revalidatePath('/archive');
        } catch (e) { }
        return { success: true, data: folder };
    } catch (error: any) {
        return { success: false, error: error.message };
    } finally {
        await localPrisma.$disconnect();
    }
}

// 3. Delete Archive Folder
export async function deleteArchiveFolder(folderId: number) {
    const localPrisma = new PrismaClient();
    try {
        await localPrisma.taskExecution.updateMany({
            where: { archiveFolderId: folderId },
            data: {
                isArchived: false,
                archiveFolderId: null
            }
        });

        await localPrisma.archiveFolder.delete({
            where: { id: folderId }
        });

        try { revalidatePath('/tasks'); } catch (e) { }
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    } finally {
        await localPrisma.$disconnect();
    }
}

// 4. Share Archive Folder
export async function shareArchiveFolder(folderId: number, userIds: number[]) {
    const localPrisma = new PrismaClient();
    try {
        // Pobierz aktualnie zaakceptowanych użytkowników dla tego folderu
        const existingAccepted = await localPrisma.userArchiveFolder.findMany({
            where: {
                folderId: folderId,
                status: 'ACCEPTED'
            },
            select: { userId: true }
        });
        const acceptedIds = new Set(existingAccepted.map(ua => ua.userId));

        await localPrisma.userArchiveFolder.deleteMany({
            where: { folderId }
        });

        if (userIds.length > 0) {
            await localPrisma.userArchiveFolder.createMany({
                data: userIds.map(uid => ({
                    userId: uid,
                    folderId: folderId,
                    status: acceptedIds.has(uid) ? 'ACCEPTED' : 'PENDING'
                }))
            });
        }

        try { revalidatePath('/tasks'); revalidatePath('/archive'); } catch (e) { }
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    } finally {
        await localPrisma.$disconnect();
    }
}

// 5. Move Execution to Archive
export async function moveExecutionToArchive(executionIds: number[], folderId: number) {
    const localPrisma = new PrismaClient();
    try {
        await localPrisma.taskExecution.updateMany({
            where: {
                id: { in: executionIds }
            },
            data: {
                isArchived: true,
                archiveFolderId: folderId
            }
        });
        try { revalidatePath('/tasks'); } catch (e) { }
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    } finally {
        await localPrisma.$disconnect();
    }
}

// 6. Get Folder Details (Executions)
export async function getArchiveFolderDetails(folderId: number) {
    const localPrisma = new PrismaClient();
    try {
        const executions = await localPrisma.taskExecution.findMany({
            where: {
                archiveFolderId: folderId,
                isArchived: true
            },
            include: {
                task: {
                    include: {
                        attachments: true,
                        submissions: true,
                        team: true
                    }
                },
                user: {
                    select: {
                        id: true,
                        imieNazwisko: true,
                        rola: true
                    }
                }
            },
            orderBy: { dataOznaczenia: 'desc' }
        });

        return { success: true, data: executions };
    } catch (error: any) {
        return { success: false, error: error.message };
    } finally {
        await localPrisma.$disconnect();
    }
}

// 8. Accept Invite
export async function acceptArchiveInvite(folderId: number, userId: number) {
    const localPrisma = new PrismaClient();
    try {
        await localPrisma.userArchiveFolder.update({
            where: {
                userId_folderId: { userId, folderId }
            },
            data: { status: 'ACCEPTED' }
        });
        try { revalidatePath('/archive'); } catch (e) { }
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    } finally {
        await localPrisma.$disconnect();
    }
}

// 9. Decline Invite
export async function declineArchiveInvite(folderId: number, userId: number) {
    const localPrisma = new PrismaClient();
    try {
        await localPrisma.userArchiveFolder.delete({
            where: {
                userId_folderId: { userId, folderId }
            }
        });
        try { revalidatePath('/archive'); } catch (e) { }
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    } finally {
        await localPrisma.$disconnect();
    }
}
