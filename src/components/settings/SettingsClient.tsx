import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Bell, AlertTriangle, FileText, CheckCircle, XCircle, Users, Sparkles, ToggleLeft, ToggleRight } from "lucide-react";
import { updateSystemSettings, SystemSettingsData } from "@/lib/actions/settings";
import { getTeamById, toggleTeamApplications } from "@/lib/actions/teams";
import { cn } from "@/lib/utils";

interface SettingsClientProps {
    initialSettings: SystemSettingsData;
}

export default function SettingsClient({ initialSettings }: SettingsClientProps) {
    const [settings, setSettings] = useState(initialSettings);
    const [saving, setSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [user, setUser] = useState<any>(null);
    const [teamData, setTeamData] = useState<any>(null);
    const [activeTeamId, setActiveTeamId] = useState<number | null>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        const storedTeamId = localStorage.getItem("activeTeamId");

        if (storedUser) setUser(JSON.parse(storedUser));
        if (storedTeamId) {
            const tId = parseInt(storedTeamId);
            setActiveTeamId(tId);
            fetchTeamData(tId);
        }
    }, []);

    const fetchTeamData = async (teamId: number) => {
        const res = await getTeamById(teamId);
        if (res.success) setTeamData(res.data);
    };

    const handleToggle = async (key: keyof Omit<SystemSettingsData, 'id'>) => {
        console.log(`Toggling setting: ${key} to ${!settings[key]}`);
        setSaving(true);
        setStatusMessage(null);

        const newValue = !settings[key];

        // Optimistic update
        setSettings(prev => ({ ...prev, [key]: newValue }));

        const res = await updateSystemSettings({ [key]: newValue });
        console.log(`Toggle result for ${key}:`, res);

        if (res.success) {
            setStatusMessage({ type: 'success', text: 'Ustawienia zostały zapisane!' });
        } else {
            console.error(`Failed to toggle ${key}:`, res.error);
            // Revert on error
            setSettings(prev => ({ ...prev, [key]: !newValue }));
            setStatusMessage({ type: 'error', text: res.error || 'Błąd zapisu ustawień' });
        }

        setSaving(false);
        setTimeout(() => setStatusMessage(null), 3000);
    };

    const handleToggleApplications = async () => {
        if (!teamData || !activeTeamId) return;
        setSaving(true);
        const newValue = !teamData.allowApplications;

        // Optimistic update
        setTeamData((prev: any) => ({ ...prev, allowApplications: newValue }));

        const res = await toggleTeamApplications(activeTeamId, newValue);
        if (res.success) {
            setStatusMessage({ type: 'success', text: 'Zmieniono status rekrutacji!' });
        } else {
            setTeamData((prev: any) => ({ ...prev, allowApplications: !newValue }));
            setStatusMessage({ type: 'error', text: res.error || 'Błąd zmiany statusu' });
        }
        setSaving(false);
        setTimeout(() => setStatusMessage(null), 3000);
    };

    const isSystem = (user?.name || "").toLowerCase() === "system" || (user?.imieNazwisko || "").toLowerCase() === "system";
    const isSystemAdmin = user?.role === "ADMINISTRATOR" || user?.role === "admin" || isSystem;

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
        },
        {
            key: 'coordinatorTasks' as const,
            icon: Users,
            title: 'Zadania dla koordynatorek',
            description: 'Zezwól na przydzielanie zadań koordynatorkom (opcja dostępna przy tworzeniu zadania)',
            color: 'purple'
        },
        {
            key: 'coordinatorTeamEditing' as const,
            icon: Users,
            title: 'Edycja zespołów przez koordynatorki',
            description: 'Zezwól koordynatorkom na zmianę nazwy, opisu i koloru swojego zespołu',
            color: 'purple'
        },
        {
            key: 'coordinatorResignationAlerts' as const,
            icon: Bell,
            title: 'Alerty o rezygnacji',
            description: 'Powiadomienia dla administratora o rezygnacji koordynatorki z zespołu (wyświetlane na Dashboard)',
            color: 'red'
        },
        {
            key: 'enableDirectorRole' as const,
            icon: Users,
            title: 'Włącz rolę Dyrektorka',
            description: 'Aktywuj funkcję Dyrektorki. Zadania koordynatorek będą ukryte dla administratora do momentu przekazania.',
            color: 'purple'
        },
        {
            key: 'enableCoordinatorApplications' as const,
            icon: Sparkles,
            title: 'Włącz Aplikacje dla Koordynatorek',
            description: 'Zezwól koordynatorkom na widoczność modułu "Aplikacje" (kafel na pulpicie i w menu bocznym).',
            color: 'pink'
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
                {/* System Settings Cards - ONLY FOR ADMINS */}
                {isSystemAdmin && (
                    <div className="space-y-8">
                        {/* Group: Zarządzanie Koordynatorkami */}
                        <div className="lux-card p-8 bg-purple-50/20 border-purple-100">
                            <h2 className="text-2xl font-bold mb-8 pb-4 border-b-4 border-purple-500 inline-block text-purple-900">
                                <Users className="inline-block mr-3 mb-1" size={28} />
                                Zarządzanie Koordynatorkami
                            </h2>
                            <div className="space-y-6">
                                {toggleItems.filter(i =>
                                    ['coordinatorTasks', 'coordinatorTeamEditing'].includes(i.key)
                                ).map((item) => (
                                    <ToggleItem key={item.key} item={item} settings={settings} onToggle={handleToggle} saving={saving} />
                                ))}
                            </div>
                        </div>

                        {/* Group: Centrum Powiadomień */}
                        <div className="lux-card p-8 bg-blue-50/20 border-blue-100">
                            <h2 className="text-2xl font-bold mb-8 pb-4 border-b-4 border-blue-500 inline-block text-blue-900">
                                <Bell className="inline-block mr-3 mb-1" size={28} />
                                Centrum Powiadomień
                            </h2>
                            <div className="space-y-6">
                                {toggleItems.filter(i =>
                                    ['alertsTerminy', 'alertsPoprawki', 'alertsRaporty', 'coordinatorResignationAlerts', 'enableDirectorRole'].includes(i.key)
                                ).map((item) => (
                                    <ToggleItem key={item.key} item={item} settings={settings} onToggle={handleToggle} saving={saving} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Team Specific Settings - FOR COORDS AND ADMINS (but NOT coord in director mode) */}
                {teamData && (() => {
                    const userRole = (user?.rola || user?.role || "").toUpperCase();
                    const storedRole = typeof window !== 'undefined' ? (localStorage.getItem("activeRole") || "").toUpperCase() : "";
                    const isCoordinator = storedRole === "KOORDYNATORKA" || userRole === "KOORDYNATORKA";
                    const directorModeEnabled = settings.enableDirectorRole;
                    // In director mode, coordinator cannot toggle team applications
                    if (isCoordinator && !isSystemAdmin && directorModeEnabled) return null;
                    return (
                        <div className="lux-card p-8">
                            <h2 className="text-2xl font-bold mb-8 pb-4 border-b-4 border-purple-500 inline-block">
                                Ustawienia zespołu: {teamData.nazwa}
                            </h2>

                            <div className="space-y-6">
                                <motion.div
                                    className="flex items-center justify-between p-8 bg-purple-50/30 rounded-3xl border border-purple-100 hover:border-purple-200 transition-all"
                                    whileHover={{ scale: 1.005 }}
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-sm">
                                            <Sparkles size={32} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-xl text-gray-900">System aplikowania</h3>
                                            <p className="text-muted-foreground font-medium max-w-lg">
                                                Zezwól nowym osobom na wysyłanie zgłoszeń do Twojego zespołu.
                                                Kandydatki będą widzieć Twój zespół w sekcji "Dostępne zespoły".
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleToggleApplications}
                                        disabled={saving}
                                        className={cn(
                                            "flex items-center gap-3 px-6 py-3 rounded-2xl font-black uppercase tracking-widest transition-all",
                                            teamData.allowApplications
                                                ? "bg-green-600 text-white shadow-lg shadow-green-200"
                                                : "bg-gray-200 text-gray-500"
                                        )}
                                    >
                                        {teamData.allowApplications ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                                        {teamData.allowApplications ? "Aktywne" : "Wyłączone"}
                                    </button>
                                </motion.div>
                            </div>
                        </div>
                    );
                })()}

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

// Subcomponent for cleaner render
const ToggleItem = ({ item, settings, onToggle, saving }: { item: any, settings: any, onToggle: (key: any) => void, saving: boolean }) => (
    <motion.div
        className="flex items-center justify-between p-6 bg-gray-50/50 rounded-2xl border border-gray-100 hover:border-gray-200 transition-all"
        whileHover={{ scale: 1.005 }}
    >
        <div className="flex items-center gap-4">
            <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                item.color === 'red' && "bg-red-100 text-red-600",
                item.color === 'orange' && "bg-orange-100 text-orange-600",
                item.color === 'blue' && "bg-blue-100 text-blue-600",
                item.color === 'purple' && "bg-purple-100 text-purple-600"
            )}>
                <item.icon size={24} />
            </div>
            <div>
                <h3 className="font-bold text-lg text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground max-w-md">{item.description}</p>
            </div>
        </div>

        <button
            onClick={() => onToggle(item.key)}
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
);
