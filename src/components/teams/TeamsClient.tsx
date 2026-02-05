"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { cn, getContrastColor } from "@/lib/utils";
import {
    Users,
    Trash2,
    Calendar as CalendarIcon,
    Plus,
    X,
    Palette,
    UserMinus,
    CheckCircle,
    ClipboardCheck,
    Clock,
    User as UserIcon,
    ChevronRight,
    XCircle,
    CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { getUsers } from "@/lib/actions/users";
import { createTeam, deleteTeam, removeUserFromTeam, addUserToTeam, updateTeam } from "@/lib/actions/teams";
import { useRouter } from "next/navigation";

interface TeamsClientProps {
    initialTeams: any[];
    isAdmin: boolean;
    isCoord: boolean;
    activeTeamId: number | null;
    onRefresh?: () => void;
    currentUserId?: number;
}

export default function TeamsClient({ initialTeams, isAdmin, isCoord, activeTeamId, onRefresh, currentUserId }: TeamsClientProps) {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        console.log("TeamsClient mounted", { isAdmin, isCoord, initialTeamsCount: initialTeams.length });
        setMounted(true);
    }, []);

    const [selectedTeam, setSelectedTeam] = useState<any>(null);
    const [newTeamName, setNewTeamName] = useState("");
    const [newTeamColor, setNewTeamColor] = useState("#5400FF");

    // Add Member State

    // Add Member State
    const [showAddMember, setShowAddMember] = useState(false);
    const [allUsers, setAllUsers] = useState<any[]>([]);

    const teams = initialTeams;

    const handleAddTeam = async () => {
        if (!newTeamName.trim()) {
            alert("Nazwa zespołu nie może być pusta.");
            return;
        }

        console.log("Adding team", { name: newTeamName, color: newTeamColor });

        try {
            const res = await createTeam(newTeamName, newTeamColor);
            if (res.success) {
                console.log("Team created successfully", res.data);
                setNewTeamName("");
                setNewTeamColor("#5400FF"); // Reset color on success
                router.refresh();
                onRefresh?.();
            } else {
                console.error("Create team failed", res.error);
                alert("Błąd podczas tworzenia zespołu: " + (res.error || "Nieznany błąd"));
            }
        } catch (err) {
            console.error("Create team exception", err);
            alert("Wystąpił nieoczekiwany błąd podczas tworzenia zespołu.");
        }
    };

    const handleDeleteTeam = async (id: number) => {
        if (!confirm("Czy na pewno chcesz usunąć ten zespół?")) return;
        const res = await deleteTeam(id);
        if (res.success) {
            if (selectedTeam?.id === id) {
                setSelectedTeam(null);
            }
            router.refresh();
            onRefresh?.();
        } else {
            alert(res.error || "Błąd podczas usuwania zespołu.");
        }
    };

    const handleRemoveMember = async (teamId: number, userId: number) => {
        if (!confirm("Czy na pewno chcesz usunąć tę osobę z zespołu?")) return;
        await removeUserFromTeam(userId, teamId);

        if (selectedTeam?.id === teamId) {
            setSelectedTeam((prev: any) => ({
                ...prev,
                users: prev.users.filter((u: any) => u.userId !== userId)
            }));
        }
        router.refresh();
        onRefresh?.();
    };

    const handleLeaveTeam = async (teamId: number) => {
        if (!confirm("Czy na pewno chcesz opuścić ten zespół? Utracisz dostęp do zadań i spotkań.")) return;
        if (!currentUserId) return;

        await removeUserFromTeam(currentUserId, teamId);

        // Clear local storage if we left the active team
        if (activeTeamId === teamId) {
            if (typeof window !== "undefined") {
                localStorage.removeItem("activeTeam");
                localStorage.removeItem("activeTeamId");
                localStorage.removeItem("activeRole");
                // Trigger event to update header immediately
                window.dispatchEvent(new Event("teamChanged"));
            }
        }

        router.push("/dashboard"); // Redirect to dashboard to reset state
        router.refresh();
        onRefresh?.();
    };


    const prepareAddMember = async () => {
        const res = await getUsers();
        if (res.success && res.data) {
            setAllUsers(res.data);
            setShowAddMember(true);
        }
    };

    const handleAddUserToTeam = async (user: any, role: string) => {
        if (!selectedTeam) return;

        const res = await addUserToTeam(user.id, selectedTeam.id, role);
        if (res.success) {
            setShowAddMember(false);
            router.refresh();
            onRefresh?.();
            setSelectedTeam(null);
        } else {
            alert(res.error || "Błąd podczas dodawania do zespołu.");
        }
    };

    const currentTeam = teams.find(t => t.id === activeTeamId) || teams[0];
    const pageTitle = isAdmin ? "Zarządzanie zespołami" : `Twój Zespół: ${currentTeam?.nazwa || ""}`;

    // Render stats calculation as a reusable component or helper
    const MemberStats = ({ ut, team }: { ut: any, team: any }) => {
        const assignedTasks = team.tasks.filter((t: any) =>
            t.typPrzypisania === "WSZYSCY" || t.assignments.some((a: any) => a.userId === ut.user.id)
        );

        const totalCount = assignedTasks.length;
        // Count confirmed/completed tasks
        const completedCount = ut.user.taskExecutions.filter((e: any) => e.status === "ZATWIERDZONE" || (e.wykonane && e.status !== "ODRZUCONE")).length;

        return (
            <div className="flex gap-4">
                <div className="flex flex-col items-center px-6 py-2 bg-blue-50 rounded-2xl border border-blue-100 min-w-[120px]">
                    <span className="text-xl font-bold text-blue-600">{completedCount} / {totalCount}</span>
                    <span className="text-9px font-bold text-blue-700/60 uppercase tracking-widest">Zrobione / Zlecone</span>
                </div>
            </div>
        );
    };

    // Helper to calc team totals
    const getTeamTaskStats = (team: any) => {
        let totalAssigned = 0;
        let totalCompleted = 0;

        team.users?.forEach((ut: any) => {
            const assignedTasks = team.tasks.filter((t: any) =>
                t.typPrzypisania === "WSZYSCY" || t.assignments.some((a: any) => a.userId === ut.user.id)
            );
            totalAssigned += assignedTasks.length;
            totalCompleted += ut.user.taskExecutions.filter((e: any) => e.status === "ZATWIERDZONE" || (e.wykonane && e.status !== "ODRZUCONE")).length;
        });

        return { totalAssigned, totalCompleted };
    };

    return (
        <DashboardLayout>
            <div className="space-y-12 animate-slide-in">
                {/* Header Column */}
                <div className="lux-card-strong p-12 text-center relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-2 h-full gradient-bg" />
                    <h1 className="text-4xl font-bold gradient-text mb-3">{pageTitle}</h1>
                    <p className="text-muted-foreground text-lg italic">Budujemy kulturę wsparcia i przejrzystości w każdym zespole.</p>
                </div>

                {!isAdmin && isCoord && currentTeam ? (
                    /* Coordinator Inline Team View */
                    <div className="space-y-8">
                        {/* ... Existing Coord View ... */}
                        <div className="flex justify-between items-center bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden">
                            <div className="flex items-center gap-6 relative z-10">
                                <div className="w-16 h-16 rounded-3xl lux-gradient flex items-center justify-center text-white shadow-xl">
                                    <Users size={32} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-foreground">{currentTeam.nazwa}</h2>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1">Lista członków i aktywność</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-8 relative z-10">
                                <div className="flex gap-4">
                                    <div className="text-center px-6 border-r border-gray-100">
                                        <span className="text-2xl font-bold text-primary block">{currentTeam.users?.length || 0}</span>
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Członków</span>
                                    </div>
                                    <div className="text-center px-6">
                                        <span className="text-2xl font-bold text-primary block">{currentTeam._count?.tasks || 0}</span>
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Zadań</span>
                                    </div>
                                </div>
                                {!isAdmin && (
                                    <button
                                        onClick={() => handleLeaveTeam(currentTeam.id)}
                                        className="group flex flex-col items-center gap-1 text-red-400 hover:text-red-600 transition-colors ml-4 px-4 border-l border-gray-100"
                                        title="Opuść ten zespół"
                                    >
                                        <Trash2 size={20} className="group-hover:scale-110 transition-transform" />
                                        <span className="text-[8px] font-black uppercase tracking-widest">Opuść</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {currentTeam.users?.map((ut: any, idx: number) => (
                                <div key={idx} className="bg-white border border-gray-100 p-6 rounded-[32px] hover:shadow-xl transition-all group/member flex items-center justify-between gap-6 shadow-sm">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 rounded-2xl lux-gradient-soft flex items-center justify-center text-white font-bold text-xl shadow-lg ring-4 ring-white">
                                            {ut.user.imieNazwisko.charAt(0)}
                                        </div>
                                        <div className="space-y-1">
                                            <span className="font-bold text-lg text-foreground block">{ut.user.imieNazwisko}</span>
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest",
                                                    ut.rola === 'koordynatorka' ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-500"
                                                )}>
                                                    {ut.rola}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8">
                                        <MemberStats ut={ut} team={currentTeam} />

                                        {(isAdmin || (isCoord && ut.rola !== 'koordynatorka')) && (
                                            <button
                                                className="w-12 h-12 flex items-center justify-center bg-gray-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm group/btn"
                                                title="Usuń z zespołu"
                                                onClick={() => handleRemoveMember(currentTeam.id, ut.userId)}
                                            >
                                                <UserMinus size={20} className="group-hover/btn:scale-110 transition-transform" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Add Team Form - Admin Only */}
                        {isAdmin && (
                            <div className="lux-card p-8">
                                <h2 className="text-xl font-bold mb-6 text-primary flex items-center gap-2">
                                    <Plus size={20} /> Dodaj nowy projekt / zespół
                                </h2>
                                <div className="flex flex-wrap gap-4 items-end">
                                    <div className="flex-1 min-w-[300px] space-y-2">
                                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Nazwa zespołu</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="np. Zespół Kreatywny"
                                                className="lux-input font-semibold flex-1"
                                                value={newTeamName}
                                                onChange={(e) => setNewTeamName(e.target.value)}
                                            />
                                            <div className="flex flex-col gap-1 items-center">
                                                <input
                                                    type="color"
                                                    value={newTeamColor}
                                                    onChange={(e) => setNewTeamColor(e.target.value)}
                                                    className="w-12 h-12 rounded-xl cursor-pointer border-2 border-gray-200 p-1"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        className="lux-btn whitespace-nowrap px-8"
                                        onClick={(e) => {
                                            console.log("Utwórz zespół click");
                                            handleAddTeam();
                                        }}
                                        style={{ backgroundColor: newTeamColor, color: getContrastColor(newTeamColor) }}
                                    >
                                        Utwórz zespół
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Teams Grid - Admin Only or Multiple Contexts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {teams.map((team) => {
                                const stats = getTeamTaskStats(team);
                                return (
                                    <motion.div
                                        key={team.id}
                                        whileHover={{ y: -8 }}
                                        className="lux-card overflow-hidden border border-white/70 hover:border-primary/50 transition-all flex flex-col group relative shadow-md"
                                    >
                                        <div className="p-8 text-white relative" style={{ backgroundColor: team.kolor || '#5400FF', background: `linear-gradient(135deg, ${team.kolor || '#5400FF'} 0%, ${team.kolor ? team.kolor + 'dd' : '#704df5'} 100%)` }}>
                                            <div className="absolute top-0 right-0 p-4 flex gap-2">
                                                <Link href={`/meetings?zespol_id=${team.id}`} className="bg-white/20 p-2 rounded-lg hover:bg-white/30 transition-all">
                                                    <CalendarIcon size={18} />
                                                </Link>
                                            </div>
                                            <h3 className="text-xl font-bold pr-16" style={{ color: getContrastColor(team.kolor || '#5400FF') }}>{team.nazwa}</h3>
                                            <p className="text-xs font-bold uppercase tracking-widest mt-2" style={{ color: getContrastColor(team.kolor || '#5400FF'), opacity: 0.7 }}>
                                                {team.users?.length || 0} członków
                                            </p>
                                        </div>

                                        <div className="p-8 flex-1 space-y-6">
                                            <button
                                                onClick={() => setSelectedTeam(team)}
                                                className="w-full lux-btn flex items-center justify-center gap-2"
                                            >
                                                <Users size={18} /> Lista osób
                                            </button>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-gray-50 rounded-2xl p-4 text-center">
                                                    <span className="block text-lg font-bold text-primary">{stats.totalCompleted} / {stats.totalAssigned}</span>
                                                    <span className="block text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Zadania (Zrob/Zlec)</span>
                                                </div>
                                                <div className="bg-gray-50 rounded-2xl p-4 text-center">
                                                    <span className="block text-2xl font-bold text-primary">{team._count?.meetings || 0}</span>
                                                    <span className="block text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Spotkania</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-6 pt-0 border-t border-gray-50 mt-auto flex justify-between items-center">
                                            {/* Leave Team Button for Non-Admins */}
                                            {!isAdmin && (
                                                <button
                                                    onClick={() => handleLeaveTeam(team.id)}
                                                    className="text-red-400 hover:text-red-500 text-[10px] font-black uppercase tracking-widest hover:underline transition-all flex items-center gap-1"
                                                >
                                                    <Trash2 size={12} /> Opuść zespół
                                                </button>
                                            )}

                                            {isAdmin && (
                                                <button
                                                    className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all ml-auto"
                                                    onClick={() => handleDeleteTeam(team.id)}
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </div>
                    </>
                )}

                {/* Member List Details Modal */}
                <AnimatePresence>
                    {mounted && selectedTeam && createPortal(
                        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl">
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                className="relative bg-white w-full max-w-[800px] rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                            >
                                <div className="p-10 text-white relative flex-shrink-0 transition-colors duration-500" style={{ backgroundColor: selectedTeam.kolor || '#5400FF' }}>
                                    <button
                                        onClick={() => setSelectedTeam(null)}
                                        className="absolute top-8 right-8 p-3 bg-white/20 rounded-full hover:bg-white/30 transition-all"
                                    >
                                        <X size={20} />
                                    </button>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <h3 className="text-3xl font-bold flex items-center gap-3" style={{ color: getContrastColor(selectedTeam.kolor || '#5400FF') }}>
                                                <Users size={32} /> {selectedTeam.nazwa}
                                            </h3>
                                            {isAdmin && (
                                                <div className="relative group">
                                                    <label htmlFor="team-color-picker" className="p-2 bg-white/20 rounded-xl hover:bg-white/30 cursor-pointer transition-all flex items-center gap-2">
                                                        <Palette size={16} /> <span className="text-[10px] font-bold uppercase">Zmień kolor</span>
                                                    </label>
                                                    <input
                                                        id="team-color-picker"
                                                        type="color"
                                                        className="absolute opacity-0 inset-0 cursor-pointer w-full h-full"
                                                        value={selectedTeam.kolor || "#5400FF"}
                                                        onChange={async (e) => {
                                                            const newColor = e.target.value;
                                                            // Optimistic update
                                                            setSelectedTeam((prev: any) => ({ ...prev, kolor: newColor }));
                                                            await updateTeam(selectedTeam.id, selectedTeam.nazwa, newColor);
                                                            router.refresh();
                                                            onRefresh?.();
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: getContrastColor(selectedTeam.kolor || '#5400FF'), opacity: 0.7 }}>Przegląd aktywności zespołu</p>
                                    </div>
                                </div>

                                <div className="p-10 overflow-y-auto custom-scrollbar space-y-6 flex-grow">

                                    {isAdmin && !showAddMember && (
                                        <button
                                            onClick={prepareAddMember}
                                            className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-bold hover:border-primary hover:text-primary hover:bg-gray-50 transition-all flex items-center justify-center gap-2 mb-6"
                                        >
                                            <Plus size={20} /> Dodaj członka zespołu
                                        </button>
                                    )}

                                    {/* Add Member Selection View */}
                                    {showAddMember ? (
                                        <div className="space-y-4 animate-slide-in">
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className="text-lg font-bold">Wybierz osobę do dodania</h4>
                                                <button onClick={() => setShowAddMember(false)} className="text-sm font-bold text-gray-400 hover:text-gray-600">Anuluj</button>
                                            </div>
                                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                                {allUsers
                                                    .filter((u: any) =>
                                                        !selectedTeam.users.some((existing: any) => existing.userId === u.id) &&
                                                        u.rola !== 'ADMINISTRATOR'
                                                    )
                                                    .map((u: any) => (
                                                        <div key={u.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-md transition-all border border-gray-100">
                                                            <div className="font-bold">{u.imieNazwisko} <span className="text-xs text-muted-foreground font-normal">({u.rola})</span></div>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleAddUserToTeam(u, "uczestniczka")}
                                                                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-100 hover:text-primary"
                                                                >
                                                                    Jako Uczest.
                                                                </button>
                                                                <button
                                                                    onClick={() => handleAddUserToTeam(u, "koordynatorka")}
                                                                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold hover:bg-purple-50 hover:text-purple-600"
                                                                >
                                                                    Jako Koord.
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                {allUsers.filter((u: any) => !selectedTeam.users.some((existing: any) => existing.userId === u.id)).length === 0 && (
                                                    <p className="text-center text-muted-foreground italic">Brak dostępnych użytkowników do dodania.</p>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        // Members List
                                        <>
                                            {selectedTeam.users?.map((ut: any, idx: number) => (
                                                <div key={idx} className="bg-[#fcfcff] border border-gray-100 p-6 rounded-[28px] hover:shadow-xl transition-all group/member">
                                                    <div className="flex items-center justify-between gap-6">
                                                        <div className="flex items-center gap-5">
                                                            <div className="w-14 h-14 rounded-2xl lux-gradient-soft flex items-center justify-center text-white font-bold text-xl shadow-lg ring-4 ring-white">
                                                                {ut.user.imieNazwisko.charAt(0)}
                                                            </div>
                                                            <div className="space-y-1">
                                                                <span className="font-bold text-lg text-foreground block">{ut.user.imieNazwisko}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className={cn(
                                                                        "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest",
                                                                        ut.rola === 'koordynatorka' ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-500"
                                                                    )}>
                                                                        {ut.rola}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex gap-4">
                                                            <MemberStats ut={ut} team={selectedTeam} />

                                                            {(isAdmin || (isCoord && ut.rola !== 'koordynatorka')) && (
                                                                <button
                                                                    className="w-12 h-12 flex items-center justify-center bg-white text-red-500 rounded-2xl shadow-sm border border-gray-100 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover/member:opacity-100"
                                                                    onClick={() => handleRemoveMember(selectedTeam.id, ut.userId)}
                                                                >
                                                                    <UserMinus size={18} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            {(!selectedTeam.users || selectedTeam.users.length === 0) && (
                                                <div className="text-center py-20 opacity-20 space-y-4">
                                                    <Users size={60} className="mx-auto" />
                                                    <p className="font-bold text-xl uppercase tracking-widest">Brak członków</p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        </div>,
                        document.body
                    )}
                </AnimatePresence>
            </div>
        </DashboardLayout>
    );
}
