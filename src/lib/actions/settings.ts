'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export interface SystemSettingsData {
    id: number;
    alertsTerminy: boolean;
    alertsPoprawki: boolean;
    alertsRaporty: boolean;
    coordinatorTasks: boolean;
    coordinatorTeamEditing: boolean;
    coordinatorResignationAlerts: boolean;
    enableDirectorRole: boolean;
    enableCoordinatorApplications: boolean;
}

// Get current system settings (creates defaults if none exist)
export async function getSystemSettings(): Promise<{ success: boolean; data?: SystemSettingsData; error?: string }> {
    try {
        let settings = await prisma.systemSettings.findFirst();

        // Create default settings if none exist
        if (!settings) {
            settings = await prisma.systemSettings.create({
                data: {
                    alertsTerminy: true,
                    alertsPoprawki: true,
                    alertsRaporty: true,
                    coordinatorTasks: false,
                    coordinatorTeamEditing: false,
                    coordinatorResignationAlerts: true,
                    enableDirectorRole: false,
                    enableCoordinatorApplications: false
                }
            });
        }

        return { success: true, data: settings as SystemSettingsData };
    } catch (error) {
        console.error('Error fetching system settings:', error);
        return { success: false, error: 'Failed to fetch settings' };
    }
}

// Update system settings (admin only)
export async function updateSystemSettings(data: Partial<Omit<SystemSettingsData, 'id'>>): Promise<{ success: boolean; error?: string }> {
    try {
        let settings = await prisma.systemSettings.findFirst();

        if (!settings) {
            // Create with provided values
            await prisma.systemSettings.create({
                data: {
                    alertsTerminy: data.alertsTerminy ?? true,
                    alertsPoprawki: data.alertsPoprawki ?? true,
                    alertsRaporty: data.alertsRaporty ?? true,
                    coordinatorTasks: data.coordinatorTasks ?? false,
                    coordinatorTeamEditing: data.coordinatorTeamEditing ?? false,
                    coordinatorResignationAlerts: data.coordinatorResignationAlerts ?? true,
                    enableDirectorRole: data.enableDirectorRole ?? false
                }
            });
        } else {
            const wasEnabled = settings.enableDirectorRole;
            const nowEnabled = data.enableDirectorRole ?? wasEnabled;

            // Update existing
            await prisma.$transaction(async (tx) => {
                await tx.systemSettings.update({
                    where: { id: settings!.id },
                    data: {
                        ...(data.alertsTerminy !== undefined && { alertsTerminy: data.alertsTerminy }),
                        ...(data.alertsPoprawki !== undefined && { alertsPoprawki: data.alertsPoprawki }),
                        ...(data.alertsRaporty !== undefined && { alertsRaporty: data.alertsRaporty }),
                        ...(data.coordinatorTasks !== undefined && { coordinatorTasks: data.coordinatorTasks }),
                        ...(data.coordinatorTeamEditing !== undefined && { coordinatorTeamEditing: data.coordinatorTeamEditing }),
                        ...(data.coordinatorResignationAlerts !== undefined && { coordinatorResignationAlerts: data.coordinatorResignationAlerts }),
                        ...(data.enableDirectorRole !== undefined && { enableDirectorRole: data.enableDirectorRole })
                    }
                });

                // If role was enabled and now is disabled -> demote everyone
                if (wasEnabled && !nowEnabled) {
                    console.log('Demoting all directors to participants/coordinators...');
                    // 1. All global roles "DYREKTORKA" -> "UCZESTNICZKA"
                    await tx.user.updateMany({
                        where: { rola: 'DYREKTORKA' },
                        data: { rola: 'UCZESTNICZKA' }
                    });

                    // 2. All team roles "dyrektorka" -> "koordynatorka"
                    // Note: case might vary depending on how it was saved, but usually it's "dyrektorka" in prisma or "DYREKTORKA"
                    // We check for both common variants just in case
                    await tx.userTeam.updateMany({
                        where: { rola: { in: ['dyrektorka', 'DYREKTORKA'] } },
                        data: { rola: 'koordynatorka' }
                    });
                }
            });
        }

        try {
            revalidatePath('/admin-settings');
            revalidatePath('/admin-users');
            revalidatePath('/dashboard');
        } catch (e) {
            // Likely running in a script/test environment
        }

        return { success: true };
    } catch (error) {
        console.error('Error updating system settings:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error updating settings'
        };
    }
}
