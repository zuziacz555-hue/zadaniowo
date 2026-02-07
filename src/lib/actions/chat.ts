"use server";

import { PrismaClient } from "../generated/client2";
import { revalidatePath } from "next/cache";

// Funkcja usuwająca stare wiadomości (>24h)
async function cleanupOldMessages(prisma: any) {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    try {
        const deleted = await prisma.chatMessage.deleteMany({
            where: {
                createdAt: {
                    lt: twentyFourHoursAgo
                }
            }
        });
        if (deleted.count > 0) {
            console.log(`[Chat Cleanup] Deleted ${deleted.count} old messages.`);
        }
    } catch (error) {
        console.error("Chat cleanup error:", error);
    }
}

// 1. Wyślij wiadomość
export async function sendChatMessage(senderId: number, receiverId: number, content: string) {
    const localPrisma = new PrismaClient();
    try {
        const message = await localPrisma.chatMessage.create({
            data: {
                senderId,
                receiverId,
                content
            }
        });
        return { success: true, data: message };
    } catch (error: any) {
        return { success: false, error: error.message };
    } finally {
        await localPrisma.$disconnect();
    }
}

// 2. Pobierz historię rozmowy
export async function getChatMessages(userId: number, otherUserId: number) {
    const localPrisma = new PrismaClient();
    try {
        await cleanupOldMessages(localPrisma);

        // Oznacz wiadomości jako przeczytane przy pobieraniu historii
        await localPrisma.chatMessage.updateMany({
            where: {
                senderId: otherUserId,
                receiverId: userId,
                isRead: false
            },
            data: { isRead: true }
        });

        const messages = await localPrisma.chatMessage.findMany({
            where: {
                OR: [
                    { senderId: userId, receiverId: otherUserId },
                    { senderId: otherUserId, receiverId: userId }
                ]
            },
            orderBy: {
                createdAt: 'asc'
            }
        });
        return { success: true, data: messages };
    } catch (error: any) {
        return { success: false, error: error.message };
    } finally {
        await localPrisma.$disconnect();
    }
}

// 2.1 Pobierz liczbę nieprzeczytanych wiadomości
export async function getUnreadChatCount(userId: number) {
    const localPrisma = new PrismaClient();
    try {
        const count = await localPrisma.chatMessage.count({
            where: {
                receiverId: userId,
                isRead: false
            }
        });
        return { success: true, count };
    } catch (error: any) {
        return { success: false, error: error.message };
    } finally {
        await localPrisma.$disconnect();
    }
}

// 2.2 Oznacz wiadomości jako przeczytane
export async function markChatMessagesAsRead(userId: number, otherUserId: number) {
    const localPrisma = new PrismaClient();
    try {
        await localPrisma.chatMessage.updateMany({
            where: {
                senderId: otherUserId,
                receiverId: userId,
                isRead: false
            },
            data: { isRead: true }
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    } finally {
        await localPrisma.$disconnect();
    }
}

// 3. Pobierz listę kontaktów na podstawie roli
export async function getChatContacts(userId: number, role: string) {
    console.log("[Chat] getChatContacts for:", userId, "Role:", role);
    const localPrisma = new PrismaClient();
    try {
        const uppercaseRole = (role || "").toUpperCase();

        // Pobierz ID użytkowników, z którymi była interakcja w ciągu ostatnich 24h (my do nich lub oni do nas)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentInteractions = await localPrisma.chatMessage.findMany({
            where: {
                OR: [
                    { receiverId: userId, createdAt: { gte: twentyFourHoursAgo } },
                    { senderId: userId, createdAt: { gte: twentyFourHoursAgo } }
                ]
            },
            select: { senderId: true, receiverId: true }
        });
        const interactionIds = Array.from(new Set(recentInteractions.flatMap(m => [m.senderId, m.receiverId])))
            .filter(id => id !== userId);

        let baseContacts: any[] = [];

        // 1. Administrator widzi wszystkich
        if (uppercaseRole === 'ADMIN' || uppercaseRole === 'ADMINISTRATOR') {
            baseContacts = await localPrisma.user.findMany({
                where: { id: { not: userId } },
                select: { id: true, imieNazwisko: true, rola: true }
            });
        } else {
            // Pobierz zespoły do których należy użytkownik
            const userTeams = await localPrisma.userTeam.findMany({
                where: { userId },
                select: { teamId: true }
            });
            const teamIds = userTeams.map(ut => ut.teamId);

            if (uppercaseRole === 'KOORDYNATORKA' || uppercaseRole === 'KOORDYNATOR') {
                baseContacts = await localPrisma.user.findMany({
                    where: {
                        OR: [
                            { zespoly: { some: { teamId: { in: teamIds } } } },
                            { rola: { in: ['KOORDYNATORKA', 'KOORDYNATOR'] } },
                            { rola: { in: ['ADMIN', 'ADMINISTRATOR'] } },
                            { id: { in: interactionIds } } // Zawsze pozwól na kontakt z kimś kto do nas napisał
                        ],
                        id: { not: userId }
                    },
                    select: { id: true, imieNazwisko: true, rola: true }
                });
            } else {
                // Uczestniczka
                baseContacts = await localPrisma.user.findMany({
                    where: {
                        OR: [
                            {
                                zespoly: {
                                    some: {
                                        teamId: { in: teamIds },
                                        rola: { in: ['KOORDYNATORKA', 'KOORDYNATOR', 'koordynatorka', 'koordynator'] }
                                    }
                                }
                            },
                            { id: { in: interactionIds } } // Pozwól odpowiedzieć każdemu kto napisał (np. Adminowi)
                        ],
                        id: { not: userId }
                    },
                    select: { id: true, imieNazwisko: true, rola: true }
                });
            }
        }

        // 2. Pobierz ostatnie wiadomości dla każdego kontaktu do sortowania i unread count
        const contactsWithMeta = await Promise.all(baseContacts.map(async (contact) => {
            const lastMessage = await localPrisma.chatMessage.findFirst({
                where: {
                    OR: [
                        { senderId: userId, receiverId: contact.id },
                        { senderId: contact.id, receiverId: userId }
                    ]
                },
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true }
            });

            const unread = await localPrisma.chatMessage.count({
                where: {
                    senderId: contact.id,
                    receiverId: userId,
                    isRead: false
                }
            });

            return {
                ...contact,
                unread,
                lastMessageAt: lastMessage?.createdAt || new Date(0)
            };
        }));

        // 3. Sortuj: najpierw te z ostatnią wiadomością, potem alfabetycznie
        contactsWithMeta.sort((a, b) => {
            if (b.lastMessageAt.getTime() !== a.lastMessageAt.getTime()) {
                return b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
            }
            return a.imieNazwisko.localeCompare(b.imieNazwisko);
        });

        return { success: true, data: contactsWithMeta };

    } catch (error: any) {
        return { success: false, error: error.message };
    } finally {
        await localPrisma.$disconnect();
    }
}
