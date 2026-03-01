'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import fs from 'fs'
import path from 'path'
import { writeFile, mkdir } from 'fs/promises'

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
                },
                attachments: true
            },
            orderBy: {
                dataUtworzenia: 'desc',
            },
        };

        // Role-based filtering
        const isAdmin = role?.toUpperCase() === "ADMINISTRATOR" || role?.toUpperCase() === "ADMIN";
        const isCoord = role?.toUpperCase() === "KOORDYNATORKA" || role?.toUpperCase() === "KOORDYNATOR";
        const isDirector = role?.toUpperCase() === "DYREKTORKA" || role?.toUpperCase() === "DYREKTOR";

        if (isAdmin) {
            // Admins see:
            // 1. Tasks they created
            // 2. Tasks explicitly marked visible to admin
            // 3. Tasks assigned to them (just in case)
            query.where = {
                OR: [
                    { utworzonePrzezId: userId },
                    { isVisibleToAdmin: true },
                    { assignments: { some: { userId: userId } } }, // In case admin is assigned
                    { executions: { some: { userId: userId } } }
                ]
            };

            // If filtering by team, add that constraint
            if (teamId) {
                query.where = {
                    AND: [
                        query.where,
                        { OR: [{ teamId: teamId }, { teamId: null }] }
                    ]
                };
            }
        } else if (isDirector) {
            // Directors see:
            // 1. Tasks in their assigned teams
            // 2. Tasks they created
            // 3. Tasks assigned to them

            // We need to know which teams the Director manages or is assigned to.
            // Assuming the 'Director' role is assigned per team OR globally?
            // The plan says "assigned to specific teams". 
            // So we rely on `userId` to find the user's teams.
            // But `getTasks` filters don't give us the user's full profile.
            // We must assume the caller passes `teamId` if they want to filter by specific team.
            // OR we fetch the user's teams here? Efficient? 
            // Better: Director sees everything in teams where they are a member (as Dyrektorka or otherwise).

            // For now, let's treat Director similar to Coordinator but with potentially more access if we implement 'My Teams' view.
            // If Director is just a role in a team, it behaves like Coordinator for that team.

            query.where = {
                OR: [
                    { teamId: teamId }, // If teamId matches one of their teams (frontend should filter/backend shold verify?)
                    { assignments: { some: { userId: userId } } },
                    { executions: { some: { userId: userId } } },
                    { utworzonePrzezId: userId },
                    // Also include tasks from ALL teams where this user is present?
                    // To be safe and simple: The Director usually views "My Teams" page which passes a teamId.
                    // If viewing "All Tasks":
                    { team: { users: { some: { userId: userId } } } }
                ]
            };

            if (teamId) {
                // If specific team requested
                query.where = {
                    AND: [
                        { OR: [{ teamId: teamId }, { teamId: null }] },
                        {
                            OR: [
                                { team: { users: { some: { userId: userId } } } },
                                { utworzonePrzezId: userId }
                            ]
                        }
                    ]
                };
            } else {
                // All tasks from their teams
                query.where = {
                    OR: [
                        { team: { users: { some: { userId: userId } } } },
                        { utworzonePrzezId: userId }
                    ]
                };
            }

        } else if (isCoord) {
            // Coordinators see ALL tasks for their team OR tasks they are explicitly involved in
            query.where = {
                OR: [
                    { teamId: teamId },
                    { teamId: null },
                    { assignments: { some: { userId: userId } } },
                    { executions: { some: { userId: userId } } },
                    { utworzonePrzezId: userId }
                ]
            };
            if (teamId) {
                query.where = {
                    AND: [
                        { OR: [{ teamId: teamId }, { teamId: null }] },
                        query.where
                    ]
                };
            }
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
                attachments: true,
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
    attachments?: { nazwa: string, url: string }[]
}) {
    try {
        const { assignedUserIds, teamId, includeCoordinators, attachments, ...rest } = data;

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
                } : undefined,
                attachments: attachments && attachments.length > 0 ? {
                    create: attachments
                } : undefined,
                isVisibleToAdmin: (data.utworzonePrzez || "").toLowerCase() === "system" || data.utworzonePrzezId === 1 || data.utworzonePrzez.includes("(Admin)") // Heuristic: Admin created -> Visible. Frontend can pass explicit flag if needed, but for now we assume Admin tasks are visible.
                // Better approach: We should check if the user is Admin in backend, or pass a flag.
                // Let's assume we default to FALSE for safety, and only set TRUE if we are sure?
                // Actually, the requirement: "Admin sees only tasks he created".
                // If he created it, it's visible to him naturally via `utworzonePrzezId` check in getTasks.
                // So `isVisibleToAdmin` is mainly for "Forwarded tasks".
                // So default `false` is FINE. Admin sees his own tasks via `utworzonePrzezId`.
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
                        rola: {
                            in: [
                                ...rolesToInclude.map(r => r.toLowerCase()),
                                ...rolesToInclude.map(r => r.toUpperCase())
                            ]
                        }
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
        // Check if execution has been added to an archive folder
        const execution = await prisma.taskExecution.findUnique({
            where: {
                taskId_userId: { taskId, userId }
            },
            select: { archiveFolderId: true }
        });

        if (execution?.archiveFolderId) {
            // Task is in an archive folder — preserve the record, just hide from accepted view
            await prisma.taskExecution.update({
                where: {
                    taskId_userId: { taskId, userId }
                },
                data: {
                    isArchived: true,
                    status: "USUNIETE"
                }
            });
        } else {
            // Not archived — delete completely
            await prisma.taskExecution.deleteMany({
                where: {
                    taskId,
                    userId
                }
            });
        }

        await prisma.taskSubmission.deleteMany({
            where: {
                taskId,
                userId
            }
        });

        await prisma.taskAssignment.deleteMany({
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
export async function updateTask(taskId: number, data: {
    tytul?: string
    opis?: string
    priorytet?: string
    termin?: string
}) {
    try {
        await prisma.task.update({
            where: { id: taskId },
            data: {
                ...data,
                termin: data.termin ? new Date(data.termin) : undefined
            }
        });

        revalidatePath('/tasks');
        revalidatePath('/admin-teams');
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Error updating task:', error);
        return { success: false, error: 'Failed to update task' };
    }
}

export async function addTaskAttachment(taskId: number, nazwa: string, url: string) {
    try {
        const attachment = await prisma.taskAttachment.create({
            data: {
                taskId,
                nazwa,
                url,
            },
        });
        revalidatePath('/tasks');
        revalidatePath('/admin-teams');
        return { success: true, data: attachment };
    } catch (error) {
        console.error('Error adding attachment:', error);
        return { success: false, error: 'Failed to add attachment' };
    }
}

export async function deleteTaskAttachment(attachmentId: number) {
    try {
        await prisma.taskAttachment.delete({
            where: { id: attachmentId },
        });
        revalidatePath('/tasks');
        revalidatePath('/admin-teams');
        return { success: true };
    } catch (error) {
        console.error('Error deleting attachment:', error);
        return { success: false, error: 'Failed to delete attachment' };
    }
}

import { v2 as cloudinary } from 'cloudinary'

export async function uploadTaskFile(formData: FormData) {
    try {
        const file = formData.get('file') as File;
        if (!file) {
            return { success: false, error: 'Nie przesłano pliku' };
        }
        // Configure Cloudinary inside to ensure env vars are fresh
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        // Debug log (masking secret)
        console.log('Cloudinary Config:', {
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY ? 'present' : 'missing',
            api_secret: process.env.CLOUDINARY_API_SECRET ? 'present' : 'missing'
        });

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload to Cloudinary using promise
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'unionki-tasks',
                    resource_type: 'auto',
                    public_id: `${Date.now()}-${file.name.replace(/\.[^/.]+$/, "").replace(/\s+/g, '_')}`
                },
                (error, result) => {
                    if (error) {
                        console.error('Cloudinary stream error:', error);
                        reject(error);
                    } else resolve(result);
                }
            );
            uploadStream.end(buffer);
        }) as any;

        return {
            success: true,
            url: uploadResult.secure_url,
            name: file.name
        };
    } catch (error: any) {
        console.error('Error uploading file to Cloudinary:', error);
        let errorMsg = 'Błąd podczas przesyłania pliku do chmury';

        if (error.message && error.message.includes('body size limit')) {
            errorMsg = 'Plik jest zbyt duży. Maksymalny rozmiar to 10MB.';
        } else if (error.http_code === 413) {
            errorMsg = 'Plik jest zbyt duży dla serwera.';
        } else if (error.message) {
            errorMsg = `Błąd chmury: ${error.message}`;
        }

        return { success: false, error: errorMsg };
    }
}

