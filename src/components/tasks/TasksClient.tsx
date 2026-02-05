"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
    Plus,
    Trash2,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Search,
    ChevronDown,
    Filter,
    MessageSquare,
    Clock,
    History,
    Check,
    Users,
    Folder
} from "lucide-react";
import {
    createTask,
    deleteTask,
    submitTaskWork,
    approveTaskWork,
    rejectTaskWork,
    closeTaskGlobally
} from "@/lib/actions/tasks";
import { getTeams, getTeamById } from "@/lib/actions/teams";
import { useRouter } from "next/navigation";

interface TasksClientProps {
    initialTasks: any[];
    userId: number;
    userRole: string;
    userName: string;
    teamId: number | null;
    settings?: any;
    onRefresh: () => void;
}

export default function TasksClient({ initialTasks, userId, userRole: activeRole, userName, teamId, settings, onRefresh }: TasksClientProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("do-zrobienia");
    // New: Coordinator Mode Toggle (MANAGEMENT vs PERSONAL)
    const [coordViewMode, setCoordViewMode] = useState<"MANAGEMENT" | "PERSONAL">("MANAGEMENT");

    const [showAddForm, setShowAddForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [allTeams, setAllTeams] = useState<any[]>([]);

    const isAdmin = activeRole?.toUpperCase() === "ADMINISTRATOR";
    const isCoord = activeRole?.toUpperCase() === 'KOORDYNATORKA';
    // Logic: If settings allow, Coord can have personal tasks.
    const canCoordHaveTasks = isCoord && settings?.coordinatorTasks;
    // NOTE: If checking tasks, show participant view if in PERSONAL mode
    // If Admin: always management.
    // If Coord: Management unless in PERSONAL mode.
    // If Participant: always participant (handled by !isAdmin && !isCoord check mostly, but logic below refines it)
    const showParticipantView = !isAdmin && (!isCoord || (canCoordHaveTasks && coordViewMode === "PERSONAL"));

    // Admin Filter State
    const [adminTeamFilter, setAdminTeamFilter] = useState<number | "ALL">("ALL");

    // UI States for Modals/Forms
    const [newTask, setNewTask] = useState({ tytul: "", opis: "", termin: "", priorytet: "NORMALNY", teamId: "-1", typPrzypisania: "CALY_ZESPOL", includeCoordinators: false });
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [submissionText, setSubmissionText] = useState("");
    const [rejectionNotes, setRejectionNotes] = useState("");
    const [rejectionDeadline, setRejectionDeadline] = useState(""); // YYYY-MM-DD
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [assignedUserIds, setAssignedUserIds] = useState<number[]>([]);
    const [userSearchTerm, setUserSearchTerm] = useState("");
    const [sortConfig, setSortConfig] = useState<{ field: "PRIORYTET" | "TERMIN", direction: "ASC" | "DESC" }>({ field: "PRIORYTET", direction: "DESC" });
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

    // --- TASK FILTERING LOGIC ---

    // 1. PARTICIPANT LOGIC
    const getParticipantTasks = () => {
        const tasks = initialTasks;

        const doZrobienia = tasks.filter(t => {
            const ex = t.executions.find((e: any) => e.userId === Number(userId));
            return ex && (ex.status === "AKTYWNE");
        });

        const wykonane = tasks.filter(t => {
            const ex = t.executions.find((e: any) => e.userId === Number(userId));
            // USER REQUEST FIX: Accepted tasks should "disappear" from user view
            return ex && (ex.status === "OCZEKUJACE");
        });

        const doPoprawy = tasks.filter(t => {
            const ex = t.executions.find((e: any) => e.userId === Number(userId));
            return ex && ex.status === "ODRZUCONE";
        });

        // Helper for Sorting
        const sortTasks = (tasksList: any[]) => {
            return [...tasksList].sort((a, b) => {
                let res = 0;
                if (sortConfig.field === "PRIORYTET") {
                    const prioValue = { "WYSOKI": 3, "NORMALNY": 2, "NISKI": 1 };
                    const pA = prioValue[a.priorytet as keyof typeof prioValue] || 0;
                    const pB = prioValue[b.priorytet as keyof typeof prioValue] || 0;
                    res = pA - pB;
                } else {
                    // Deadline
                    const tA = a.termin ? new Date(a.termin).getTime() : 0;
                    const tB = b.termin ? new Date(b.termin).getTime() : 0;
                    if (!tA && !tB) res = 0;
                    else if (!tA) res = -1;
                    else if (!tB) res = 1;
                    else res = tA - tB;
                }
                return sortConfig.direction === "ASC" ? res : -res;
            });
        };

        return {
            doZrobienia: sortTasks(doZrobienia),
            wykonane: sortTasks(wykonane),
            doPoprawy: sortTasks(doPoprawy)
        };
    };

    // 2. COORDINATOR / ADMIN UNIFIED LOGIC
    const getReferenceTasks = () => {
        let tasks = initialTasks;

        // Admin Filter
        if (isAdmin && adminTeamFilter !== "ALL") {
            tasks = tasks.filter(t => t.teamId === adminTeamFilter);
        }

        // Zlecone zadania - all accessible tasks
        // USER REQUEST FIX: Hide globally accepted tasks OR tasks where ALL executions are accepted
        const zlecone = tasks.filter(t => {
            if (t.status === "ZAAKCEPTOWANE") return false;

            // If executions exist, check if ALL are accepted (ignoring coordinators)
            if (t.executions && t.executions.length > 0) {
                const participantExecutions = t.executions.filter((e: any) => {
                    const teamRole = e.user?.zespoly?.find((ut: any) => ut.teamId === t.teamId)?.rola;
                    return teamRole?.toLowerCase() === 'uczestniczka';
                });

                // If there are participants and ALL are accepted -> hide
                if (participantExecutions.length > 0) {
                    const allAccepted = participantExecutions.every((ex: any) => ex.status === 'ZAAKCEPTOWANE');
                    if (allAccepted) return false;
                }
            }

            return true;
        });

        // Do weryfikacji - tasks with pending submissions
        const doWeryfikacji = tasks.filter(t => {
            return t.executions.some((e: any) => {
                if (e.status !== "OCZEKUJACE") return false;
                if (isAdmin) {
                    // Admin view: show all pending submissions
                    return true;
                }

                // Coordinator view: show only participant submissions
                const teamRole = t.teamId
                    ? e.user?.zespoly?.find((ut: any) => ut.teamId === t.teamId)?.rola
                    : e.user?.rola; // Fallback for global tasks if user has a global role
                const isSubmitterParticipant = teamRole?.toUpperCase() === 'UCZESTNICZKA';
                return isSubmitterParticipant;
            });
        });

        return { zlecone, doWeryfikacji };
    };

    const { doZrobienia, wykonane, doPoprawy } = getParticipantTasks();
    const { zlecone, doWeryfikacji } = getReferenceTasks();

    const handleAddTask = async () => {
        setIsSubmitting(true);
        if (!newTask.tytul) return;

        const res = await createTask({
            ...newTask,
            teamId: newTask.teamId === "-1" ? undefined : Number(newTask.teamId),
            utworzonePrzez: userName,
            assignedUserIds: newTask.typPrzypisania === "OSOBY" ? assignedUserIds : undefined,
            includeCoordinators: newTask.includeCoordinators
        });

        if (res.success) {
            setShowAddForm(false);
            setNewTask({ tytul: "", opis: "", termin: "", priorytet: "NORMALNY", teamId: "-1", typPrzypisania: "CALY_ZESPOL", includeCoordinators: false });
            onRefresh();
        } else {
            alert("Błąd: " + res.error);
        }
        setIsSubmitting(false);
    };

    // Load teams and members
    useEffect(() => {
        if (teamId !== undefined && teamId !== null) {
            setNewTask(prev => ({ ...prev, teamId: teamId.toString() }));
        }

        if (isCoord && activeTab === "do-zrobienia") {
            setActiveTab("zlecone");
        }

        if (isAdmin || isCoord) {
            getTeams().then(res => {
                if (res.success && res.data) setAllTeams(res.data);
            });
        }

        // FIX: Fetch members if we are Coord (using teamId prop) OR Admin (using selected newTask.teamId)
        const targetTeamId = isCoord ? teamId : (newTask.teamId && newTask.teamId !== "-1" ? Number(newTask.teamId) : null);

        if (targetTeamId) {
            getTeamById(targetTeamId).then(res => {
                if (res.success && res.data) {
                    const members = res.data.users
                        .filter((u: any) => {
                            if (isCoord && !isAdmin) {
                                return u.rola?.toLowerCase() === 'uczestniczka';
                            }
                            return true;
                        })
                        .map((u: any) => u.user);
                    setTeamMembers(members);
                }
            });
        } else {
            setTeamMembers([]);
        }
    }, [isAdmin, isCoord, teamId, newTask.teamId]);

    const handleSubmitWork = async (taskId: number, text: string, isCorrection = false) => {
        if (!text.trim()) return;
        setIsSubmitting(true);
        const res = await submitTaskWork(taskId, userId, userName, text, isCorrection);
        if (res.success) {
            setSelectedTask(null);
            setSubmissionText("");
            onRefresh();
        }
        setIsSubmitting(false);
    };

    const handleApproveWork = async (taskId: number, targetUserId: number) => {
        const res = await approveTaskWork(taskId, targetUserId);
        if (res.success) onRefresh();
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Czy na pewno chcesz usunąć to zadanie?")) return;
        await deleteTask(id);
        onRefresh();
    };

    // ... (rendering) ...

    const handleRejectWork = async (taskId: number, targetUserId: number) => {
        if (!rejectionNotes.trim()) return;

        const deadlineDate = rejectionDeadline ? new Date(rejectionDeadline) : null;
        const res = await rejectTaskWork(taskId, targetUserId, rejectionNotes, deadlineDate);

        if (res.success) {
            setSelectedTask(null);
            setRejectionNotes("");
            setRejectionDeadline("");
            onRefresh();
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-8 animate-slide-in">
                {/* Header */}
                <div className="flex flex-wrap justify-between items-end pb-4 border-b border-gray-100 gap-4">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-foreground">Zadania</h1>
                        <p className="text-muted-foreground font-medium mt-1">
                            {isAdmin ? "Pełna kontrola nad wszystkimi zespołami" :
                                isCoord ? "Zarządzaj zespołem i weryfikuj zgłoszenia" :
                                    "Przeglądaj i wykonuj swoje zadania"}
                        </p>
                    </div>

                    {(isAdmin || isCoord) && (
                        <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="lux-btn flex items-center gap-2"
                        >
                            <Plus size={20} /> Nowe zadanie
                        </button>
                    )}


                </div>
            </div>

            {/* Add Form (Admin / Coord) */}
            <AnimatePresence>
                {showAddForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
                        onClick={(e) => { if (e.target === e.currentTarget) setShowAddForm(false); }}
                    >
                        <div className="bg-white p-8 rounded-[32px] w-full max-w-2xl shadow-2xl relative my-8">
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                                <div className="p-2 bg-primary/10 rounded-xl text-primary"><Plus size={24} /></div>
                                Utwórz nowe zadanie
                            </h2>

                            <div className="space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Tytuł zadania</label>
                                        <input
                                            className="lux-input text-lg font-bold"
                                            placeholder="Np. Przygotowanie raportu miesięcznego"
                                            value={newTask.tytul}
                                            onChange={e => setNewTask(prev => ({ ...prev, tytul: e.target.value }))}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Zespół</label>
                                        <div className="relative">
                                            <select
                                                className={cn("lux-input appearance-none", newTask.teamId === "-1" && "bg-primary text-white border-primary")}
                                                value={newTask.teamId}
                                                onChange={e => setNewTask(prev => ({ ...prev, teamId: e.target.value }))}
                                                disabled={isCoord && !isAdmin}
                                            >
                                                {!isAdmin && teamId && <option value={teamId}>Mój zespół</option>}
                                                {isAdmin && (
                                                    <>
                                                        <option value="-1" className="font-bold bg-gray-100">📢 WSZYSTKIE ZESPOŁY</option>
                                                        {allTeams.map(t => <option key={t.id} value={t.id}>{t.nazwa}</option>)}
                                                    </>
                                                )}
                                            </select>
                                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" size={16} />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Priorytet</label>
                                        <div className="flex p-1 bg-gray-50 rounded-xl border border-gray-200">
                                            {["NISKI", "NORMALNY", "WYSOKI"].map(p => (
                                                <button
                                                    key={p}
                                                    onClick={() => setNewTask(prev => ({ ...prev, priorytet: p }))}
                                                    className={cn(
                                                        "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                                                        newTask.priorytet === p ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:bg-white/50"
                                                    )}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Termin</label>
                                            <button
                                                onClick={() => setNewTask(prev => ({ ...prev, termin: "" }))}
                                                className="text-[10px] font-bold text-primary hover:underline uppercase"
                                            >
                                                Bezterminowo
                                            </button>
                                        </div>
                                        <input
                                            type="date"
                                            className={cn("lux-input", !newTask.termin && "text-muted-foreground italic")}
                                            value={newTask.termin}
                                            onChange={e => setNewTask(prev => ({ ...prev, termin: e.target.value }))}
                                        />
                                    </div>

                                    <div className="col-span-2 space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Opis</label>
                                        <textarea
                                            className="lux-textarea h-32"
                                            placeholder="Szczegóły zadania..."
                                            value={newTask.opis}
                                            onChange={e => setNewTask(prev => ({ ...prev, opis: e.target.value }))}
                                        />
                                    </div>

                                    <div className="col-span-2 pt-4 border-t border-gray-100 space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Przypisanie</label>
                                            <div className="flex gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-2 rounded-lg hover:bg-gray-100 transition-colors flex-1">
                                                    <input
                                                        type="radio"
                                                        className="w-4 h-4 text-primary"
                                                        checked={newTask.typPrzypisania === "CALY_ZESPOL"}
                                                        onChange={() => setNewTask(prev => ({ ...prev, typPrzypisania: "CALY_ZESPOL", assignedUserIds: [] }))}
                                                    />
                                                    <span className="text-sm font-bold text-gray-700">Cały zespół</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-2 rounded-lg hover:bg-gray-100 transition-colors flex-1">
                                                    <input
                                                        type="radio"
                                                        className="w-4 h-4 text-primary"
                                                        checked={newTask.typPrzypisania === "OSOBY"}
                                                        onChange={() => {
                                                            if (newTask.teamId === "-1") {
                                                                alert("Wybór konkretnych osób dostępny tylko dla pojedynczego zespołu.");
                                                                return;
                                                            }
                                                            setNewTask(prev => ({ ...prev, typPrzypisania: "OSOBY" }));
                                                        }}
                                                    />
                                                    <span className="text-sm font-bold text-gray-700">Wybrane osoby</span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* COORDINATOR ASSIGNMENT CHECKBOX (Admin Only, Global Setting Check) */}
                                        {settings?.coordinatorTasks && isAdmin && newTask.typPrzypisania === "CALY_ZESPOL" && (
                                            <label className="flex items-center gap-3 cursor-pointer p-4 bg-purple-50 rounded-xl border border-purple-100 hover:bg-purple-100/50 transition-colors animate-in fade-in slide-in-from-top-2">
                                                <div className="relative flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        className="peer w-5 h-5 text-purple-600 rounded focus:ring-purple-500 border-purple-300"
                                                        checked={newTask.includeCoordinators}
                                                        onChange={(e) => setNewTask(prev => ({ ...prev, includeCoordinators: e.target.checked }))}
                                                    />
                                                </div>
                                                <div>
                                                    <span className="text-sm font-bold text-purple-900 block flex items-center gap-2">
                                                        <Users size={16} />
                                                        Przypisz również koordynatorkom
                                                    </span>
                                                    <span className="text-xs text-purple-600/80 mt-0.5 block">Jeśli zaznaczone, koordynatorki zespołu również otrzymają to zadanie do wykonania.</span>
                                                </div>
                                            </label>
                                        )}

                                        {newTask.typPrzypisania === "OSOBY" && (
                                            <div className="space-y-2 border rounded-xl p-4 bg-gray-50/50">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-xs font-bold text-muted-foreground">Wybierz osoby ({assignedUserIds.length})</span>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => setAssignedUserIds(teamMembers.map(u => u.id))} className="text-[10px] font-bold text-primary hover:underline">WSZYSCY</button>
                                                        <button onClick={() => setAssignedUserIds([])} className="text-[10px] font-bold text-gray-400 hover:text-gray-600">RESET</button>
                                                    </div>
                                                </div>

                                                <input
                                                    type="text"
                                                    placeholder="Szukaj osoby..."
                                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary bg-white mb-2"
                                                    value={userSearchTerm}
                                                    onChange={(e) => setUserSearchTerm(e.target.value)}
                                                />

                                                <div className="max-h-40 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                                                    {teamMembers
                                                        .filter(u => (u.imieNazwisko || u.name || "").toLowerCase().includes(userSearchTerm.toLowerCase()))
                                                        .map(member => (
                                                            <label key={member.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-100 hover:shadow-sm">
                                                                <input
                                                                    type="checkbox"
                                                                    className="rounded border-gray-300 text-primary"
                                                                    checked={assignedUserIds.includes(member.id)}
                                                                    onChange={e => {
                                                                        if (e.target.checked) {
                                                                            setAssignedUserIds(prev => [...prev, member.id]);
                                                                        } else {
                                                                            setAssignedUserIds(prev => prev.filter(id => id !== member.id));
                                                                        }
                                                                    }}
                                                                />
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 border border-gray-200 shadow-sm">
                                                                        {member.imieNazwisko?.[0]}
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-sm font-semibold text-gray-700 block leading-tight">{member.imieNazwisko}</span>
                                                                        <span className="text-[9px] uppercase text-muted-foreground font-bold tracking-wider">{member.rola}</span>
                                                                    </div>
                                                                </div>
                                                            </label>
                                                        ))}
                                                    {teamMembers.length === 0 && <p className="text-xs text-center text-muted-foreground italic py-4">Wybierz zespół aby zobaczyć osoby</p>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
                                    <button onClick={() => setShowAddForm(false)} className="px-6 py-3 font-bold text-gray-400 hover:text-gray-600 transition-colors">Anuluj</button>
                                    <button className="lux-btn shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all" onClick={handleAddTask} disabled={isSubmitting}>
                                        {newTask.teamId === "-1" ? "Opublikuj wszędzie" : "Zapisz zadanie"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* CONTENT BY ROLE */}

            {/* --- UNIFIED ADMIN/COORDINATOR VIEW --- */}
            {(isAdmin || isCoord) && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* LEFT COLUMN: NAVIGATION (ADMIN TEAMS / COORD MODES) */}
                    {(isAdmin || (isCoord && settings?.coordinatorTasks)) && (
                        <div className="lg:col-span-1 space-y-4">
                            <h2 className="text-xl font-bold text-foreground/80 mb-4 flex items-center gap-2 px-2">
                                <Folder size={20} className="text-primary" />
                                {isAdmin ? "Zespoły" : "Moje widoki"}
                            </h2>

                            {isAdmin ? (
                                <>
                                    {/* All Teams Option */}
                                    <button
                                        onClick={() => setAdminTeamFilter("ALL")}
                                        className={cn(
                                            "w-full text-left p-6 rounded-[28px] transition-all flex items-center justify-between border-2",
                                            adminTeamFilter === "ALL" ? "bg-white shadow-xl border-primary/20" : "bg-white border-transparent hover:border-gray-100 shadow-sm"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg", adminTeamFilter === "ALL" ? "lux-gradient" : "bg-gray-100 text-gray-400")}>
                                                <Users size={22} />
                                            </div>
                                            <div>
                                                <span className="font-bold text-gray-800 block">Wszystkie zespoły</span>
                                                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">
                                                    {initialTasks.length} zadań łącznie
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                    {allTeams.map((team: any) => {
                                        const teamTaskCount = initialTasks.filter(t => t.teamId === team.id).length;
                                        return (
                                            <button
                                                key={team.id}
                                                onClick={() => setAdminTeamFilter(team.id)}
                                                className={cn(
                                                    "w-full text-left p-6 rounded-[28px] transition-all flex items-center justify-between border-2",
                                                    adminTeamFilter === team.id ? "bg-white shadow-xl border-primary/20" : "bg-white border-transparent hover:border-gray-100 shadow-sm"
                                                )}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div
                                                        className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all duration-300", adminTeamFilter === team.id ? "scale-105" : "bg-gray-100 text-gray-400")}
                                                        style={adminTeamFilter === team.id ? { backgroundColor: team.kolor || '#5400FF', background: `linear-gradient(135deg, ${team.kolor || '#5400FF'} 0%, ${team.kolor ? team.kolor + 'dd' : '#704df5'} 100%)` } : {}}
                                                    >
                                                        <Folder size={22} style={adminTeamFilter !== team.id ? { color: team.kolor || '#9ca3af' } : {}} />
                                                    </div>
                                                    <div>
                                                        <span className="font-bold text-gray-800 block">{team.nazwa}</span>
                                                        <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">
                                                            {teamTaskCount} zadań
                                                        </span>
                                                    </div>
                                                </div>
                                                {teamTaskCount > 0 && (
                                                    <div className="w-8 h-8 flex items-center justify-center rounded-full font-bold text-xs transition-colors"
                                                        style={{
                                                            backgroundColor: adminTeamFilter === team.id ? 'rgba(255,255,255,0.2)' : (team.kolor ? team.kolor + '20' : '#f3f4f6'),
                                                            color: adminTeamFilter === team.id ? 'white' : (team.kolor || '#5400FF')
                                                        }}
                                                    >
                                                        {teamTaskCount}
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                    {/* New Admin Folder for Coordinator Tasks */}
                                    {settings?.coordinatorTasks && (
                                        <button
                                            onClick={() => setAdminTeamFilter(-1)} // Use -1 to denote "Coordinator Tasks" folder
                                            className={cn(
                                                "w-full text-left p-6 rounded-[28px] transition-all flex items-center justify-between border-2",
                                                adminTeamFilter === -1 ? "bg-white shadow-xl border-primary/20" : "bg-white border-transparent hover:border-gray-100 shadow-sm"
                                            )}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg", adminTeamFilter === -1 ? "lux-gradient" : "bg-gray-100 text-gray-400")}>
                                                    <Users size={22} />
                                                </div>
                                                <div>
                                                    <span className="font-bold text-gray-800 block">Zadania koordynatorek</span>
                                                    <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">
                                                        {initialTasks.filter(t => t.executions.some((e: any) => {
                                                            const userTeamRole = t.teamId
                                                                ? e.user?.zespoly?.find((ut: any) => ut.teamId === t.teamId)?.rola
                                                                : e.user?.rola;
                                                            return userTeamRole?.toUpperCase() === "KOORDYNATORKA";
                                                        })).length} zadań
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    )}
                                </>
                            ) : (
                                <>
                                    {/* Coordinator Sidebar (Management vs Personal) */}
                                    <button
                                        onClick={() => setCoordViewMode("MANAGEMENT")}
                                        className={cn(
                                            "w-full text-left p-6 rounded-[28px] transition-all border-2",
                                            coordViewMode === "MANAGEMENT" ? "bg-white shadow-xl border-primary/20" : "bg-white border-transparent hover:border-gray-100 shadow-sm"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg", coordViewMode === "MANAGEMENT" ? "lux-gradient" : "bg-gray-100 text-gray-400")}>
                                                <Users size={22} />
                                            </div>
                                            <div>
                                                <span className="font-bold text-gray-800 block">Zarządzanie</span>
                                                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">
                                                    Weryfikacja zespołu
                                                </span>
                                            </div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setCoordViewMode("PERSONAL")}
                                        className={cn(
                                            "w-full text-left p-6 rounded-[28px] transition-all border-2",
                                            coordViewMode === "PERSONAL" ? "bg-white shadow-xl border-primary/20" : "bg-white border-transparent hover:border-gray-100 shadow-sm"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg", coordViewMode === "PERSONAL" ? "lux-gradient" : "bg-gray-100 text-gray-400")}>
                                                <CheckCircle size={22} />
                                            </div>
                                            <div>
                                                <span className="font-bold text-gray-800 block">Moje zadania</span>
                                                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">
                                                    {doZrobienia.length} do zrobienia
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* RIGHT COLUMN: TASKS CONTENT */}
                    <div className={cn("space-y-6", (isAdmin || (isCoord && settings?.coordinatorTasks)) ? "lg:col-span-3" : "lg:col-span-4")}>
                        {showParticipantView ? (
                            /* --- PARTICIPANT VIEW FOR COORDINATOR --- */
                            <div className="bg-white rounded-[32px] shadow-[0_10px_30px_rgba(0,0,0,0.03)] border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-right-4">
                                <div className="flex bg-gray-50/50 p-6 border-b border-gray-100">
                                    <div className="flex flex-col items-start">
                                        <h2 className="lux-kicker mb-1">Moje zadania osobiste</h2>
                                        <div className="h-1 w-8 bg-primary/20 rounded-full" />
                                    </div>
                                </div>
                                <div className="flex bg-gray-50/50 p-2 border-b border-gray-100">
                                    {[
                                        { id: "do-zrobienia", label: "Do zrobienia", count: doZrobienia.length },
                                        { id: "wykonane", label: "Wykonane", count: wykonane.length },
                                        { id: "do-poprawy", label: "Do poprawy", count: doPoprawy.length }
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={cn(
                                                "flex-1 py-4 font-bold transition-all rounded-2xl flex items-center justify-center gap-3 relative",
                                                activeTab === tab.id ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:bg-white/50"
                                            )}
                                        >
                                            {tab.label}
                                            <span className={cn("px-2.5 py-0.5 rounded-full text-[10px]", activeTab === tab.id ? "bg-primary text-white" : "bg-gray-200 text-gray-600")}>{tab.count}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="p-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                                        {(activeTab === "do-zrobienia" ? doZrobienia : activeTab === "wykonane" ? wykonane : doPoprawy).map((t: any) => (
                                            <ParticipantTaskCard
                                                key={t.id}
                                                task={t}
                                                userId={userId}
                                                onClick={() => { setSelectedTask(t); setSubmissionText(""); }}
                                                status={activeTab}
                                            />
                                        ))}
                                        {(activeTab === "do-zrobienia" ? doZrobienia : activeTab === "wykonane" ? wykonane : doPoprawy).length === 0 && (
                                            <div className="col-span-full py-12 text-center text-muted-foreground font-medium italic opacity-50">Brak zadań w tej sekcji</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* --- MANAGEMENT VIEW --- */
                            <>
                                <div className="flex flex-col items-start mb-6">
                                    <h2 className="lux-kicker mb-2">
                                        {isAdmin ? (adminTeamFilter === "ALL" ? "Wszystkie zlecone zadania" : "Zadania wybranego zespołu") : "Zlecone zadania zespołu"}
                                    </h2>
                                    <div className="h-1 w-12 bg-primary/20 rounded-full" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                                    {zlecone.map((t: any) => (
                                        <AdminTaskCard
                                            key={t.id}
                                            task={t}
                                            onDelete={handleDelete}
                                            onApprove={handleApproveWork}
                                            onReject={setSelectedTask}
                                            isCoord={true}
                                            isAdmin={isAdmin}
                                        />
                                    ))}
                                    {zlecone.length === 0 && (
                                        <div className="col-span-full lux-card p-12 text-center text-muted-foreground font-medium italic border-dashed">
                                            {isAdmin && adminTeamFilter !== "ALL" ? "Brak zadań w tym zespole" : "Brak zleconych zadań"}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* --- 3. STANDARD PARTICIPANT VIEW (NON-COORD) --- */}
            {!isAdmin && !isCoord && (
                <div className="bg-white rounded-[32px] shadow-[0_10px_30px_rgba(0,0,0,0.03)] border border-gray-100 overflow-hidden">
                    <div className="flex bg-gray-50/50 p-2 border-b border-gray-100">
                        {[
                            { id: "do-zrobienia", label: "Do zrobienia", count: doZrobienia.length },
                            { id: "wykonane", label: "Wykonane", count: wykonane.length },
                            { id: "do-poprawy", label: "Do poprawy", count: doPoprawy.length }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex-1 py-4 font-bold transition-all rounded-2xl flex items-center justify-center gap-3 relative",
                                    activeTab === tab.id ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:bg-white/50"
                                )}
                            >
                                {tab.label}
                                <span className={cn("px-2.5 py-0.5 rounded-full text-[10px]", activeTab === tab.id ? "bg-primary text-white" : "bg-gray-200 text-gray-600")}>{tab.count}</span>

                                {/* Sort Icon for Active Tab */}
                                {activeTab === tab.id && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setIsSortMenuOpen(!isSortMenuOpen); }}
                                            className="p-1.5 hover:bg-gray-100 rounded-lg text-primary transition-colors"
                                        >
                                            <Filter size={14} />
                                        </button>

                                        {isSortMenuOpen && (
                                            <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-[50] p-2 flex flex-col gap-1 text-left animate-slide-in">
                                                <span className="text-[9px] font-black uppercase text-muted-foreground px-2 py-1">Priorytet</span>
                                                <button onClick={(e) => { e.stopPropagation(); setSortConfig({ field: "PRIORYTET", direction: "DESC" }); setIsSortMenuOpen(false); }} className={cn("px-2 py-1.5 text-xs font-bold rounded-lg text-left hover:bg-primary/5 hover:text-primary", sortConfig.field === "PRIORYTET" && sortConfig.direction === "DESC" && "bg-primary/10 text-primary")}>
                                                    Najwyższy (Malejąco)
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); setSortConfig({ field: "PRIORYTET", direction: "ASC" }); setIsSortMenuOpen(false); }} className={cn("px-2 py-1.5 text-xs font-bold rounded-lg text-left hover:bg-primary/5 hover:text-primary", sortConfig.field === "PRIORYTET" && sortConfig.direction === "ASC" && "bg-primary/10 text-primary")}>
                                                    Najniższy (Rosnąco)
                                                </button>

                                                <div className="h-px bg-gray-100 my-1" />

                                                <span className="text-[9px] font-black uppercase text-muted-foreground px-2 py-1">Termin</span>
                                                <button onClick={(e) => { e.stopPropagation(); setSortConfig({ field: "TERMIN", direction: "ASC" }); setIsSortMenuOpen(false); }} className={cn("px-2 py-1.5 text-xs font-bold rounded-lg text-left hover:bg-primary/5 hover:text-primary", sortConfig.field === "TERMIN" && sortConfig.direction === "ASC" && "bg-primary/10 text-primary")}>
                                                    Najbliższy (Rosnąco)
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); setSortConfig({ field: "TERMIN", direction: "DESC" }); setIsSortMenuOpen(false); }} className={cn("px-2 py-1.5 text-xs font-bold rounded-lg text-left hover:bg-primary/5 hover:text-primary", sortConfig.field === "TERMIN" && sortConfig.direction === "DESC" && "bg-primary/10 text-primary")}>
                                                    Najdalszy (Malejąco)
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {(activeTab === "do-zrobienia" ? doZrobienia : activeTab === "wykonane" ? wykonane : doPoprawy).map((t: any) => (
                                <ParticipantTaskCard
                                    key={t.id}
                                    task={t}
                                    userId={userId}
                                    onClick={() => { setSelectedTask(t); setSubmissionText(""); }}
                                    status={activeTab}
                                />
                            ))}
                            {(activeTab === "do-zrobienia" ? doZrobienia : activeTab === "wykonane" ? wykonane : doPoprawy).length === 0 && (
                                <div className="col-span-full py-12 text-center text-muted-foreground font-medium italic opacity-50">Brak zadań w tej sekcji</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODALS */}

            {/* Submission Modal for Participant / Coordinator in Personal Mode */}
            <AnimatePresence>
                {selectedTask && (showParticipantView || (!isAdmin && !isCoord)) && activeTab !== "wykonane" && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedTask(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="lux-card p-10 max-w-lg w-full relative z-10 shadow-2xl">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-2xl font-bold">{activeTab === "do-poprawy" ? "Wyślij poprawkę" : "Oznacz jako wykonane"}</h3>
                                    <p className="text-muted-foreground mt-1">Zadanie: <span className="font-bold text-foreground">{selectedTask.tytul}</span></p>
                                </div>
                                <div className="p-3 rounded-2xl bg-primary/5 text-primary">
                                    <MessageSquare size={24} />
                                </div>
                            </div>

                            <div className="space-y-6">
                                {activeTab === "do-poprawy" && (
                                    <div className="bg-red-50 p-4 rounded-2xl border-l-4 border-red-500">
                                        <p className="text-[10px] font-black uppercase text-red-600 mb-1">Poprzednie uwagi</p>
                                        <p className="text-sm text-red-900">{selectedTask.executions.find((e: any) => e.userId === userId)?.uwagiOdrzucenia}</p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Opis wykonania / Poprawki</label>
                                    <textarea
                                        className="lux-textarea h-40"
                                        placeholder="Opisz co zostało zrobione..."
                                        value={submissionText}
                                        onChange={e => setSubmissionText(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 mt-8">
                                <button onClick={() => setSelectedTask(null)} className="flex-1 py-4 font-bold text-muted-foreground hover:bg-gray-50 rounded-2xl transition-all">Anuluj</button>
                                <button
                                    onClick={() => handleSubmitWork(selectedTask.id, submissionText, activeTab === "do-poprawy")}
                                    className="flex-[2] lux-btn"
                                    disabled={!submissionText.trim() || isSubmitting}
                                >
                                    {isSubmitting ? "Wysyłanie..." : activeTab === "do-poprawy" ? "Wyślij poprawkę" : "Zgłoś wykonanie"}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Rejection Modal for Coord/Admin */}
            <AnimatePresence>
                {selectedTask && (isCoord || isAdmin) && rejectionNotes !== null && selectedTask.targetUserId && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setSelectedTask(null); setRejectionNotes(""); }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="lux-card p-10 max-w-lg w-full relative z-10 shadow-2xl">
                            <h3 className="text-2xl font-bold mb-2 text-red-600">Odrzuć do poprawy</h3>
                            <p className="text-muted-foreground mb-6">Uczestniczka: <span className="font-bold text-foreground">{selectedTask.targetUserName}</span></p>

                            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block">Uwagi do poprawy</label>
                            <textarea
                                className="lux-textarea h-40 mb-6 border-red-100 focus:border-red-500"
                                placeholder="Wypisz co dokładnie trzeba poprawić..."
                                value={rejectionNotes}
                                onChange={e => setRejectionNotes(e.target.value)}
                            />

                            <div className="mb-6 space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 block">Termin na poprawkę (opcjonalnie)</label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="date"
                                        className="lux-input flex-1"
                                        value={rejectionDeadline}
                                        onChange={(e) => setRejectionDeadline(e.target.value)}
                                    />
                                    {rejectionDeadline && (
                                        <button
                                            onClick={() => setRejectionDeadline("")}
                                            className="text-[10px] text-red-500 font-bold hover:underline"
                                        >
                                            WYCZYŚĆ
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button onClick={() => { setSelectedTask(null); setRejectionNotes(""); setRejectionDeadline(""); }} className="flex-1 py-4 font-bold text-muted-foreground rounded-2xl transition-all">Anuluj</button>
                                <button
                                    onClick={() => handleRejectWork(selectedTask.id, selectedTask.targetUserId)}
                                    className="flex-[2] bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/20"
                                    disabled={!rejectionNotes.trim()}
                                >
                                    Odrzuć i wyślij uwagi
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </DashboardLayout>
    );
}

// --- SUB-COMPONENTS ---

function ParticipantTaskCard({ task, userId, onClick, status }: any) {
    const ex = task.executions.find((e: any) => e.userId === userId);

    // LOGIC OVERRIDE: If correction deadline exists, it overrides the main deadline
    const effectiveDeadline = ex?.terminPoprawki ? new Date(ex.terminPoprawki) : (task.termin ? new Date(task.termin) : null);

    const isOverdue = effectiveDeadline && effectiveDeadline < new Date() && status === "do-zrobienia";

    // Sort submissions by date to show history if needed
    const mySubmissions = task.submissions.filter((s: any) => s.userId === userId);

    return (
        <motion.div layout className="lux-card p-7 flex flex-col h-full bg-white transition-all hover:shadow-md border-transparent hover:border-gray-100">
            <div className="flex justify-between items-start mb-5">
                <div className={cn(
                    "flex h-12 w-12 rounded-2xl items-center justify-center transition-transform shadow-sm relative overflow-hidden",
                    status === "do-zrobienia" ? "bg-primary/5 text-primary" :
                        status === "wykonane" ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600",
                    isOverdue && "ring-2 ring-red-500 shadow-md shadow-red-500/20"
                )}>
                    {status === "do-zrobienia" ? <Clock size={24} className={cn(isOverdue && "animate-pulse text-red-500")} /> : status === "wykonane" ? <History size={24} /> : <AlertTriangle size={24} />}
                </div>
                <div className="flex flex-col items-end gap-2">
                    {/* OVERDUE PRIORITY OVERRIDE */}
                    {isOverdue ? (
                        <span className="text-[8px] bg-red-600 text-white px-3 py-1 rounded-full font-black uppercase tracking-[0.1em] shadow-lg shadow-red-500/30 animate-pulse">
                            BARDZO PRIORYTETOWE
                        </span>
                    ) : (
                        task.priorytet === "WYSOKI" && <span className="text-[7px] bg-red-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-[0.2em] shadow-sm">Priorytet</span>
                    )}

                    {(ex?.poprawione || ex?.status === 'ZAAKCEPTOWANE' && ex?.poprawione) && (
                        <span className="text-[7px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-[0.2em] shadow-sm">Poprawione</span>
                    )}
                </div>
            </div>

            <h3 className="font-bold text-xl mb-2 text-gray-900">{task.tytul}</h3>
            <p className="text-sm text-muted-foreground flex-1 line-clamp-3 mb-8 leading-relaxed">{task.opis || "Brak opisu dodatkowego."}</p>

            <div className="space-y-5 pt-5 border-t border-gray-50 mt-auto">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                    <div className="flex flex-col gap-1">
                        <span className={cn("flex items-center gap-1.5", ex?.terminPoprawki ? "text-red-500 font-bold" : "text-muted-foreground")}>
                            <Clock size={12} className={ex?.terminPoprawki ? "text-red-400" : "text-gray-300"} />
                            {ex?.terminPoprawki ? `Poprawa do: ${new Date(ex.terminPoprawki).toLocaleDateString()}` : (effectiveDeadline ? effectiveDeadline.toLocaleDateString() : "Bez terminu")}
                        </span>
                        {isOverdue && <span className="text-red-500 italic font-black">Spóźnione!</span>}
                    </div>
                    <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-full">
                        <Users size={12} className="text-primary/40" />
                        <span className="text-gray-600">{task.executions.length} osób</span>
                    </div>
                </div>

                {status === "do-zrobienia" && (
                    <button onClick={onClick} className="w-full py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-200">
                        <MessageSquare size={16} /> Dodaj opis
                    </button>
                )}

                {status === "wykonane" && (
                    <div className="w-full py-4 bg-amber-50 text-amber-700 border border-amber-100/50 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-center shadow-inner">
                        W trakcie weryfikacji
                    </div>
                )}

                {status === "do-poprawy" && (
                    <div className="space-y-4">
                        <div className="bg-red-50/70 p-4 rounded-2xl border border-red-100">
                            <span className="text-[8px] font-black text-red-600 uppercase tracking-widest block mb-2 opacity-70">Uwagi odrzucenia:</span>
                            <p className="text-xs text-red-900 font-medium leading-relaxed italic">"{ex?.uwagiOdrzucenia}"</p>
                        </div>
                        <button onClick={onClick} className="w-full py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-200">
                            <History size={16} /> Wyślij poprawkę
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}




function AdminTaskCard({ task, onDelete, onApprove, onReject, isCoord, isAdmin }: any) {
    // USER REQUEST FIX: Global progress should only count Participants based on TEAM ROLE (or global role for global tasks)
    const participantExecutions = task.executions.filter((e: any) => {
        const role = task.teamId
            ? e.user?.zespoly?.find((ut: any) => ut.teamId === task.teamId)?.rola
            : e.user?.rola;
        return role?.toUpperCase() === 'UCZESTNICZKA';
    });

    const doneCount = participantExecutions.filter((e: any) => e.status === "ZAAKCEPTOWANE").length;
    const pendingCount = participantExecutions.filter((e: any) => e.status === "OCZEKUJACE").length;

    // Total count is strictly participants
    const totalCount = participantExecutions.length;

    const deadline = task.termin ? new Date(task.termin) : null;
    const isOverdue = deadline && deadline < new Date() && task.status === "AKTYWNE";

    return (
        <div className={cn(
            "lux-card-strong p-6 space-y-6 border-l-4 transition-all",
            isOverdue ? "bg-red-50/80 border-l-red-600 border border-red-200 shadow-[0_0_15px_rgba(239,68,68,0.15)]" : "border-l-primary hover:border-l-accent-purple"
        )}>
            <div className="flex justify-between items-start">
                <div className="space-y-2">
                    <h4 className={cn("font-extrabold leading-tight", isOverdue ? "text-red-900" : "text-gray-900")}>{task.tytul}</h4>
                    <div className="flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-widest">
                        <span className={cn(
                            "px-2 py-0.5 rounded-full border",
                            task.priorytet === "WYSOKI" ? "bg-red-50 text-red-600 border-red-100" :
                                task.priorytet === "NISKI" ? "bg-blue-50 text-blue-600 border-blue-100" :
                                    "bg-gray-50 text-gray-600 border-gray-100"
                        )}>
                            Priorytet: {task.priorytet}
                        </span>
                        <span className={cn("flex items-center gap-1", isOverdue ? "text-red-600 font-bold" : "text-muted-foreground")}>
                            <Clock size={10} />
                            {deadline ? deadline.toLocaleDateString() : "Bezterminowo"}
                        </span>
                    </div>
                </div>
                {(isAdmin || isCoord) && <button onClick={() => onDelete(task.id)} className="text-gray-300 hover:text-red-500 transition-all p-2 hover:bg-red-50 rounded-xl"><Trash2 size={16} /></button>}
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-end">
                    <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.2em]">Postęp globalny</p>
                        <div className="flex items-center gap-3">
                            <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${(doneCount / (totalCount || 1)) * 100}%` }} />
                            </div>
                            <span className="text-xs font-bold text-gray-700">{doneCount} / {totalCount}</span>
                        </div>
                    </div>
                    {pendingCount > 0 && (
                        <div className="flex flex-col items-end">
                            <span className="text-[8px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-black uppercase animate-bounce">{pendingCount} CZEKA</span>
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t border-gray-50/50 flex justify-between items-center">
                    {task.status === "AKTYWNE" ? (
                        isOverdue ? (
                            <span className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-2 animate-pulse">
                                <AlertTriangle size={12} /> PO TERMINIE!
                            </span>
                        ) : (
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">W trakcie realizacji</span>
                        )
                    ) : (
                        <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Zakończone</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
