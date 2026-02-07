"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import Link from "next/link";
import { cn, getContrastColor } from "@/lib/utils";
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
    Settings,
    XCircle
} from "lucide-react";

const menuItems = [
    { title: "Zadania", description: "Zarządzaj swoimi obowiązkami", icon: ClipboardList, tone: "lux-gradient", href: "/tasks" },
    { title: "Wydarzenia", description: "Przeglądaj i zapisuj się na wydarzenia", icon: Calendar, tone: "lux-gradient", href: "/events" },
    { title: "Ogłoszenia", description: "Tablica ogłoszeń zespołu", icon: Megaphone, tone: "lux-gradient", href: "/announcements" },
    { title: "Spotkania", description: "Kalendarz i plan spotkań", icon: Users, tone: "lux-gradient", href: "/meetings" },

    { title: "Zespół", description: "Członkowie Twojego zespołu", icon: Users, tone: "lux-gradient", href: "/admin-teams", coordOnly: true, excludeAdmin: true },
    { title: "Sprawozdania", description: "Uzupełnij raport ze spotkania", icon: MessageSquareText, tone: "lux-gradient", href: "/reports", coordOnly: true },

    { title: "Zespoły", description: "Zarządzaj wszystkimi zespołami", icon: Crown, tone: "lux-gradient", href: "/admin-teams", adminOnly: true, special: true },
    { title: "Użytkownicy", description: "Zarządzaj użytkownikami systemu", icon: UserCog, tone: "lux-gradient", href: "/admin-users", adminOnly: true, special: true },
    { title: "Ustawienia", description: "Konfiguracja alertów i powiadomień", icon: Settings, tone: "lux-gradient", href: "/admin-settings", coordOnly: true, special: true },
    { title: "Aplikacje", description: "Zarządzaj zgłoszeniami do zespołu", icon: Sparkles, tone: "lux-gradient", href: "/applications", coordOnly: true, requiresApplications: true },
];

