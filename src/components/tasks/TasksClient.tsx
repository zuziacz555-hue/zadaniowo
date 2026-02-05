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
    onRefresh: () => void;
}

export default function TasksClient({ initialTasks, userId, userRole: activeRole, userName, teamId, onRefresh }: TasksClientProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("do-zrobienia");
    const [showAddForm, setShowAddForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [allTeams, setAllTeams] = useState<any[]>([]);

    const isAdmin = activeRole?.toUpperCase() === 'ADMINISTRATOR';
    const isCoord = activeRole?.toUpperCase() === 'KOORDYNATORKA';

    // Admin Filter State
    const [adminTeamFilter, setAdminTeamFilter] = useState<number | "ALL">("ALL");

    // UI States for Modals/Forms
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
            return !ex || (ex.status === "AKTYWNE");
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
            return t.executions.some((e: any) => e.status === "OCZEKUJACE");
        });

        return { zlecone, doWeryfikacji };
    };

    const { doZrobienia, wykonane, doPoprawy } = getParticipantTasks();
    const { zlecone, doWeryfikacji } = getReferenceTasks();

    // --- ACTIONS ---
    const [newTask, setNewTask] = useState({
        title: "",
        deadline: "",
        priority: "NORMALNY",
        description: "",
        teamId: teamId?.toString() || "",
        typPrzypisania: "CALY_ZESPOL"
    });

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
        // If Admin selects "All Teams" (-1), we can't show members easily unless we fetch ALL users. 
        // For simplicity/safety, targeting specific people is only allowed when a specific team is selected.
        const targetTeamId = isCoord ? teamId : (newTask.teamId && newTask.teamId !== "-1" ? Number(newTask.teamId) : null);

        if (targetTeamId) {
            getTeamById(targetTeamId).then(res => {
                if (res.success && res.data) {
                    setTeamMembers(res.data.users.map((u: any) => u.user));
                }
            });
        } else {
            setTeamMembers([]);
        }
    }, [isAdmin, isCoord, teamId, newTask.teamId]);


    const handleAddTask = async () => {
        if (!newTask.title.trim()) return;

        // Validation for targeted assignment
        if (newTask.typPrzypisania === "OSOBY" && assignedUserIds.length === 0) {
            alert("Wybierz przynajmniej jedną osobę.");
            return;
        }

        setIsSubmitting(true);

        // Safety check for Coordinators
        if (isCoord && !isAdmin && !teamId) {
            alert("Błąd: Nie wykryto Twojego zespołu. Proszę odświeżyć stronę.");
            setIsSubmitting(false);
            return;
        }

        try {
            // ADMIN BROADCAST CHECK
            if (isAdmin && newTask.teamId === "-1") {
                if (!confirm(`Czy na pewno chcesz dodać to zadanie do WSZYSTKICH ${allTeams.length} zespołów?`)) {
                    setIsSubmitting(false);
                    return;
                }

                const promises = allTeams.map(t => createTask({
                    tytul: newTask.title,
                    opis: newTask.description,
                    termin: newTask.deadline,
                    priorytet: newTask.priority,
                    teamId: t.id,
                    utworzonePrzez: userName,
                    utworzonePrzezId: userId,
                    typPrzypisania: "CALY_ZESPOL", // Always whole team for broadcast
                    assignedUserIds: []
                }));

                await Promise.all(promises);
                alert("Zadania zostały dodane do wszystkich zespołów!");

            } else {
                // NORMAL SINGLE TEAM CREATION
                const finalTeamId = (isCoord && !isAdmin) ? Number(teamId) : (newTask.teamId ? Number(newTask.teamId) : undefined);

                if (isCoord && !finalTeamId) {
                    alert("Nie udało się zidentyfikować zespołu. Spróbuj odświeżyć stronę.");
                    setIsSubmitting(false);
                    return;
                }

                if (isAdmin && !finalTeamId) {
                    alert("Proszę wybrać zespół lub opcję 'Wszystkie zespoły'.");
                    setIsSubmitting(false);
                    return;
                }

                const res = await createTask({
                    tytul: newTask.title,
                    opis: newTask.description,
                    termin: newTask.deadline,
                    priorytet: newTask.priority,
                    teamId: finalTeamId || undefined,
                    utworzonePrzez: userName,
                    utworzonePrzezId: userId,
                    typPrzypisania: newTask.typPrzypisania,
                    assignedUserIds: newTask.typPrzypisania === "OSOBY" ? assignedUserIds : []
                });

                if (!res.success) {
                    alert(res.error || "Wystąpił błąd podczas zapisywania zadania.");
                    setIsSubmitting(false);
                    return;
                }
            }

            setNewTask({
                title: "",
                deadline: "",
                priority: "NORMALNY",
                description: "",
                teamId: teamId?.toString() || "",
                typPrzypisania: "CALY_ZESPOL"
            });
            setAssignedUserIds([]);
            setShowAddForm(false);
            onRefresh();

        } catch (e) {
            console.error(e);
            alert("Wystąpił nieoczekiwany błąd klienta.");
        }
        setIsSubmitting(false);
    };

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
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="lux-card p-8 mb-8 border-primary/20 ring-4 ring-primary/5">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-2 space-y-4">
                                    <input className="lux-input" placeholder="Tytuł zadania" value={newTask.title} onChange={e => setNewTask(prev => ({ ...prev, title: e.target.value }))} />
                                    <textarea className="lux-textarea h-32" placeholder="Opis zadania..." value={newTask.description} onChange={e => setNewTask(prev => ({ ...prev, description: e.target.value }))} />
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Termin</label>
                                            <button
                                                onClick={() => setNewTask(prev => ({ ...prev, deadline: "" }))}
                                                className="text-[9px] font-bold text-primary hover:underline uppercase"
                                            >
                                                Bezterminowo
                                            </button>
                                        </div>
                                        <input
                                            className={cn("lux-input", !newTask.deadline && "text-muted-foreground italic")}
                                            type="date"
                                            value={newTask.deadline}
                                            onChange={e => setNewTask(prev => ({ ...prev, deadline: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Priorytet</label>
                                        <select className="lux-input" value={newTask.priority} onChange={e => setNewTask(prev => ({ ...prev, priority: e.target.value }))}>
                                            <option value="NORMALNY">Normalny</option>
                                            <option value="WYSOKI">Wysoki</option>
                                            <option value="NISKI">Niski</option>
                                        </select>
                                    </div>

                                    {isAdmin && (
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Zespół</label>
                                            <select
                                                className={cn("lux-input", newTask.teamId === "-1" && "bg-primary text-white border-primary")}
                                                value={newTask.teamId}
                                                onChange={e => setNewTask(prev => ({ ...prev, teamId: e.target.value }))}
                                            >
                                                <option value="">Wybierz zespół...</option>
                                                <option value="-1" className="font-bold bg-gray-100">📢 WSZYSTKIE ZESPOŁY (Broadcast)</option>
                                                {allTeams.map(t => (
                                                    <option key={t.id} value={t.id}>{t.nazwa}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Kto</label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setNewTask(prev => ({ ...prev, typPrzypisania: "CALY_ZESPOL" }))}
                                                className={cn(
                                                    "flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all flex items-center justify-center gap-1",
                                                    newTask.typPrzypisania === "CALY_ZESPOL" ? "bg-primary text-white border-primary shadow-sm" : "bg-white text-muted-foreground border-gray-100 hover:bg-gray-50"
                                                )}
                                            >
                                                <Users size={12} />
                                                {newTask.teamId === "-1" ? "Wszyscy wszędzie" : "Cały zespół"}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (newTask.teamId === "-1") {
                                                        alert("Wybór konkretnych osób dostępny tylko dla pojedynczego zespołu.");
                                                        return;
                                                    }
                                                    setNewTask(prev => ({ ...prev, typPrzypisania: "OSOBY" }));
                                                }}
                                                className={cn(
                                                    "flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all flex items-center justify-center gap-1",
                                                    newTask.typPrzypisania === "OSOBY" ? "bg-primary text-white border-primary shadow-sm" : "bg-white text-muted-foreground border-gray-100 hover:bg-gray-50",
                                                    newTask.teamId === "-1" && "opacity-50 cursor-not-allowed"
                                                )}
                                            >
                                                <Filter size={12} />
                                                Wybrane osoby
                                            </button>
                                        </div>
                                    </div>

                                    {newTask.typPrzypisania === "OSOBY" && (
                                        <div className="space-y-2 animate-slide-in">
                                            <div className="flex justify-between items-end">
                                                <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Wybierz osoby ({assignedUserIds.length})</label>
                                                <div className="flex gap-2 text-[9px] font-bold">
                                                    <button
                                                        onClick={() => setAssignedUserIds(teamMembers.map(u => u.id))}
                                                        className="text-primary hover:underline"
                                                    >
                                                        Wszyscy
                                                    </button>
                                                    <span className="text-gray-300">|</span>
                                                    <button
                                                        onClick={() => setAssignedUserIds([])}
                                                        className="text-muted-foreground hover:underline"
                                                    >
                                                        Żaden
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="relative">
                                                <Search className="absolute left-2 top-2 text-muted-foreground" size={14} />
                                                <input
                                                    type="text"
                                                    placeholder="Szukaj..."
                                                    className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg mb-2 focus:outline-none focus:border-primary"
                                                    value={userSearchTerm}
                                                    onChange={(e) => setUserSearchTerm(e.target.value)}
                                                />
                                            </div>

                                            <div className="bg-white border border-gray-100 rounded-xl p-3 max-h-40 overflow-y-auto space-y-2 custom-scrollbar">
                                                {teamMembers
                                                    .filter(u => (u.imieNazwisko || u.name || "").toLowerCase().includes(userSearchTerm.toLowerCase()))
                                                    .map(user => (
                                                        <label key={user.id} className="flex items-center gap-2 cursor-pointer group hover:bg-gray-50 p-1 rounded-md transition-colors">
                                                            <input
                                                                type="checkbox"
                                                                className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4"
                                                                checked={assignedUserIds.includes(user.id)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) setAssignedUserIds(prev => [...prev, user.id]);
                                                                    else setAssignedUserIds(prev => prev.filter(id => id !== user.id));
                                                                }}
                                                            />
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-semibold text-gray-700 group-hover:text-primary transition-colors">{user.imieNazwisko}</span>
                                                                <span className="text-[9px] text-muted-foreground">{user.rola}</span>
                                                            </div>
                                                        </label>
                                                    ))}
                                                {teamMembers.length === 0 && <p className="text-xs text-center text-muted-foreground italic">Wybierz zespół aby zobaczyć osoby</p>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button onClick={() => setShowAddForm(false)} className="px-6 py-3 font-bold text-muted-foreground">Anuluj</button>
                                <button className="lux-btn" onClick={handleAddTask} disabled={isSubmitting}>
                                    {newTask.teamId === "-1" ? "Opublikuj wszędzie" : "Zapisz zadanie"}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* CONTENT BY ROLE */}

            {/* --- UNIFIED ADMIN/COORDINATOR VIEW --- */}
            {(isAdmin || isCoord) && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* LEFT COLUMN: TEAMS FOLDERS (ADMIN ONLY) */}
                    {isAdmin && (
                        <div className="lg:col-span-1 space-y-4">
                            <h2 className="text-xl font-bold text-foreground/80 mb-4 flex items-center gap-2 px-2">
                                <Folder size={20} className="text-primary" /> Zespoły
                            </h2>
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
                                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg", adminTeamFilter === team.id ? "lux-gradient" : "bg-gray-100 text-gray-400")}>
                                                <Folder size={22} />
                                            </div>
                                            <div>
                                                <span className="font-bold text-gray-800 block">{team.nazwa}</span>
                                                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">
                                                    {teamTaskCount} zadań
                                                </span>
                                            </div>
                                        </div>
                                        {teamTaskCount > 0 && (
                                            <div className="w-8 h-8 flex items-center justify-center bg-primary/10 text-primary rounded-full font-bold text-xs">
                                                {teamTaskCount}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* RIGHT COLUMN: TASKS CONTENT */}
                    <div className={cn("space-y-6", isAdmin ? "lg:col-span-3" : "lg:col-span-4")}>
                        <div className="flex flex-col items-start mb-6">
                            <h2 className="lux-kicker mb-2">
                                {isAdmin ? (adminTeamFilter === "ALL" ? "Wszystkie zlecone zadania" : "Zadania wybranego zespołu") : "Zlecone zadania zespołu"}
                            </h2>
                            <div className="h-1 w-12 bg-primary/20 rounded-full" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                    </div>
                </div>
            )}

            {/* --- 3. PARTICIPANT VIEW --- */}
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

            {/* Submission Modal for Participant */}
            <AnimatePresence>
                {selectedTask && !isCoord && !isAdmin && activeTab !== "wykonane" && (
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
        </DashboardLayout >
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
    // USER REQUEST FIX: Global progress should only count Participants based on TEAM ROLE
    const participantExecutions = task.executions.filter((e: any) => {
        // Find role in this specific team
        const teamRole = e.user?.zespoly?.find((ut: any) => ut.teamId === task.teamId)?.rola;
        return teamRole?.toLowerCase() === 'uczestniczka';
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
