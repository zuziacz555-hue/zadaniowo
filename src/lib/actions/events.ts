'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getEvents(teamId?: number) {
    try {
        // Note: Event model currently does not have a teamId field.
        // If events are meant to be global, we return all. 
        // If they should be team-specific, the schema needs an update.
        const events = await prisma.event.findMany({
            include: {
                participants: true,
                _count: {
                    select: {
                        participants: true,
                    },
                },
            },
            orderBy: {
                data: 'asc',
            },
        })
        return { success: true, data: events }
    } catch (error) {
        console.error('Error fetching events:', error)
        return { success: false, error: 'Failed to fetch events' }
    }
}

export async function createEvent(data: {
    nazwa: string
    data?: string
    limitOsob?: number
}) {
    try {
        const event = await prisma.event.create({
            data: {
                ...data,
                data: data.data ? new Date(data.data) : null,
            },
        })
        revalidatePath('/events')
        return { success: true, data: event }
    } catch (error) {
        console.error('Error creating event:', error)
        return { success: false, error: 'Failed to create event' }
    }
}

export async function registerForEvent(eventId: number, imieNazwisko: string, userId?: number) {
    try {
        const registration = await prisma.eventRegistration.create({
            data: {
                eventId,
                imieNazwisko,
                userId,
            },
        })
        revalidatePath('/events')
        return { success: true, data: registration }
    } catch (error) {
        console.error('Error registering for event:', error)
        return { success: false, error: 'Failed to register for event' }
    }
}

export async function unregisterFromEvent(registrationId: number) {
    try {
        await prisma.eventRegistration.delete({
            where: { id: registrationId },
        })
        revalidatePath('/events')
        return { success: true }
    } catch (error) {
        console.error('Error unregistering from event:', error)
        return { success: false, error: 'Failed to unregister from event' }
    }
}

export async function deleteEvent(id: number) {
    try {
        await prisma.event.delete({
            where: { id },
        })
        revalidatePath('/events')
        return { success: true }
    } catch (error) {
        console.error('Error deleting event:', error)
        return { success: false, error: 'Failed to delete event' }
    }
}
