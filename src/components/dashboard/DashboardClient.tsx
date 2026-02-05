"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { staggerContainer, popIn, slideUp, scaleIn } from "@/lib/animations";
import { useEffect, useState } from "react";
import {
    Calendar,
    ClipboardList,
    Megaphone,
    Users,
    MessageSquareText,
    Crown,
    UserCog,
    CheckCircle2,
    Sparkles,
    AlertTriangle,
    Trash2,
    Settings
} from "lucide-react";

const menuItems = [
    { title: "Zadania", description: "Zarządzaj swoimi obowiązkami", icon: ClipboardList, tone: "lux-gradient", href: "/tasks" },
    { title: "Wydarzenia", description: "Przeglądaj i zapisuj się na wydarzenia", icon: Calendar, tone: "lux-gradient", href: "/events" },
    { title: "Ogłoszenia", description: "Tablica ogłoszeń zespołu", icon: Megaphone, tone: "lux-gradient", href: "/announcements" },
    { title: "Spotkania", description: "Kalendarz i plan spotkań", icon: Users, tone: "lux-gradient", href: "/meetings" },

    { title: "Zespół", description: "Członkowie Twojego zespołu", icon: Users, tone: "lux-gradient", href: "/admin-teams", coordOnly: true, excludeAdmin: true },
    { title: "Sprawozdania", description: "Uzupełnij raport ze spotkania", icon: MessageSquareText, tone: "lux-gradient", href: "/reports", coordOnly: true },
    { title: "Do sprawdzenia", description: "Weryfikuj zgłoszenia uczestników", icon: CheckCircle2, tone: "lux-gradient", href: "/submissions", coordOnly: true },

    { title: "Zespoły", description: "Zarządzaj wszystkimi zespołami", icon: Crown, tone: "lux-gradient", href: "/admin-teams", adminOnly: true, special: true },
    { title: "Użytkownicy", description: "Zarządzaj użytkownikami systemu", icon: UserCog, tone: "lux-gradient", href: "/admin-users", adminOnly: true, special: true },
    { title: "Ustawienia", description: "Konfiguracja alertów i powiadomień", icon: Settings, tone: "lux-gradient", href: "/admin-settings", adminOnly: true, special: true },
];

import { getUserTeams, removeUserFromTeam } from "@/lib/actions/teams";
import { checkMissingReports } from "@/lib/actions/reports";
import { getParticipantAlerts, ParticipantAlert } from "@/lib/actions/alerts";
import { getSystemSettings, SystemSettingsData } from "@/lib/actions/settings";
import { useRouter } from "next/navigation";

interface DashboardClientProps {
    userTeams: any[];
}

