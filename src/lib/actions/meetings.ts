'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getMeetings(teamId?: number) {
    try {
        const meetings = await prisma.meeting.findMany({
            where: teamId ? { teamId } : undefined,
            include: {
                team: true,
                attendance: {
                    include: {
                        user: true
                    }
                },
            },
            orderBy: {
                data: 'desc',
            },
        })
        return { success: true, data: meetings }
    } catch (error) {
        console.error('Error fetching meetings:', error)
        return { success: false, error: 'Failed to fetch meetings' }
    }
}

export async function createMeeting(data: {
    teamId: number
    data: string
    godzina: string
    opis: string
    opisDodatkowy?: string
}) {
    try {
        const meeting = await prisma.meeting.create({
            data: {
                ...data,
                data: new Date(`${data.data}T${data.godzina}`),
                godzina: new Date(`1970-01-01T${data.godzina}`),
            },
        })
        revalidatePath('/meetings')
        revalidatePath('/reports')
        return { success: true, data: meeting }
    } catch (error) {
        console.error('Error creating meeting:', error)
        return { success: false, error: 'Failed to create meeting' }
    }
}

export async function updateMeeting(id: number, data: Partial<{
    data: string
    godzina: string
    opis: string
    opisDodatkowy: string
}>) {
    try {
        // Fetch existing meeting to merge date/time if only one is updated
        const existing = await prisma.meeting.findUnique({ where: { id } });
        if (!existing) return { success: false, error: "Meeting not found" };

        let newData = undefined;
        if (data.data || data.godzina) {
            const dateStr = data.data || existing.data.toISOString().split('T')[0];
            const timeStr = data.godzina || existing.godzina.toISOString().split('T')[1].substring(0, 5); // HH:MM
            newData = new Date(`${dateStr}T${timeStr}`);
        }

        const meeting = await prisma.meeting.update({
            where: { id },
            data: {
                ...(newData && { data: newData }),
                ...(data.godzina && { godzina: new Date(`1970-01-01T${data.godzina}`) }),
                ...(data.opis && { opis: data.opis }),
                ...(data.opisDodatkowy !== undefined && { opisDodatkowy: data.opisDodatkowy }),
            },
        })
        revalidatePath('/meetings')
        revalidatePath('/reports')
        return { success: true, data: meeting }
    } catch (error) {
        console.error('Error updating meeting:', error)
        return { success: false, error: 'Failed to update meeting' }
    }
}

export async function deleteMeeting(id: number) {
    try {
        await prisma.meeting.delete({
            where: { id },
        })
        revalidatePath('/meetings')
        revalidatePath('/reports')
        return { success: true }
    } catch (error) {
        console.error('Error deleting meeting:', error)
        return { success: false, error: 'Failed to delete meeting' }
    }
}

export async function addAttendance(meetingId: number, imieNazwisko: string, userId?: number) {
    try {
        // Prevent duplicate attendance for same user or same name if no user id
        const existing = await prisma.attendance.findFirst({
            where: {
                meetingId,
                OR: [
                    userId ? { userId } : { imieNazwisko }
                ]
            }
        });

        if (existing) {
            return { success: true, data: existing, message: "Already registered" }
        }

        const attendance = await prisma.attendance.create({
            data: {
                meetingId,
                imieNazwisko,
                userId
            },
        })
        revalidatePath('/meetings')
        revalidatePath('/reports')
        return { success: true, data: attendance }
    } catch (error) {
        console.error('Error adding attendance:', error)
        return { success: false, error: 'Failed to add attendance' }
    }
}

export async function removeAttendance(id: number) {
    try {
        await prisma.attendance.delete({
            where: { id },
        })
        revalidatePath('/meetings')
        return { success: true }
    } catch (error) {
        console.error('Error removing attendance:', error)
        return { success: false, error: 'Failed to remove attendance' }
    }
}