export async function addTaskAssignee(taskId: number, userId: number, imieNazwisko: string) {
    try {
        // 1. Create assignment
        await prisma.taskAssignment.create({
            data: {
                taskId,
                userId
            }
        });

        // 2. Create execution (with unique constraint check)
        await prisma.taskExecution.upsert({
            where: {
                taskId_userId: {
                    taskId,
                    userId
                }
            },
            update: {
                status: "AKTYWNE",
                dataOznaczenia: new Date(),
                imieNazwisko: imieNazwisko
            },
            create: {
                taskId,
                userId,
                status: "AKTYWNE",
                imieNazwisko: imieNazwisko,
                dataOznaczenia: new Date()
            }
        });

        revalidatePath('/tasks');
        revalidatePath('/admin-teams');
        return { success: true };
    } catch (error) {
        console.error('Error adding task assignee:', error);
        return { success: false, error: 'Nie udało się dodać osoby do zadania' };
    }
}

export async function forwardTaskToAdmin(taskId: number) {
    try {
        await prisma.task.update({
            where: { id: taskId },
            data: { isVisibleToAdmin: true }
        });
        revalidatePath('/tasks');
        revalidatePath('/admin-teams');
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Error forwarding task to admin:', error);
        return { success: false, error: 'Failed to forward task' };
    }
}