export default function DashboardClient({ userTeams: initialTeams }: DashboardClientProps) {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [activeTeam, setActiveTeam] = useState<string | null>(null);
    const [activeRole, setActiveRole] = useState<string>("");
    const [teams, setTeams] = useState<any[]>(initialTeams);
    const [missingReportsCount, setMissingReportsCount] = useState(0);
    const [participantAlerts, setParticipantAlerts] = useState<ParticipantAlert[]>([]);
    const [systemSettings, setSystemSettings] = useState<SystemSettingsData | null>(null);

    const refreshSession = () => {
        const storedUser = localStorage.getItem("user");
        const storedTeam = localStorage.getItem("activeTeam");
        const storedRole = localStorage.getItem("activeRole");

        if (storedUser) setUser(JSON.parse(storedUser));
        if (storedTeam) setActiveTeam(storedTeam);
        if (storedRole) setActiveRole(storedRole.toUpperCase());
    };

    useEffect(() => {
        refreshSession();
        window.addEventListener('teamChanged', refreshSession);

        // Always sync with latest server-side teams
        if (initialTeams.length > 0) {
            setTeams(initialTeams);
        } else if (localStorage.getItem("user")) {
            const parsed = JSON.parse(localStorage.getItem("user")!);
            getUserTeams(parsed.id).then(res => {
                if (res.success && res.data) setTeams(res.data);
            });
        }

        // --- CRITICAL FIX: Validate Active Team & Role ---
        const storedTeamName = localStorage.getItem("activeTeam");

        if (initialTeams.length > 0) {
            // Find the team object that corresponds to what's in storage, OR default to the first one
            let activeTeamObj = null;

            if (storedTeamName) {
                activeTeamObj = initialTeams.find((ut: any) => ut.team.nazwa === storedTeamName);
            }

            // If stored team invalid or not found, fall back to first team
            if (!activeTeamObj) {
                activeTeamObj = initialTeams[0];
            }

            // FORCE update everything to match the AUTHORITATIVE data from server (initialTeams)
            // This fixes the bug where a user might be "KOORDYNATORKA" in storage but "UCZESTNICZKA" in reality
            if (activeTeamObj) {
                const realRole = activeTeamObj.rola.toUpperCase();

                setActiveTeam(activeTeamObj.team.nazwa);
                setActiveRole(realRole);

                localStorage.setItem("activeTeam", activeTeamObj.team.nazwa);
                localStorage.setItem("activeTeamId", activeTeamObj.team.id.toString());
                localStorage.setItem("activeRole", realRole);
            }
        }

        return () => window.removeEventListener('teamChanged', refreshSession);
    }, [initialTeams]); // Re-run whenever server data changes

    const isSystemAdmin = user?.role === "ADMINISTRATOR" || user?.role === "admin";
    const isTeamCoord = activeRole === "KOORDYNATORKA" || isSystemAdmin;

    useEffect(() => {
        const checkReports = async () => {
            // Fetch system settings first
            const settingsRes = await getSystemSettings();
            if (settingsRes.success && settingsRes.data) {
                setSystemSettings(settingsRes.data);
            }

            if (isTeamCoord) {
                const storedTeamId = localStorage.getItem("activeTeamId");
                if (storedTeamId) {
                    const res = await checkMissingReports(Number(storedTeamId));
                    if (res.success) {
                        setMissingReportsCount(res.count || 0);
                    }
                }
            }
        };

        checkReports();
    }, [isTeamCoord, activeTeam]); // Re-check when team/role changes

    // Fetch participant alerts (for non-coord/admin users)
    useEffect(() => {
        const fetchParticipantAlerts = async () => {
            // Only fetch if NOT coord/admin
            if (isTeamCoord || isSystemAdmin) {
                setParticipantAlerts([]);
                return;
            }

            const storedTeamId = localStorage.getItem("activeTeamId");
            const storedUser = localStorage.getItem("user");
            if (storedTeamId && storedUser) {
                const parsedUser = JSON.parse(storedUser);
                const res = await getParticipantAlerts(Number(storedTeamId), parsedUser.id);
                if (res.success) {
                    setParticipantAlerts(res.alerts);
                }
            }
        };

        fetchParticipantAlerts();
    }, [isTeamCoord, isSystemAdmin, activeTeam]);

    const handleSwitchTeam = (teamName: string, role: string, teamId: number) => {
        const normalizedRole = role.toUpperCase();
        localStorage.setItem("activeTeam", teamName);
        localStorage.setItem("activeTeamId", teamId.toString());
        localStorage.setItem("activeRole", normalizedRole);
        setActiveTeam(teamName);
        setActiveRole(normalizedRole);
        // Dispatch event so DashboardLayout updates the header
        window.dispatchEvent(new Event('teamChanged'));
    };

    const handleLeaveTeam = async (e: React.MouseEvent, teamId: number, userId: number) => {
        e.stopPropagation(); // Stop card click
        if (!confirm("Czy na pewno chcesz opuścić ten zespół?")) return;

        await removeUserFromTeam(userId, teamId);

        // If we left the active team, clear storage
        const currentActiveId = localStorage.getItem("activeTeamId");
        if (currentActiveId && Number(currentActiveId) === teamId) {
            if (typeof window !== "undefined") {
                localStorage.removeItem("activeTeam");
                localStorage.removeItem("activeTeamId");
                localStorage.removeItem("activeRole");
                window.dispatchEvent(new Event("teamChanged"));
            }
        }

        // Refresh checks
        window.location.reload();
    };

    const currentActive = activeTeam || (teams.length > 0 ? teams[0]?.team.nazwa : null);

    const filteredMenu = menuItems.filter(item => {
        if (item.adminOnly) return isSystemAdmin;
        if (item.excludeAdmin && isSystemAdmin) return false;
        if (item.coordOnly) return isTeamCoord;
        return true;
    });

    return (
        <DashboardLayout>
            <motion.div
                initial="hidden"
                animate="show"
                variants={staggerContainer}
                className="space-y-12 mb-20"
            >
                <motion.section variants={scaleIn} className="relative overflow-hidden lux-card-strong p-14 group">
                    <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
                    <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto">
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-gray-900 to-gray-600 pb-2">
                            Panel zarządzania
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-2xl font-medium leading-relaxed">
                            Twoje spokojne centrum organizacji. Planuj wydarzenia, wspieraj zespół i twórz przestrzeń do współpracy z lekkością.
                        </p>
                    </div>
                </motion.section>

                {isTeamCoord && missingReportsCount > 0 && systemSettings?.alertsRaporty !== false && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-xl flex items-start justify-between shadow-sm"
                    >
                        <div className="flex gap-4">
                            <div className="bg-red-100 p-2 rounded-full text-red-600">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-red-800">Wymagane zaległe sprawozdania!</h3>
                                <p className="text-red-700 font-medium">Masz {missingReportsCount} spotkań, które wymagają uzupełnienia raportu (termin minął {">"}24h temu).</p>
                            </div>
                        </div>
                        <Link href="/reports" className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-lg">
                            Uzupełnij teraz
                        </Link>
                    </motion.div>
                )}

                {/* Participant Alerts (Overdue and Rejected) */}
                {participantAlerts.filter(alert => {
                    if (alert.type === 'overdue' && systemSettings?.alertsTerminy === false) return false;
                    if (alert.type === 'rejected' && systemSettings?.alertsPoprawki === false) return false;
                    return true;
                }).length > 0 && (
                        <div className="space-y-4">
                            {participantAlerts.filter(alert => {
                                if (alert.type === 'overdue' && systemSettings?.alertsTerminy === false) return false;
                                if (alert.type === 'rejected' && systemSettings?.alertsPoprawki === false) return false;
                                return true;
                            }).map((alert) => (
                                <motion.div
                                    key={alert.id}
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={cn(
                                        "border-l-4 p-6 rounded-r-xl flex items-start justify-between shadow-sm",
                                        alert.type === 'overdue' ? "bg-red-50 border-red-500" : "bg-orange-50 border-orange-500"
                                    )}
                                >
                                    <div className="flex gap-4">
                                        <div className={cn(
                                            "p-2 rounded-full",
                                            alert.type === 'overdue' ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"
                                        )}>
                                            <AlertTriangle size={24} />
                                        </div>
                                        <div>
                                            <h3 className={cn(
                                                "text-lg font-bold",
                                                alert.type === 'overdue' ? "text-red-800" : "text-orange-800"
                                            )}>
                                                {alert.type === 'overdue' ? '⚠️ MINĄŁ TERMIN' : '🛑 DO POPRAWY'}: {alert.taskTitle}
                                            </h3>
                                            <p className={cn(
                                                "font-medium",
                                                alert.type === 'overdue' ? "text-red-700" : "text-orange-700"
                                            )}>
                                                {alert.message}
                                            </p>
                                            {alert.type === 'rejected' && (
                                                <p className="text-sm text-orange-600 mt-1">
                                                    Powód: "{alert.rejectionNote}" | Termin poprawki: {alert.correctionDeadline}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <Link href="/tasks" className={cn(
                                        "px-6 py-2 text-white font-bold rounded-lg transition-colors shadow-lg",
                                        alert.type === 'overdue' ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700"
                                    )}>
                                        Przejdź do zadań
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    )}

                {!isSystemAdmin && teams.length > 0 && (
                    <motion.section variants={slideUp}>
                        <div className="flex flex-col items-start mb-10">
                            <h2 className="lux-kicker mb-2">Twoje zespoły</h2>
                            <div className="h-1 w-12 bg-primary/20 rounded-full" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {teams.map((ut: any) => (
                                <motion.div
                                    key={ut.id}
                                    variants={popIn}
                                    initial="initial"
                                    onClick={() => handleSwitchTeam(ut.team.nazwa, ut.rola, ut.team.id)}
                                    className={cn(
                                        "lux-card overflow-hidden cursor-pointer relative transition-all duration-200",
                                        ut.team.nazwa === currentActive ? "ring-4 ring-primary shadow-2xl scale-[1.01]" : "border-white/60 hover:border-primary/40 shadow-sm"
                                    )}
                                >
                                    <div className="h-full">
                                        <div className={cn(
                                            "p-8 text-center relative",
                                            ut.team.nazwa === currentActive ? "lux-gradient text-white" : "bg-white text-foreground"
                                        )}>
                                            {ut.team.nazwa === currentActive && (
                                                <div className="absolute top-4 right-4 bg-white/20 p-1.5 rounded-full">
                                                    <Sparkles size={14} className="text-white animate-pulse" />
                                                </div>
                                            )}
                                            <div className={cn("text-4xl mb-3 font-light opacity-80", ut.team.nazwa === currentActive ? "text-white" : "text-primary")}>
                                                {ut.rola === "koordynatorka" ? "✦" : "•"}
                                            </div>
                                            <h3 className={cn("font-bold text-xl leading-tight", ut.team.nazwa === currentActive ? "text-white" : "text-foreground")}>
                                                {ut.team.nazwa}
                                            </h3>
                                            <p className={cn("text-xs font-bold mt-2 uppercase tracking-widest", ut.team.nazwa === currentActive ? "text-blue-100/80" : "text-muted-foreground")}>
                                                {ut.rola}
                                            </p>
                                        </div>
                                        <div className="p-6 space-y-3 bg-white">
                                            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                                                <span className="text-sm text-muted-foreground">Zadania do zrobienia</span>
                                                <span className="lux-chip">
                                                    {ut.team._count?.tasks || 0}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Spotkania</span>
                                                <span className="lux-chip">
                                                    {ut.team._count?.meetings || 0}
                                                </span>
                                            </div>

                                            {/* Dashboard Leave Team Button */}
                                            <div className="pt-4 mt-2 border-t border-gray-50">
                                                <button
                                                    onClick={(e) => handleLeaveTeam(e, ut.team.id, ut.userId)}
                                                    className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-500 hover:text-white transition-all group/trash z-20 relative shadow-sm hover:shadow-md"
                                                    title="Opuść zespół"
                                                >
                                                    <Trash2 size={16} className="group-hover/trash:scale-110 transition-transform" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Opuść zespół</span>
                                                </button>
                                            </div>

                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.section>
                )}

                <motion.section variants={slideUp}>
                    <div className="flex flex-col items-start mb-10">
                        <h2 className="lux-kicker mb-2">Szybki dostęp</h2>
                        <div className="h-1 w-12 bg-primary/20 rounded-full" />
                    </div>
                    <motion.div
                        variants={staggerContainer}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
                    >
                        {filteredMenu.map((item) => (
                            <motion.div
                                key={item.title}
                                variants={popIn}
                                whileHover={{ y: -5 }}
                                initial="initial"
                            >
                                <Link
                                    href={item.href || '#'}
                                    className={cn(
                                        "flex flex-col items-center text-center p-10 rounded-[32px] border border-white/60 relative overflow-hidden h-full group transition-all bg-white shadow-sm hover:shadow-md",
                                        item.special && "ring-1 ring-primary/10 bg-white shadow-float"
                                    )}
                                >
                                    <div className="flex flex-col items-center w-full h-full">
                                        <div className={cn(
                                            "w-24 h-24 mb-6 rounded-3xl flex items-center justify-center shadow-inner relative overflow-hidden",
                                            item.tone
                                        )}>
                                            <item.icon className="text-white relative z-10" size={40} />
                                        </div>
                                        <h3 className="text-xl font-bold mb-3 text-foreground transition-colors group-hover:text-primary">{item.title}</h3>
                                        <p className="text-sm text-muted-foreground font-medium leading-relaxed">{item.description}</p>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.section>
            </motion.div>
        </DashboardLayout>
    );
}
