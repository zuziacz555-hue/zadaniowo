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
    recurrence?: {
        intervalDays: number
        endDate: string
    }
}) {
    try {
        const meetingsToCreate = [];
        const baseDate = new Date(data.data);
        const timeDate = new Date(`1970-01-01T${data.godzina}`);

        // Always create the first meeting
        meetingsToCreate.push({
            data: new Date(`${data.data}T${data.godzina}`),
            godzina: timeDate,
            opis: data.opis,
            opisDodatkowy: data.opisDodatkowy,
            teamId: data.teamId
        });

        // If recurrence is enabled, generate future dates
        if (data.recurrence && data.recurrence.intervalDays > 0 && data.recurrence.endDate) {
            const endDate = new Date(data.recurrence.endDate);
            let nextDate = new Date(baseDate);
            nextDate.setDate(nextDate.getDate() + data.recurrence.intervalDays);

            while (nextDate <= endDate) {
                const dateStr = nextDate.toISOString().split('T')[0];
                meetingsToCreate.push({
                    data: new Date(`${dateStr}T${data.godzina}`),
                    godzina: timeDate,
                    opis: data.opis,
                    opisDodatkowy: data.opisDodatkowy,
                    teamId: data.teamId
                });

                // Advance to next interval
                nextDate.setDate(nextDate.getDate() + data.recurrence.intervalDays);
            }
        }

        // Use transaction to create all meetings
        const result = await prisma.$transaction(
            meetingsToCreate.map(meeting => prisma.meeting.create({ data: meeting }))
        );

        revalidatePath('/meetings')
        revalidatePath('/reports')
        return { success: true, count: result.length, data: result[0] } // Return first meeting as reference
    } catch (error) {
        console.error('Error creating meeting:', error)
        return { success: false, error: 'Failed to create meeting(s)' }
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

export async function deleteMeetingsBulk(ids: number[]) {
    try {
        if (!ids || ids.length === 0) return { success: true, count: 0 };

        const result = await prisma.meeting.deleteMany({
            where: {
                id: { in: ids }
            }
        });

        revalidatePath('/meetings');
        revalidatePath('/reports');
        return { success: true, count: result.count };
    } catch (error) {
        console.error('Error deleting meetings bulk:', error);
        return { success: false, error: 'Failed to delete meetings' };
    }
}

export async function deleteMeetingsByName(name: string, teamId?: number) {
    try {
        if (!name) return { success: false, error: 'Name is required' };

        const result = await prisma.meeting.deleteMany({
            where: {
                opis: name, // Using exact match for now
                ...(teamId ? { teamId } : {})
            }
        });

        revalidatePath('/meetings');
        revalidatePath('/reports');
        return { success: true, count: result.count };
    } catch (error) {
        console.error('Error deleting meetings by name:', error);
        return { success: false, error: 'Failed to delete meetings by name' };
    }
}