import { getUserTeams, getTeamById, removeUserFromTeam, getTeams } from "@/lib/actions/teams";
import { checkMissingReports } from "@/lib/actions/reports";
import { getParticipantAlerts, ParticipantAlert } from "@/lib/actions/alerts";
import { getSystemSettings, SystemSettingsData } from "@/lib/actions/settings";
import { getNotifications, nominateCoordinator, respondToInvitation, dismissNotification, applyToTeam, respondToTeamApplication } from "@/lib/actions/notifications";
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
    const [notifications, setNotifications] = useState<any[]>([]);
    const [selectedNomination, setSelectedNomination] = useState<{ notificationId: number, teamId: number } | null>(null);
    const [nominationTeamData, setNominationTeamData] = useState<any>(null);
    const [allTeams, setAllTeams] = useState<any[]>([]);
    const [applyingToTeam, setApplyingToTeam] = useState<any>(null);
    const [motivationText, setMotivationText] = useState("");

    const refreshSession = () => {
        const storedUser = localStorage.getItem("user");
        const storedTeam = localStorage.getItem("activeTeam");
        const storedRole = localStorage.getItem("activeRole");

        if (storedUser) setUser(JSON.parse(storedUser));
        if (storedTeam) setActiveTeam(storedTeam);
        if (storedRole) setActiveRole(storedRole.toUpperCase());
    };

    const fetchNotifications = async (userId?: number) => {
        const res = await getNotifications(userId);
        if (res.success) setNotifications(res.data || []);
    };

    const fetchAllTeamsData = async () => {
        const res = await getTeams();
        if (res.success) setAllTeams(res.data || []);
    };

    useEffect(() => {
        refreshSession();
        fetchAllTeamsData();
        window.addEventListener('teamChanged', refreshSession);

        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            fetchNotifications(parsedUser.id);

            // Sync teams if needed
            if (initialTeams.length === 0) {
                getUserTeams(parsedUser.id).then(res => {
                    if (res.success && res.data) setTeams(res.data);
                });
            }
        } else {
            fetchNotifications(); // Fetch general notifications if no user
        }

        // Always sync with latest server-side teams if provided
        if (initialTeams.length > 0) {
            setTeams(initialTeams);
        }

        // --- CRITICAL FIX: Validate Active Team & Role ---
        const storedTeamName = localStorage.getItem("activeTeam");
        const currentUserData = JSON.parse(localStorage.getItem("user") || "{}");
        // Check both potential admin flags
        const isAdmin = currentUserData.rola === "ADMINISTRATOR" || currentUserData.role === "ADMINISTRATOR" || currentUserData.role === "admin";

        if (isAdmin) {
            // Force clear team/role context for Admins to ensure default theme
            localStorage.removeItem("activeTeam");
            localStorage.removeItem("activeRole");
            localStorage.removeItem("activeTeamId");
            setActiveTeam(null);
            setActiveRole("ADMINISTRATOR");
            // Force clear theme event
            document.documentElement.style.removeProperty('--primary-h');
            document.documentElement.style.removeProperty('--primary-s');
            document.documentElement.style.removeProperty('--primary-l');
            return; // Stop processing team selection for admin
        }

        if (initialTeams.length > 0) {
            // Find the team object that corresponds to what's in storage
            let activeTeamObj = null;

            if (storedTeamName) {
                activeTeamObj = initialTeams.find((ut: any) => ut.team.nazwa === storedTeamName);
            }

            // If stored team invalid or not found, fall back to "Best Role" logic
            if (!activeTeamObj) {
                // Priority: KOORDYNATORKA > UCZESTNICZKA
                const coordinatorTeam = initialTeams.find((ut: any) => ut.rola === "KOORDYNATORKA");
                activeTeamObj = coordinatorTeam || initialTeams[0];
            }

            // FORCE update everything to match the AUTHORITATIVE data from server (initialTeams)
            if (activeTeamObj) {
                const teamName = activeTeamObj.team.nazwa;
                const userRole = activeTeamObj.rola.toUpperCase();
                const teamId = activeTeamObj.team.id;

                localStorage.setItem("activeTeam", teamName);
                localStorage.setItem("activeTeamId", teamId.toString());
                localStorage.setItem("activeRole", userRole);

                setActiveTeam(teamName);
                setActiveRole(userRole);

                // Dispatch event to update ThemeController immediately
                window.dispatchEvent(new Event("teamChanged"));
            }
        }

        return () => window.removeEventListener('teamChanged', refreshSession);
    }, [initialTeams, user?.id]); // Re-run whenever server data changes

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

    const handleNominate = async (memberUserId: number) => {
        if (!selectedNomination) return;
        const res = await nominateCoordinator(selectedNomination.notificationId, memberUserId);
        if (res.success) {
            setSelectedNomination(null);
            fetchNotifications(user?.id);
        }
    };

    const handleInvitation = async (notificationId: number, accept: boolean) => {
        const res = await respondToInvitation(notificationId, accept);
        if (res.success) {
            if (accept) window.location.reload(); // Refresh to update roles/UI
            else fetchNotifications(user?.id);
        }
    };

    const handleDismiss = async (notificationId: number) => {
        const res = await dismissNotification(notificationId);
        if (res.success) {
            fetchNotifications(user?.id);
        }
    };

    const handleOpenNomination = async (notificationId: number, teamId: number) => {
        setSelectedNomination({ notificationId, teamId });
        const res = await getTeamById(teamId);
        if (res.success) {
            setNominationTeamData(res.data);
        }
    };

    const handleApply = async () => {
        if (!applyingToTeam || !user || motivationText.length < 10) return;
        const res = await applyToTeam(applyingToTeam.id, user.id, motivationText);
        if (res.success) {
            setApplyingToTeam(null);
            setMotivationText("");
            fetchNotifications(user.id);
            fetchAllTeamsData();
        } else {
            alert(res.error || "Błąd podczas aplikowania.");
        }
    };

    const handleRespondToApplication = async (notificationId: number, accept: boolean) => {
        const res = await respondToTeamApplication(notificationId, accept);
        if (res.success) {
            fetchNotifications(user?.id);
            if (accept) window.location.reload();
        }
    };

    const currentActive = activeTeam || (teams.length > 0 ? teams[0]?.team.nazwa : null);

    const filteredMenu = menuItems.filter(item => {
        if (item.adminOnly) return isSystemAdmin;
        if (item.excludeAdmin && isSystemAdmin) return false;

        // Coordinator only items
        if (item.coordOnly) {
            if (!isTeamCoord) return false;

            // Check if applications are required and enabled for active team
            if ((item as any).requiresApplications) {
                const activeTeamId = localStorage.getItem("activeTeamId");
                const currentTeam = teams.find(t => t.team.id === parseInt(activeTeamId || "0"));
                return currentTeam?.team.allowApplications === true;
            }

            return true;
        }

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
                            Zadaniowo
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-2xl font-medium leading-relaxed">
                            Twoje spokojne centrum organizacji. Planuj wydarzenia, wspieraj zespół i twórz przestrzeń do współpracy z lekkością.
                        </p>
                    </div>
                </motion.section>

                {/* Resignation & Appointment Notifications */}
                {notifications.length > 0 && (
                    <div className="space-y-4">
                        {notifications.map((notif) => {
                            const data = notif.data as any;

                            // 1. Admin: Resignation Alert (PENDING)
                            if (isSystemAdmin && notif.type === 'RESIGNATION' && notif.status === 'PENDING') {
                                return (
                                    <motion.div
                                        key={notif.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-xl flex items-center justify-between shadow-sm"
                                    >
                                        <div className="flex gap-4">
                                            <div className="bg-red-100 p-2 rounded-full text-red-600"><AlertTriangle size={24} /></div>
                                            <div>
                                                <h3 className="text-lg font-bold text-red-800">Koordynatorka opuściła zespół!</h3>
                                                <p className="text-red-700 font-medium">Użytkowniczka <strong>{data.resignedUserName}</strong> opuściła zespół <strong>{notif.team.nazwa}</strong>.</p>
                                            </div>
                                        </div>
                                        {data.multiCoord ? (
                                            <button onClick={() => handleDismiss(notif.id)} className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-lg">OK</button>
                                        ) : (
                                            <button
                                                onClick={() => handleOpenNomination(notif.id, notif.teamId)}
                                                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
                                            >
                                                Wybierz nową koordynatorkę
                                            </button>
                                        )}
                                    </motion.div>
                                );
                            }

                            // 2. Admin: Waiting for Confirmation
                            if (isSystemAdmin && notif.type === 'RESIGNATION' && notif.status === 'WAITING_FOR_CONFIRMATION') {
                                return (
                                    <motion.div
                                        key={notif.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-xl flex items-center justify-between shadow-sm"
                                    >
                                        <div className="flex gap-4">
                                            <div className="bg-blue-100 p-2 rounded-full text-blue-600"><Settings size={24} className="animate-spin-slow" /></div>
                                            <div>
                                                <h3 className="text-lg font-bold text-blue-800">Oczekiwanie na potwierdzenie</h3>
                                                <p className="text-blue-700 font-medium">Wysłano zaproszenie do <strong>{data.targetUserName}</strong> na funkcję koordynatorki zespołu <strong>{notif.team.nazwa}</strong>.</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            }

                            // 3. Admin/Coord: Nomination Confirmed
                            if (isSystemAdmin && notif.status === 'ACCEPTED' && notif.type !== 'TEAM_APPLICATION') {
                                return (
                                    <motion.div
                                        key={notif.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="lux-card border-l-[12px] border-l-green-600 bg-white p-10 shadow-2xl flex items-center justify-between gap-10"
                                    >
                                        <div className="flex items-center gap-8">
                                            <div className="bg-green-100 p-2 rounded-full text-green-600"><CheckCircle2 size={24} /></div>
                                            <div>
                                                <h3 className="text-lg font-bold text-green-800">Nowa koordynatorka przyjęta!</h3>
                                                <p className="text-green-700 font-medium">Użytkowniczka <strong>{data.targetUserName}</strong> przyjęła funkcję koordynatorki w zespole <strong>{notif.team.nazwa}</strong>.</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDismiss(notif.id)} className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors shadow-lg">OK</button>
                                    </motion.div>
                                );
                            }

                            // 4. User: Application Result
                            if (notif.type === 'APPLICATION_RESULT' && (notif.userId == user?.id || !user?.id)) {
                                return (
                                    <motion.div
                                        key={notif.id}
                                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        className={cn(
                                            "lux-card border-l-[12px] bg-white p-10 shadow-2xl flex items-center justify-between gap-10",
                                            notif.status === 'ACCEPTED' ? "border-l-green-600" : "border-l-red-600"
                                        )}
                                    >
                                        <div className="flex items-center gap-8">
                                            <div className={cn("p-2 rounded-full", notif.status === 'ACCEPTED' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600")}>
                                                {notif.status === 'ACCEPTED' ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                                            </div>
                                            <div>
                                                <h3 className={cn("text-lg font-bold", notif.status === 'ACCEPTED' ? "text-green-800" : "text-red-800")}>
                                                    {notif.status === 'ACCEPTED' ? (
                                                        <span className="flex items-center gap-2">
                                                            <Sparkles className="text-yellow-500 animate-pulse" size={20} />
                                                            Gratulacje!
                                                        </span>
                                                    ) : 'Wynik rekrutacji'}
                                                </h3>
                                                <p className={cn("font-medium", notif.status === 'ACCEPTED' ? "text-green-700" : "text-red-700")}>{data.message}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDismiss(notif.id)} className={cn("px-6 py-2 text-white font-bold rounded-lg transition-colors shadow-lg", notif.status === 'ACCEPTED' ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700")}>OK</button>
                                    </motion.div>
                                );
                            }

                            // 5. User: Invitation
                            if (!isSystemAdmin && notif.status === 'WAITING_FOR_CONFIRMATION' && notif.userId === user?.id) {
                                return (
                                    <motion.div
                                        key={notif.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="bg-purple-50 border-l-4 border-purple-500 p-8 rounded-r-2xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden group"
                                    >
                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Crown size={80} /></div>
                                        <div className="flex gap-6 items-center">
                                            <div className="bg-purple-100 p-4 rounded-2xl text-purple-600 shadow-inner"><Crown size={32} /></div>
                                            <div>
                                                <h3 className="text-2xl font-black text-purple-900 uppercase tracking-tight">Zostałaś mianowana!</h3>
                                                <p className="text-purple-700 text-lg font-medium">Czy chcesz przyjąć funkcję koordynatorki w zespole <strong>{notif.team.nazwa}</strong>?</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4 w-full md:w-auto">
                                            <button
                                                onClick={() => handleInvitation(notif.id, true)}
                                                className="flex-1 md:flex-none px-10 py-4 bg-purple-600 text-white font-black rounded-xl hover:bg-purple-700 transition-all shadow-lg uppercase tracking-widest text-sm"
                                            >Tak, przyjmuję</button>
                                            <button
                                                onClick={() => handleInvitation(notif.id, false)}
                                                className="flex-1 md:flex-none px-10 py-4 bg-white text-purple-600 border-2 border-purple-100 font-bold rounded-xl hover:bg-purple-50 transition-all uppercase tracking-widest text-sm"
                                            >Nie</button>
                                        </div>
                                    </motion.div>
                                );
                            }

                            // 6. User: Pending Application Status
                            if (!isSystemAdmin && notif.type === 'TEAM_APPLICATION' && notif.status === 'PENDING' && notif.userId === user?.id) {
                                return (
                                    <motion.div
                                        key={notif.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-orange-50 border-l-4 border-orange-500 p-6 rounded-r-xl flex items-center justify-between shadow-sm"
                                    >
                                        <div className="flex gap-4">
                                            <div className="bg-orange-100 p-2 rounded-full text-orange-600"><Sparkles size={24} /></div>
                                            <div>
                                                <h3 className="text-lg font-bold text-orange-800">Zgłoszenie w toku</h3>
                                                <p className="text-orange-700 font-medium">Twoja aplikacja do zespołu <strong>{notif.team.nazwa}</strong> oczekuje na rozpatrzenie.</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDismiss(notif.id)} className="px-6 py-2 bg-orange-200 text-orange-800 font-bold rounded-lg hover:bg-orange-300 transition-colors">Wycofaj</button>
                                    </motion.div>
                                );
                            }

                            return null;
                        })}
                    </div>
                )}

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
                                            <div className={cn("text-4xl mb-3 font-light opacity-80", ut.team.nazwa === currentActive ? "text-white" : "text-primary")} style={ut.team.nazwa === currentActive ? { color: getContrastColor(ut.team.kolor || '#5400FF') } : {}}>
                                                {ut.rola === "koordynatorka" ? "✦" : "•"}
                                            </div>
                                            <h3 className={cn("font-bold text-xl leading-tight", ut.team.nazwa === currentActive ? "text-white" : "text-foreground")} style={ut.team.nazwa === currentActive ? { color: getContrastColor(ut.team.kolor || '#5400FF') } : {}}>
                                                {ut.team.nazwa}
                                            </h3>
                                            <p className={cn("text-xs font-bold mt-2 uppercase tracking-widest", ut.team.nazwa === currentActive ? "text-blue-100/80" : "text-muted-foreground")} style={ut.team.nazwa === currentActive ? { color: getContrastColor(ut.team.kolor || '#5400FF'), opacity: 0.7 } : {}}>
                                                {ut.rola}
                                            </p>
                                        </div>
                                        <div className="p-6 space-y-3 bg-white">
                                            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                                                <span className="text-sm text-muted-foreground">Zadania do zrobienia</span>
                                                <span className="lux-chip">
                                                    {ut.toDoCount || 0}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                                                <span className="text-sm text-muted-foreground">Do poprawy</span>
                                                <span className={cn(
                                                    "lux-chip",
                                                    (ut.toFixCount || 0) > 0 ? "bg-red-50 text-red-600 border-red-100" : ""
                                                )}>
                                                    {ut.toFixCount || 0}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Spotkania (w tym tyg.)</span>
                                                <span className="lux-chip">
                                                    {ut.team.meetings?.length || 0}
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

                {/* Nomination Modal for Admin */}
                {selectedNomination && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden"
                        >
                            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Wybierz nową koordynatorkę</h2>
                                    <p className="text-muted-foreground font-medium">Lista osób w zespole {nominationTeamData?.nazwa || '...'}</p>
                                </div>
                                <button onClick={() => { setSelectedNomination(null); setNominationTeamData(null); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><XCircle size={24} className="text-gray-400" /></button>
                            </div>
                            <div className="p-8 max-h-[60vh] overflow-y-auto space-y-3">
                                {nominationTeamData?.users
                                    ?.filter((ut: any) => ut.rola !== 'koordynatorka')
                                    .map((ut: any) => (
                                        <div key={ut.userId} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-primary/20 transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center font-bold text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                                    {ut.user.imieNazwisko.charAt(0)}
                                                </div>
                                                <span className="font-bold text-gray-800">{ut.user.imieNazwisko}</span>
                                            </div>
                                            <button
                                                onClick={() => handleNominate(ut.userId)}
                                                className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:scale-105 active:scale-95 transition-all shadow-md opacity-0 group-hover:opacity-100"
                                            >
                                                Mianuj
                                            </button>
                                        </div>
                                    ))}
                                {(!nominationTeamData?.users ||
                                    nominationTeamData.users.filter((ut: any) => ut.rola !== 'koordynatorka').length === 0) && (
                                        <div className="text-center py-12 text-muted-foreground font-medium">
                                            {nominationTeamData ? 'Brak dostępnych osób w zespole do mianowania.' : 'Ładowanie listy osób...'}
                                        </div>
                                    )}
                            </div>
                        </motion.div>
                    </div>
                )}
                {/* Available Teams Section */}
                {!isSystemAdmin && (
                    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-8 mt-16 pt-16 border-t border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl lux-gradient flex items-center justify-center text-white font-bold text-xl shadow-lg ring-4 ring-white">
                                <Sparkles size={24} />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Dostępne zespoły</h2>
                                <p className="text-muted-foreground font-medium">Dołącz do nowych projektów i rozwijaj swoje umiejętności</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {allTeams
                                .filter(team =>
                                    team.allowApplications &&
                                    !teams.some(ut => ut.team.id === team.id)
                                )
                                .map((team) => {
                                    const application = notifications.find(n =>
                                        n.teamId === team.id &&
                                        n.userId === user?.id &&
                                        n.type === 'TEAM_APPLICATION'
                                    );
                                    const hasApplied = application?.status === 'PENDING';
                                    const hasBeenRejected = application?.status === 'REJECTED';
                                    const isBlocked = hasApplied || hasBeenRejected;

                                    return (
                                        <motion.div
                                            key={team.id}
                                            variants={popIn}
                                            whileHover={isBlocked ? {} : { y: -5 }}
                                            onClick={() => !isBlocked && setApplyingToTeam(team)}
                                            className={cn(
                                                "lux-card-strong p-8 group relative overflow-hidden transition-all",
                                                isBlocked ? "opacity-80 grayscale-[0.0] cursor-default border-gray-100" : "cursor-pointer hover:border-primary/50"
                                            )}
                                        >
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500" />
                                            <div className="relative z-10 space-y-4">
                                                <div className="flex justify-between items-start">
                                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: team.kolor || '#5400FF' }}>
                                                        <Users size={24} />
                                                    </div>
                                                    <div className={cn(
                                                        "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm",
                                                        hasApplied ? "bg-orange-100 text-orange-600" :
                                                            hasBeenRejected ? "bg-red-100 text-red-600 border border-red-200" :
                                                                "bg-primary/10 text-primary"
                                                    )}>
                                                        {hasApplied ? 'Zgłoszenie wysłane' : hasBeenRejected ? 'Aplikacja odrzucona' : 'Kliknij aby aplikować'}
                                                    </div>
                                                </div>
                                                <h3 className="text-xl font-bold text-gray-900">{team.nazwa}</h3>
                                                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                                    {team.opis || "Brak opisu dla tego zespołu."}
                                                </p>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            {allTeams.filter(team => team.allowApplications && !teams.some(ut => ut.team.id === team.id)).length === 0 && (
                                <div className="col-span-full py-12 text-center bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200 text-muted-foreground font-medium">
                                    Aktualnie brak dostępnych zespołów do aplikowania.
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Team Application Modal */}
                {applyingToTeam && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-10 text-white relative flex-shrink-0" style={{ backgroundColor: applyingToTeam.kolor || '#5400FF' }}>
                                <button onClick={() => { setApplyingToTeam(null); setMotivationText(""); }} className="absolute top-8 right-8 p-3 bg-white/20 rounded-full hover:bg-white/30 transition-all"><XCircle size={24} /></button>
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-black uppercase tracking-tight">Dołącz do zespołu</h2>
                                    <h3 className="text-xl font-bold opacity-90">{applyingToTeam.nazwa}</h3>
                                </div>
                            </div>
                            <div className="p-10 overflow-y-auto space-y-8">
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                        <Crown size={18} className="text-primary" /> O zespole
                                    </h4>
                                    <p className="text-gray-700 leading-relaxed font-medium bg-gray-50 p-6 rounded-3xl border border-gray-100">
                                        {applyingToTeam.opis || "Ten zespół nie posiada jeszcze opisu."}
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Twoja kandydatura</h4>
                                    <p className="text-sm text-muted-foreground">Napisz dlaczego chcesz dołączyć do tego zespołu (min. 10 znaków).</p>
                                    <textarea
                                        className="w-full min-h-[150px] lux-input p-6 font-medium text-gray-900 leading-relaxed resize-none"
                                        placeholder="Np. Chcę rozwijać swoje umiejętności w..."
                                        value={motivationText}
                                        onChange={(e) => setMotivationText(e.target.value)}
                                    />
                                    <div className="flex justify-between items-center text-xs font-bold">
                                        <span className={cn(motivationText.length < 10 ? "text-red-500" : "text-green-500")}>
                                            Liczba znaków: {motivationText.length} / 10
                                        </span>
                                    </div>
                                </div>

                                <button
                                    disabled={motivationText.length < 10}
                                    onClick={handleApply}
                                    className={cn(
                                        "w-full py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]",
                                        motivationText.length < 10
                                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                            : "lux-gradient text-white shadow-primary/20"
                                    )}
                                >
                                    Aplikuj teraz
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </motion.div>
        </DashboardLayout >
    );
}
