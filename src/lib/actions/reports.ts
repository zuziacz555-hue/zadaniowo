'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getReports(teamId?: number) {
    try {
        const reports = await prisma.report.findMany({
            where: teamId ? {
                meeting: {
                    teamId: teamId
                }
            } : undefined,
            include: {
                meeting: {
                    include: {
                        attendance: true,
                        team: true
                    }
                }
            },
            orderBy: {
                dataUtworzenia: 'desc'
            }
        });
        return { success: true, data: reports }
    } catch (error) {
        console.error('Error fetching reports:', error)
        return { success: false, error: 'Failed to fetch reports' }
    }
}

export async function createReport(data: {
    meetingId: number
    tresc: string
    utworzonePrzez: string
    confirmedUserIds: number[] // IDs of users confirmed present
    addedUserIds: number[] // IDs of users added manually (were not registered)
}) {
    try {
        // 1. Create Report
        const report = await prisma.report.create({
            data: {
                meetingId: data.meetingId,
                tresc: data.tresc,
                utworzonePrzez: data.utworzonePrzez
            }
        });

        // 2. Mark existing registrations as confirmed
        if (data.confirmedUserIds.length > 0) {
            await prisma.attendance.updateMany({
                where: {
                    meetingId: data.meetingId,
                    userId: { in: data.confirmedUserIds }
                },
                data: {
                    confirmed: true
                }
            });
        }

        // 3. Add manual attendances (confirmed by default) for added users
        // Need to fetch user names first
        if (data.addedUserIds.length > 0) {
            const users = await prisma.user.findMany({
                where: { id: { in: data.addedUserIds } },
                select: { id: true, imieNazwisko: true }
            });

            for (const user of users) {
                // Check if not already exists to be safe
                const exists = await prisma.attendance.findFirst({
                    where: { meetingId: data.meetingId, userId: user.id }
                });

                if (!exists) {
                    await prisma.attendance.create({
                        data: {
                            meetingId: data.meetingId,
                            userId: user.id,
                            imieNazwisko: user.imieNazwisko,
                            confirmed: true
                        }
                    });
                } else {
                    // Update if exists but wasn't confirmed
                    await prisma.attendance.update({
                        where: { id: exists.id },
                        data: { confirmed: true }
                    });
                }
            }
        }

        revalidatePath('/reports')
        revalidatePath('/meetings')
        revalidatePath('/dashboard')

        return { success: true, data: report }
    } catch (error) {
        console.error('Error creating report:', error)
        return { success: false, error: 'Failed to create report' }
    }
}

export async function updateReport(id: number, data: {
    tresc: string
    confirmedUserIds: number[]
    addedUserIds: number[]
}) {
    try {
        // 1. Fetch existing report to get meetingId
        const existingReport = await prisma.report.findUnique({
            where: { id },
            select: { meetingId: true }
        });

        if (!existingReport) return { success: false, error: 'Raport nie istnieje.' };

        // 2. Update Report content
        await prisma.report.update({
            where: { id },
            data: { tresc: data.tresc }
        });

        // 3. Reset all attendance for this meeting to NOT confirmed
        await prisma.attendance.updateMany({
            where: { meetingId: existingReport.meetingId },
            data: { confirmed: false }
        });

        // 4. Mark confirmed existing registrations
        if (data.confirmedUserIds.length > 0) {
            await prisma.attendance.updateMany({
                where: {
                    meetingId: existingReport.meetingId,
                    userId: { in: data.confirmedUserIds }
                },
                data: { confirmed: true }
            });
        }

        // 5. Handle manual attendances (confirmed by default) for added users
        if (data.addedUserIds.length > 0) {
            const users = await prisma.user.findMany({
                where: { id: { in: data.addedUserIds } },
                select: { id: true, imieNazwisko: true }
            });

            for (const user of users) {
                const exists = await prisma.attendance.findFirst({
                    where: { meetingId: existingReport.meetingId, userId: user.id }
                });

                if (!exists) {
                    await prisma.attendance.create({
                        data: {
                            meetingId: existingReport.meetingId,
                            userId: user.id,
                            imieNazwisko: user.imieNazwisko,
                            confirmed: true
                        }
                    });
                } else {
                    await prisma.attendance.update({
                        where: { id: exists.id },
                        data: { confirmed: true }
                    });
                }
            }
        }

        revalidatePath('/reports')
        revalidatePath('/meetings')
        revalidatePath('/dashboard')

        return { success: true }
    } catch (error) {
        console.error('Error updating report:', error)
        return { success: false, error: 'Failed to update report' }
    }
}

export async function checkMissingReports(teamId: number) {
    try {
        const meetings = await prisma.meeting.findMany({
            where: {
                teamId: teamId,
                report: null, // No report yet
                data: {
                    lt: new Date() // Past meetings
                }
            }
        });

        const now = Date.now();
        const overdue = meetings.filter(m => {
            const meetingTime = new Date(m.data).getTime();
            // Check if 24h passed
            return (now - meetingTime) > (24 * 60 * 60 * 1000);
        });

        return { success: true, count: overdue.length, meetings: overdue }
    } catch (error) {
        console.error('Error checking missing reports:', error)
        return { success: false, error: 'Failed to check missing reports' }
    }
}

export async function deleteReport(id: number) {
    try {
        await prisma.report.delete({
            where: { id }
        });

        revalidatePath('/reports')
        revalidatePath('/meetings')
        revalidatePath('/dashboard')

        return { success: true }
    } catch (error) {
        console.error('Error deleting report:', error)
        return { success: false, error: 'Failed to delete report' }
    }
}


