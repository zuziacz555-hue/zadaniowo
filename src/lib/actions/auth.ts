'use server'

import { prisma } from '@/lib/prisma'

export async function login(username: string, password: string) {
    try {
        const user = await prisma.user.findFirst({
            where: {
                imieNazwisko: username,
                haslo: password,
            },
            include: {
                zespoly: {
                    include: {
                        team: true
                    }
                }
            }
        })

        if (!user) {
            return { success: false, error: 'Nieprawidłowe imię i nazwisko lub hasło.' }
        }

        // In a real app, we would set a session cookie here.
        // For now, we'll just return success and the user info.
        return {
            success: true,
            user: {
                id: user.id,
                name: user.imieNazwisko,
                role: user.rola,
                teams: user.zespoly.map((ut: any) => ut.team.nazwa)
            }
        }
    } catch (error) {
        console.error('Login error:', error)
        return { success: false, error: 'Wystąpił błąd serwera. Spróbuj ponownie.' }
    }
}
