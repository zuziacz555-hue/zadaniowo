'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getNotifications(userId?: number) {
    try {
        const notifications = await prisma.notification.findMany({
            where: {
                OR: [
                    { type: 'RESIGNATION', status: { in: ['PENDING', 'WAITING_FOR_CONFIRMATION', 'ACCEPTED'] } },
                    ...(userId ? [{ userId, status: 'WAITING_FOR_CONFIRMATION' }] : [])
                ]
            },
            include: {
                team: true,
                user: true
            },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, data: notifications }
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return { success: false, error: 'Failed to fetch notifications' }
    }
}

export async function createResignationNotification(teamId: number, resignedUserId: number) {
    try {
        const user = await prisma.user.findUnique({ where: { id: resignedUserId } });
        const team = await prisma.team.findUnique({ where: { id: teamId }, include: { users: true } });

        if (!user || !team) return { success: false, error: 'User or team not found' };

        const coordinators = team.users.filter(u => u.rola === 'koordynatorka');
        const multiCoord = coordinators.length > 0;

        const notification = await prisma.notification.create({
            data: {
                type: 'RESIGNATION',
                status: 'PENDING',
                teamId: teamId,
                userId: resignedUserId,
                data: {
                    resignedUserName: user.imieNazwisko,
                    multiCoord: multiCoord
                }
            }
        });

        revalidatePath('/dashboard');
        return { success: true, data: notification };
    } catch (error) {
        console.error('Error creating resignation notification:', error);
        return { success: false, error: 'Failed to create notification' };
    }
}

export async function nominateCoordinator(notificationId: number, memberId: number) {
    try {
        const member = await prisma.user.findUnique({ where: { id: memberId } });
        if (!member) return { success: false, error: 'Member not found' };

        const notification = await prisma.notification.update({
            where: { id: notificationId },
            data: {
                status: 'WAITING_FOR_CONFIRMATION',
                userId: memberId,
                data: {
                    ...(typeof (await prisma.notification.findUnique({ where: { id: notificationId } }))?.data === 'object'
                        ? (await prisma.notification.findUnique({ where: { id: notificationId } }))?.data as any
                        : {}),
                    targetUserName: member.imieNazwisko
                }
            }
        });

        revalidatePath('/dashboard');
        return { success: true, data: notification };
    } catch (error) {
        console.error('Error nominating coordinator:', error);
        return { success: false, error: 'Failed to nominate coordinator' };
    }
}

export async function respondToInvitation(notificationId: number, accept: boolean) {
    try {
        const notification = await prisma.notification.findUnique({
            where: { id: notificationId },
            include: { team: true, user: true }
        });

        if (!notification) return { success: false, error: 'Notification not found' };

        if (accept) {
            // Update user role in the team
            await prisma.userTeam.updateMany({
                where: {
                    userId: notification.userId!,
                    teamId: notification.teamId
                },
                data: { rola: 'koordynatorka' }
            });

            await prisma.notification.update({
                where: { id: notificationId },
                data: { status: 'ACCEPTED' }
            });
        } else {
            // Revert to PENDING if rejected
            await prisma.notification.update({
                where: { id: notificationId },
                data: {
                    status: 'PENDING',
                    userId: null, // Reset to no target user
                    data: {
                        ...(notification.data as any),
                        targetUserName: undefined
                    }
                }
            });
        }

        revalidatePath('/dashboard');
        revalidatePath('/admin-teams');
        return { success: true };
    } catch (error) {
        console.error('Error responding to invitation:', error);
        return { success: false, error: 'Failed to process response' };
    }
}

export async function dismissNotification(notificationId: number) {
    try {
        await prisma.notification.delete({
            where: { id: notificationId }
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Error dismissing notification:', error);
        return { success: false, error: 'Failed to dismiss notification' };
    }
}
