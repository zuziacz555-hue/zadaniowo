'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export interface SystemSettingsData {
    id: number;
    alertsTerminy: boolean;
    alertsPoprawki: boolean;
    alertsRaporty: boolean;
    coordinatorTasks: boolean;
    coordinatorResignationAlerts: boolean;
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
                    coordinatorResignationAlerts: true
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
                    coordinatorResignationAlerts: data.coordinatorResignationAlerts ?? true
                }
            });
        } else {
            // Update existing
            await prisma.systemSettings.update({
                where: { id: settings.id },
                data: {
                    ...(data.alertsTerminy !== undefined && { alertsTerminy: data.alertsTerminy }),
                    ...(data.alertsPoprawki !== undefined && { alertsPoprawki: data.alertsPoprawki }),
                    ...(data.alertsRaporty !== undefined && { alertsRaporty: data.alertsRaporty }),
                    ...(data.coordinatorTasks !== undefined && { coordinatorTasks: data.coordinatorTasks }),
                    ...(data.coordinatorResignationAlerts !== undefined && { coordinatorResignationAlerts: data.coordinatorResignationAlerts })
                }
            });
        }

        revalidatePath('/admin-settings');
        revalidatePath('/dashboard');

        return { success: true };
    } catch (error) {
        console.error('Error updating system settings:', error);
        return { success: false, error: 'Failed to update settings' };
    }
}
