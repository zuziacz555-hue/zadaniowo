'use server'

import { prisma } from '@/lib/prisma'

export interface ParticipantAlert {
    id: string;
    type: 'overdue' | 'rejected';
    taskId: number;
    taskTitle: string;
    message: string;
    deadline?: string;
    rejectionNote?: string;
    correctionDeadline?: string;
}

export async function getParticipantAlerts(teamId: number, userId: number): Promise<{ success: boolean; alerts: ParticipantAlert[]; error?: string }> {
    try {
        const now = new Date();

        // 1. Get overdue tasks (AKTYWNE status, deadline passed)
        const overdueExecutions = await prisma.taskExecution.findMany({
            where: {
                userId: userId,
                status: "AKTYWNE",
                task: {
                    teamId: teamId,
                    termin: {
                        lt: now
                    }
                }
            },
            include: {
                task: true
            }
        });

        // 2. Get rejected tasks (ODRZUCONE status)
        const rejectedExecutions = await prisma.taskExecution.findMany({
            where: {
                userId: userId,
                status: "ODRZUCONE",
                task: {
                    teamId: teamId
                }
            },
            include: {
                task: true
            }
        });

        const alerts: ParticipantAlert[] = [];

        // Process overdue
        overdueExecutions.forEach((ex: any) => {
            // Check if correction deadline overrides (if task was rejected before and has terminPoprawki)
            const effectiveDeadline = ex.terminPoprawki ? new Date(ex.terminPoprawki) : (ex.task.termin ? new Date(ex.task.termin) : null);
            if (effectiveDeadline && effectiveDeadline < now) {
                alerts.push({
                    id: `overdue-${ex.taskId}`,
                    type: 'overdue',
                    taskId: ex.taskId,
                    taskTitle: ex.task.tytul,
                    message: `Minął termin wykonania zadania "${ex.task.tytul}". Prosimy o wykonanie go możliwie jak najszybciej!`,
                    deadline: effectiveDeadline.toLocaleDateString('pl-PL')
                });
            }
        });

        // Process rejected
        rejectedExecutions.forEach((ex: any) => {
            alerts.push({
                id: `rejected-${ex.taskId}`,
                type: 'rejected',
                taskId: ex.taskId,
                taskTitle: ex.task.tytul,
                message: `Twoje zadanie "${ex.task.tytul}" wymaga poprawek.`,
                rejectionNote: ex.uwagiOdrzucenia || 'Brak uwag',
                correctionDeadline: ex.terminPoprawki ? new Date(ex.terminPoprawki).toLocaleDateString('pl-PL') : 'Bezterminowo'
            });
        });

        return { success: true, alerts };

    } catch (error) {
        console.error('Error fetching participant alerts:', error);
        return { success: false, alerts: [], error: 'Failed to fetch alerts' };
    }
}
