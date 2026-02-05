"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Bell, AlertTriangle, FileText, CheckCircle, XCircle } from "lucide-react";
import { updateSystemSettings, SystemSettingsData } from "@/lib/actions/settings";
import { cn } from "@/lib/utils";

interface SettingsClientProps {
    initialSettings: SystemSettingsData;
}

export default function SettingsClient({ initialSettings }: SettingsClientProps) {
    const [settings, setSettings] = useState(initialSettings);
    const [saving, setSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleToggle = async (key: keyof Omit<SystemSettingsData, 'id'>) => {
        setSaving(true);
        setStatusMessage(null);

        const newValue = !settings[key];

        // Optimistic update
        setSettings(prev => ({ ...prev, [key]: newValue }));

        const res = await updateSystemSettings({ [key]: newValue });

        if (res.success) {
            setStatusMessage({ type: 'success', text: 'Ustawienia zostały zapisane!' });
        } else {
            // Revert on error
            setSettings(prev => ({ ...prev, [key]: !newValue }));
            setStatusMessage({ type: 'error', text: res.error || 'Błąd zapisu ustawień' });
        }

        setSaving(false);

        // Auto-hide message
        setTimeout(() => setStatusMessage(null), 3000);
    };

    const toggleItems = [
        {
            key: 'alertsTerminy' as const,
            icon: AlertTriangle,
            title: 'Alerty o terminach',
            description: 'Powiadomienia dla uczestniczek o przeterminowanych zadaniach (wyświetlane na Dashboard)',
            color: 'red'
        },
        {
            key: 'alertsPoprawki' as const,
            icon: FileText,
            title: 'Alerty o poprawkach',
            description: 'Powiadomienia dla uczestniczek o zadaniach wymagających poprawy (wyświetlane na Dashboard)',
            color: 'orange'
        },
        {
            key: 'alertsRaporty' as const,
            icon: Bell,
            title: 'Alerty o raportach',
            description: 'Powiadomienia dla koordynatorek o brakujących sprawozdaniach (wyświetlane na Dashboard)',
            color: 'blue'
        }
    ];

    return (
        <DashboardLayout>
            <div className="space-y-8 animate-slide-in">
                {/* Header */}
                <div className="lux-card p-8">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center shadow-lg">
                            <Settings className="text-white" size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold gradient-text">Ustawienia systemu</h1>
                            <p className="text-muted-foreground text-sm mt-1">
                                Zarządzaj globalnymi ustawieniami alertów i powiadomień
                            </p>
                        </div>
                    </div>
                </div>

                {/* Status Message */}
                <AnimatePresence>
                    {statusMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={cn(
                                "p-4 rounded-xl flex items-center gap-3 font-bold",
                                statusMessage.type === 'success'
                                    ? "bg-green-50 text-green-700 border border-green-200"
                                    : "bg-red-50 text-red-700 border border-red-200"
                            )}
                        >
                            {statusMessage.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                            {statusMessage.text}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Settings Cards */}
                <div className="lux-card p-8">
                    <h2 className="text-2xl font-bold mb-8 pb-4 border-b-4 border-primary inline-block">
                        Powiadomienia i alerty
                    </h2>

                    <div className="space-y-6">
                        {toggleItems.map((item) => (
                            <motion.div
                                key={item.key}
                                className="flex items-center justify-between p-6 bg-gray-50/50 rounded-2xl border border-gray-100 hover:border-gray-200 transition-all"
                                whileHover={{ scale: 1.005 }}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-12 h-12 rounded-xl flex items-center justify-center",
                                        item.color === 'red' && "bg-red-100 text-red-600",
                                        item.color === 'orange' && "bg-orange-100 text-orange-600",
                                        item.color === 'blue' && "bg-blue-100 text-blue-600"
                                    )}>
                                        <item.icon size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-foreground">{item.title}</h3>
                                        <p className="text-sm text-muted-foreground max-w-md">{item.description}</p>
                                    </div>
                                </div>

                                {/* Toggle Switch */}
                                <button
                                    onClick={() => handleToggle(item.key)}
                                    disabled={saving}
                                    className={cn(
                                        "relative w-14 h-7 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50",
                                        settings[item.key]
                                            ? "bg-primary"
                                            : "bg-gray-300",
                                        saving && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300",
                                            settings[item.key] ? "translate-x-7" : "translate-x-0"
                                        )}
                                    />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-start gap-4">
                    <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                        <Bell size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-blue-900">Informacja</h4>
                        <p className="text-blue-700 text-sm">
                            Wyłączenie alertu spowoduje, że nie będzie on wyświetlany na Dashboardzie żadnemu użytkownikowi w systemie.
                            Zmiany są natychmiastowe i dotyczą wszystkich zespołów.
                        </p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
