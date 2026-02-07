"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
    Folder,
    X,
    ChevronRight,
    Calendar,
    Edit2,
    Save,
    Link as LinkIcon,
    Paperclip,
    ExternalLink,
    Layers,
    Archive
} from "lucide-react";
import {
    createTask,
    deleteTask,
    submitTaskWork,
    approveTaskWork,
    rejectTaskWork,
    closeTaskGlobally,
    deleteTaskExecution,
    updateTask,
    addTaskAttachment,
    deleteTaskAttachment,
    uploadTaskFile
} from "@/lib/actions/tasks";
import { moveExecutionToArchive } from "@/lib/actions/archive";
import { getTeams, getTeamById } from "@/lib/actions/teams";
import { useRouter } from "next/navigation";

import ArchiveSelectFolderModal from "./archive/ArchiveSelectFolderModal";

interface TasksClientProps {
    initialTasks: any[];
    userId: number;
    userRole: string;
    userName: string;
    teamId: number | null;
    settings?: any;
    onRefresh: () => void;
}

const AdminTaskTile = ({ task, onClick }: { task: any, onClick: () => void }) => {
    const totalExecutors = task.executions?.length || 0;
    const completedCount = task.executions?.filter((e: any) => e.status === "ZAAKCEPTOWANE").length || 0;
    const teamColor = task.team?.kolor || "#f97316"; // Default orange if no team color

    const assignees = task.assignments?.length > 0 ? task.assignments.map((a: any) => a.user) : task.executions?.map((e: any) => e.user);
    const uniqueAssignees = Array.from(new Map(assignees?.map((u: any) => [u?.id, u])).values()).filter(Boolean);

    return (
        <motion.div
            layout
            whileHover={{ y: -8 }}
            onClick={onClick}
            className="glass-panel p-8 rounded-[40px] shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer relative overflow-hidden group border-white/40"
        >
            {/* Background Accent */}
            <div
                className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-[40px] opacity-10 transition-all duration-500 group-hover:scale-150"
                style={{ backgroundColor: teamColor }}
            />

            <div className="relative z-10 flex flex-col h-full gap-5">
                <div className="flex items-start justify-between">
                    <div className={cn(
                        "px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase border backdrop-blur-md",
                        task.priorytet === "WYSOKI" ? "bg-red-500/10 text-red-600 border-red-500/20" :
                            task.priorytet === "NORMALNY" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                                "bg-green-500/10 text-green-600 border-green-500/20"
                    )}>
                        {task.priorytet}
                    </div>
                    {task.termin && (
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">
                            <Calendar size={14} className="text-primary/60" />
                            <span>{new Date(task.termin).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}</span>
                        </div>
                    )}
                </div>

                <div>
                    <h3 className="text-2xl font-black tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-tight mb-2">
                        {task.tytul}
                    </h3>

                    {task.team && (
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: teamColor }} />
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">
                                {task.team.nazwa}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between pt-5 border-t border-white/40 mt-auto">
                    <div className="flex -space-x-3">
                        {uniqueAssignees.slice(0, 4).map((u: any, i: number) => (
                            <div
                                key={i}
                                className="w-9 h-9 rounded-2xl border-2 border-white bg-white/60 flex items-center justify-center text-[10px] font-black text-foreground shadow-sm backdrop-blur-sm"
                                title={u.imieNazwisko}
                            >
                                {u.imieNazwisko?.[0]}
                            </div>
                        ))}
                        {uniqueAssignees.length > 4 && (
                            <div className="w-9 h-9 rounded-2xl border-2 border-white bg-orange-50/80 flex items-center justify-center text-[10px] font-black text-orange-600 shadow-sm backdrop-blur-sm">
                                +{uniqueAssignees.length - 4}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Realizacja</span>
                        <div className="flex items-center gap-3">
                            <div className="w-20 h-2 bg-white/40 rounded-full overflow-hidden border border-white/20">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${totalExecutors > 0 ? (completedCount / totalExecutors) * 100 : 0}%` }}
                                    className="h-full bg-gradient-to-r from-emerald-400 to-green-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                />
                            </div>
                            <span className="text-[10px] font-black text-foreground">{completedCount}/{totalExecutors}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hover Icon */}
            <div className="absolute top-8 right-8 p-2 bg-white/40 rounded-xl border border-white/60 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                <ChevronRight size={18} className="text-primary" />
            </div>
        </motion.div>
    );
};

export default function TasksClient({ initialTasks, userId, userRole: activeRole, userName, teamId, settings, onRefresh }: TasksClientProps) {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // --- STATE MANAGEMENT ---

    // UI Local State
    const [activeTab, setActiveTab] = useState("do-zrobienia");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
    const [coordViewMode, setCoordViewMode] = useState<"MANAGEMENT" | "PERSONAL">("MANAGEMENT");

    // Archive State

    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
    const [executionToArchive, setExecutionToArchive] = useState<any>(null);

    // Data State
    const [allTeams, setAllTeams] = useState<any[]>([]);
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [selectedExecutionForDetail, setSelectedExecutionForDetail] = useState<any>(null);

    // Filters
    const [adminTeamFilter, setAdminTeamFilter] = useState<number | "ALL">("ALL");
    const [verificationTab, setVerificationTab] = useState<"oczekujace" | "zaakceptowane" | "doPoprawy">("oczekujace");
    const [sortConfig, setSortConfig] = useState<{ field: "PRIORYTET" | "TERMIN", direction: "ASC" | "DESC" }>({ field: "PRIORYTET", direction: "DESC" });
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

    // Forms
    const [newTask, setNewTask] = useState({ tytul: "", opis: "", termin: "", priorytet: "NORMALNY", teamId: "-1", typPrzypisania: "CALY_ZESPOL", includeCoordinators: false });
    const [submissionText, setSubmissionText] = useState("");
    const [rejectionNotes, setRejectionNotes] = useState("");
    const [rejectionDeadline, setRejectionDeadline] = useState("");
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [assignedUserIds, setAssignedUserIds] = useState<number[]>([]);
    const [userSearchTerm, setUserSearchTerm] = useState("");

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        tytul: "",
        opis: "",
        priorytet: "NORMALNY",
        termin: ""
    });
    const [attachmentInputs, setAttachmentInputs] = useState<{ nazwa: string, url: string }[]>([]);
    const [newAttachment, setNewAttachment] = useState({ nazwa: "", url: "" });
    const [newDetailAttachment, setNewDetailAttachment] = useState({ nazwa: "", url: "" });

    // --- DERIVED STATE ---
    const isAdmin = activeRole?.toUpperCase() === "ADMINISTRATOR";
    const isCoord = activeRole?.toUpperCase() === 'KOORDYNATORKA';
    const canCoordHaveTasks = isCoord && settings?.coordinatorTasks;
    const showParticipantView = !isAdmin && (!isCoord || (canCoordHaveTasks && coordViewMode === "PERSONAL"));

    // --- EFFECTS ---

    // Sync edit form when task is selected
    useEffect(() => {
        if (selectedTask) {
            setEditForm({
                tytul: selectedTask.tytul || "",
                opis: selectedTask.opis || "",
                priorytet: selectedTask.priorytet || "NORMALNY",
                termin: selectedTask.termin ? new Date(selectedTask.termin).toISOString().split('T')[0] : ""
            });
            setIsEditing(false);
        }
    }, [selectedTask]);

    const handleSaveEdit = async () => {
        if (!selectedTask) return;

        try {
            const result = await updateTask(selectedTask.id, editForm);
            if (result.success) {
                setSelectedTask((prev: any) => ({ ...prev, ...editForm }));
                setIsEditing(false);
                onRefresh();
            } else {
                alert("Błąd podczas aktualizacji zadania");
            }
        } catch (e) {
            console.error(e);
            alert("Błąd połączenia");
        }
    };

    const handleFileUpload = async (file: File) => {
        if (!selectedTask || !file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const uploadRes = await uploadTaskFile(formData);
            if (uploadRes.success && uploadRes.url) {
                const addRes = await addTaskAttachment(selectedTask.id, uploadRes.name || file.name, uploadRes.url);
                if (addRes.success && addRes.data) {
                    setSelectedTask({
                        ...selectedTask,
                        attachments: [...(selectedTask.attachments || []), addRes.data]
                    });
                    onRefresh();
                } else {
                    alert("Błąd podczas zapisywania załącznika w bazie");
                }
            } else {
                alert("Błąd podczas przesyłania pliku: " + (uploadRes.error || "Nieznany błąd"));
            }
        } catch (e) {
            console.error(e);
            alert("Błąd połączenia podczas przesyłania");
        } finally {
            setIsUploading(false);
        }
    };


    // --- TASK FILTERING LOGIC ---

    // Helper for Sorting (moved out to be shared)
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
            if (adminTeamFilter === -1) {
                // COORDINATOR TASKS FOLDER
                // Rule: Tasks executed by at least one coordinator.
                tasks = tasks.filter(t => t.executions.some((e: any) => {
                    const userTeamRole = t.teamId
                        ? e.user?.zespoly?.find((ut: any) => ut.teamId === t.teamId)?.rola
                        : e.user?.rola;
                    return userTeamRole?.toUpperCase() === "KOORDYNATORKA";
                }));
            } else if (adminTeamFilter === -2) {
                // MIXED TASKS FOLDER (Zadania Mieszane)
                // Rule: "Selected People" (OSOBY) AND includes at least one participant.
                tasks = tasks.filter(t => {
                    const isSelectedPeople = t.typPrzypisania === 'OSOBY' || (t.assignments && t.assignments.length > 0);
                    if (!isSelectedPeople) return false;

                    const hasParticipant = t.executions.some((e: any) => {
                        const userTeamRole = t.teamId
                            ? e.user?.zespoly?.find((ut: any) => ut.teamId === t.teamId)?.rola
                            : e.user?.rola;
                        return userTeamRole?.toUpperCase() === "UCZESTNICZKA";
                    });

                    return hasParticipant;
                });
            } else {
                // TEAM FOLDERS
                // Rule: Show ALL tasks that belong to this team (including OSOBY assignments)
                tasks = tasks.filter(t => t.teamId === adminTeamFilter);
            }
        }


        // COORDINATOR FILTER: Filter by active teamId
        if (isCoord && !isAdmin && teamId) {
            tasks = tasks.filter(t => t.teamId === Number(teamId));
        }

        // Zlecone zadania - all accessible tasks
        const zlecone = tasks.filter(t => {
            if (t.status === "ZAAKCEPTOWANE") return false;

            // NEW: Hide orphans (no assignments, no executions)
            if ((!t.executions || t.executions.length === 0) && (!t.assignments || t.assignments.length === 0)) {
                return false;
            }

            // If executions exist, check if ALL are accepted (ignoring coordinators)
            if (t.executions && t.executions.length > 0) {
                const participantExecutions = t.executions.filter((e: any) => {
                    const teamRole = e.user?.zespoly?.find((ut: any) => ut.teamId === t.teamId)?.rola || e.user?.rola;
                    return teamRole?.toUpperCase() === 'UCZESTNICZKA';
                });

                // If there are participants and ALL are accepted -> hide
                if (participantExecutions.length > 0) {
                    const allAccepted = participantExecutions.every((ex: any) => ex.status === 'ZAAKCEPTOWANE');
                    if (allAccepted) return false;
                }
            }

            return true;
        });



        // Helper to check if execution should be visible to this user
        const isVisibleExecution = (e: any, t: any) => {
            if (isAdmin) return true;
            // Coordinator view: show participant submissions
            const teamRole = t.teamId
                ? e.user?.zespoly?.find((ut: any) => ut.teamId === t.teamId)?.rola
                : e.user?.rola;
            return teamRole?.toUpperCase() === 'UCZESTNICZKA';
        };

        // Get all visible executions with their parent task info
        const allExecutions: any[] = [];
        tasks.forEach(t => {
            t.executions.forEach((e: any) => {
                if (isVisibleExecution(e, t)) {
                    allExecutions.push({ ...e, task: t });
                }
            });
        });

        // Split into three categories
        const weryfikacja_oczekujace = allExecutions.filter(e => e.status === "OCZEKUJACE");
        const weryfikacja_zaakceptowane = allExecutions.filter(e => e.status === "ZAAKCEPTOWANE");
        const weryfikacja_doPoprawy = allExecutions.filter(e => e.status === "ODRZUCONE");

        return {
            zlecone: sortTasks(zlecone),
            weryfikacja_oczekujace: sortTasks(weryfikacja_oczekujace),
            weryfikacja_zaakceptowane: sortTasks(weryfikacja_zaakceptowane),
            weryfikacja_doPoprawy: sortTasks(weryfikacja_doPoprawy)
        };
    };

    const { doZrobienia, wykonane, doPoprawy } = getParticipantTasks();
    const { zlecone, weryfikacja_oczekujace, weryfikacja_zaakceptowane, weryfikacja_doPoprawy } = getReferenceTasks();

    const resetAddForm = () => {
        setNewTask({ tytul: "", opis: "", termin: "", priorytet: "NORMALNY", teamId: "-1", typPrzypisania: "CALY_ZESPOL", includeCoordinators: false });
        setAssignedUserIds([]);
        setUserSearchTerm("");
        setAttachmentInputs([]);
        setNewAttachment({ nazwa: "", url: "" });
    };

    const handleAddTask = async () => {
        if (!newTask.tytul) return;
        setIsSubmitting(true);
        try {
            const res = await createTask({
                ...newTask,
                teamId: newTask.teamId === "-1" ? undefined : Number(newTask.teamId),
                utworzonePrzez: userName,
                utworzonePrzezId: userId,
                assignedUserIds: newTask.typPrzypisania === "OSOBY" ? assignedUserIds : undefined,
                includeCoordinators: newTask.includeCoordinators,
                attachments: attachmentInputs.length > 0 ? attachmentInputs : undefined
            });

            if (res.success) {
                setShowAddForm(false);
                resetAddForm();
                onRefresh();
            } else {
                alert("Błąd: " + res.error);
            }
        } catch (error) {
            console.error("Error adding task:", error);
            alert("Wystąpił nieoczekiwany błąd podczas dodawania zadania.");
        } finally {
            setIsSubmitting(false);
        }
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
                            const role = u.rola?.toUpperCase();

                            // Coordinator View: Only Participants
                            if (isCoord && !isAdmin) {
                                return role === 'UCZESTNICZKA';
                            }

                            // Admin View
                            if (isAdmin) {
                                // If Coordinator, check settings
                                if (role === 'KOORDYNATORKA') {
                                    return !!settings?.coordinatorTasks;
                                }
                                return role === 'UCZESTNICZKA';
                            }

                            return true;
                        })
                        .map((u: any) => ({ ...u.user, teamRole: u.rola })); // FIX: Pass teamRole
                    setTeamMembers(members);
                }
            });
        } else {
            setTeamMembers([]);
        }
    }, [isAdmin, isCoord, teamId, newTask.teamId, settings?.coordinatorTasks]);

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
            <div>
                <div className="space-y-10 animate-slide-in pb-10">
                    {/* Header Section */}
                    <div className="glass-panel p-10 rounded-[32px] flex flex-wrap justify-between items-center gap-8 relative overflow-hidden">
                        {/* Background Glow */}
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-[80px]" />

                        <div className="relative z-10 space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <CheckCircle size={24} />
                                </div>
                                <h1 className="text-4xl font-black tracking-tight text-foreground">Zadania</h1>
                            </div>
                            <p className="text-muted-foreground font-medium">
                                {isAdmin ? "Pełna kontrola nad wszystkimi zespołami i procesami" :
                                    isCoord ? "Zarządzaj zespołem i weryfikuj zgłoszenia uczestników" :
                                        "Przeglądaj i wykonuj przypisane Ci zadania"}
                            </p>
                        </div>

                        <div className="relative z-10 flex flex-wrap gap-4 items-center">

                            {(isAdmin || (isCoord && coordViewMode === "MANAGEMENT")) && (
                                <button
                                    onClick={() => setShowAddForm(true)}
                                    className="lux-btn flex items-center gap-2 group bg-primary hover:bg-primary/90 shadow-primary/20"
                                >
                                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform">
                                        <Plus size={14} />
                                    </div>
                                    Nowe zadanie
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Add Form (Admin / Coord) */}
                {mounted && createPortal(
                    <AnimatePresence>
                        {showAddForm && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-[20px] flex items-center justify-center p-4 overflow-y-auto"
                                onClick={(e) => { if (e.target === e.currentTarget) setShowCloseConfirmation(true); }}
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

                                            {/* ATTACHMENTS SECTION */}
                                            <div className="col-span-2 space-y-4 pt-4 border-t border-gray-100">
                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Załączniki (linki)</label>

                                                {attachmentInputs.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mb-3">
                                                        {attachmentInputs.map((att, idx) => (
                                                            <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-xl group/att">
                                                                <LinkIcon size={12} className="text-primary" />
                                                                <span className="text-xs font-bold text-gray-700">{att.nazwa}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setAttachmentInputs(prev => prev.filter((_, i) => i !== idx))}
                                                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-black uppercase text-gray-400">Nazwa linku</label>
                                                        <input
                                                            className="lux-input py-2 text-sm bg-white"
                                                            value={newAttachment.nazwa}
                                                            onChange={e => setNewAttachment(prev => ({ ...prev, nazwa: e.target.value }))}
                                                            placeholder="Np. Instrukcja PDF"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-black uppercase text-gray-400">URL</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                className="lux-input py-2 text-sm bg-white flex-1"
                                                                value={newAttachment.url}
                                                                onChange={e => setNewAttachment(prev => ({ ...prev, url: e.target.value }))}
                                                                placeholder="https://..."
                                                            />
                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    if (!newAttachment.nazwa || !newAttachment.url) return;
                                                                    setAttachmentInputs(prev => [...prev, newAttachment]);
                                                                    setNewAttachment({ nazwa: "", url: "" });
                                                                }}
                                                                className="p-2 bg-white border border-gray-200 rounded-xl text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
                                                                type="button"
                                                            >
                                                                <Plus size={18} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
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
                                                                                <span className="text-[9px] uppercase text-muted-foreground font-bold tracking-wider">{member.teamRole || member.rola}</span>
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
                                            <button onClick={() => setShowCloseConfirmation(true)} className="px-6 py-3 font-bold text-gray-400 hover:text-gray-600 transition-colors">Anuluj</button>
                                            <button
                                                className={cn(
                                                    "lux-btn shadow-lg transition-all",
                                                    (!newTask.tytul || isSubmitting) ? "opacity-50 cursor-not-allowed hover:translate-y-0" : "hover:shadow-xl hover:-translate-y-0.5"
                                                )}
                                                onClick={handleAddTask}
                                                disabled={!newTask.tytul || isSubmitting}
                                            >
                                                {isSubmitting ? "Zapisywanie..." : (newTask.teamId === "-1" ? "Opublikuj wszędzie" : "Zapisz zadanie")}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}

                {/* Close Confirmation Modal */}
                {mounted && createPortal(
                    <AnimatePresence>
                        {showCloseConfirmation && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-[20px] flex items-center justify-center p-4"

                                onClick={(e) => { if (e.target === e.currentTarget) setShowCloseConfirmation(false); }}
                            >
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.9, opacity: 0 }}
                                    className="bg-white p-8 rounded-[30px] w-full max-w-sm shadow-2xl text-center"
                                >
                                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <AlertTriangle size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">Czy chcesz zamknąć to zadanie?</h3>
                                    <p className="text-sm text-muted-foreground mb-8">
                                        Twoje niezapisane zmiany zostaną utracone, a formularz zostanie wyczyszczony.
                                    </p>
                                    <div className="space-y-3">
                                        <button
                                            onClick={() => {
                                                resetAddForm();
                                                setShowAddForm(false);
                                                setShowCloseConfirmation(false);
                                            }}
                                            className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-200"
                                        >
                                            Tak, zamknij
                                        </button>
                                        <button
                                            onClick={() => setShowCloseConfirmation(false)}
                                            className="w-full py-4 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold rounded-2xl transition-all"
                                        >
                                            Nie, kontynuuj
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}

                {/* CONTENT BY ROLE */}

                {/* --- UNIFIED ADMIN/COORDINATOR VIEW --- */}

                {(isAdmin || isCoord) && (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* LEFT COLUMN: NAVIGATION (ADMIN TEAMS / COORD MODES) */}
                        {(isAdmin || (isCoord && settings?.coordinatorTasks)) && (
                            <div className="lg:col-span-1 space-y-6">
                                <div className="flex items-center gap-3 px-2 mb-2">
                                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                        <Folder size={18} />
                                    </div>
                                    <h2 className="text-xl font-black tracking-tight text-foreground">
                                        {isAdmin ? "Zespoły" : "Moje widoki"}
                                    </h2>
                                </div>

                                <div className="space-y-3">
                                    {isAdmin ? (
                                        <>
                                            {/* All Teams Option */}
                                            <button
                                                onClick={() => setAdminTeamFilter("ALL")}
                                                className={cn(
                                                    "w-full text-left p-5 rounded-[28px] transition-all flex items-center justify-between group",
                                                    adminTeamFilter === "ALL"
                                                        ? "glass-panel bg-white/60 border-primary/20 shadow-lg scale-[1.02]"
                                                        : "hover:bg-white/40 border border-transparent"
                                                )}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm",
                                                        adminTeamFilter === "ALL" ? "bg-primary text-white scale-110 shadow-primary/20" : "bg-white/60 text-muted-foreground group-hover:bg-white group-hover:text-primary"
                                                    )}>
                                                        <Users size={22} />
                                                    </div>
                                                    <div>
                                                        <span className={cn("font-bold block transition-colors", adminTeamFilter === "ALL" ? "text-primary" : "text-foreground")}>Wszystkie</span>
                                                        <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest opacity-60">
                                                            Suma: {initialTasks.length}
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>

                                            {allTeams.map((team: any) => {
                                                const teamTaskCount = initialTasks.filter(t => t.teamId === team.id).length;
                                                const isActive = adminTeamFilter === team.id;
                                                return (
                                                    <button
                                                        key={team.id}
                                                        onClick={() => setAdminTeamFilter(team.id)}
                                                        className={cn(
                                                            "w-full text-left p-5 rounded-[28px] transition-all flex items-center justify-between group",
                                                            isActive
                                                                ? "glass-panel bg-white/60 border-primary/20 shadow-lg scale-[1.02]"
                                                                : "hover:bg-white/40 border border-transparent"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div
                                                                className={cn(
                                                                    "w-12 h-12 rounded-2xl flex items-center justify-center text-white transition-all duration-500 shadow-sm",
                                                                    isActive ? "scale-110" : "bg-white/60 text-muted-foreground group-hover:bg-white"
                                                                )}
                                                                style={isActive ? {
                                                                    backgroundColor: team.kolor || '#5400FF',
                                                                    boxShadow: `0 10px 20px -5px ${team.kolor || '#5400FF'}40`
                                                                } : {}}
                                                            >
                                                                <Folder size={22} style={!isActive ? { color: team.kolor || '#9ca3af' } : {}} />
                                                            </div>
                                                            <div>
                                                                <span className={cn("font-bold block transition-colors", isActive ? "text-foreground" : "text-foreground/80")}>{team.nazwa}</span>
                                                                <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest opacity-60">
                                                                    {teamTaskCount} zadań
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {teamTaskCount > 0 && (
                                                            <div className={cn(
                                                                "w-7 h-7 flex items-center justify-center rounded-xl font-black text-[10px] transition-all duration-500",
                                                                isActive ? "bg-white/60 text-foreground" : "bg-white/40 text-muted-foreground group-hover:bg-white"
                                                            )}>
                                                                {teamTaskCount}
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}

                                            <div className="h-px bg-white/40 mx-4 my-2" />

                                            {/* Folder for Coordinator Tasks */}
                                            {settings?.coordinatorTasks && (
                                                <button
                                                    onClick={() => setAdminTeamFilter(-1)}
                                                    className={cn(
                                                        "w-full text-left p-5 rounded-[28px] transition-all flex items-center justify-between group",
                                                        adminTeamFilter === -1
                                                            ? "glass-panel bg-white/60 border-primary/20 shadow-lg scale-[1.02]"
                                                            : "hover:bg-white/40 border border-transparent"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn(
                                                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm",
                                                            adminTeamFilter === -1 ? "bg-purple-600 text-white scale-110 shadow-purple-500/20" : "bg-white/60 text-muted-foreground group-hover:bg-white group-hover:text-purple-600"
                                                        )}>
                                                            <Users size={22} />
                                                        </div>
                                                        <div>
                                                            <span className={cn("font-bold block transition-colors", adminTeamFilter === -1 ? "text-purple-700" : "text-foreground")}>Koordynatorki</span>
                                                            <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest opacity-60">
                                                                Specjalne
                                                            </span>
                                                        </div>
                                                    </div>
                                                </button>
                                            )}

                                            <button
                                                onClick={() => setAdminTeamFilter(-2)}
                                                className={cn(
                                                    "w-full text-left p-5 rounded-[28px] transition-all flex items-center justify-between group",
                                                    adminTeamFilter === -2
                                                        ? "glass-panel bg-white/60 border-primary/20 shadow-lg scale-[1.02]"
                                                        : "hover:bg-white/40 border border-transparent"
                                                )}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm",
                                                        adminTeamFilter === -2 ? "bg-indigo-600 text-white scale-110 shadow-indigo-500/20" : "bg-white/60 text-muted-foreground group-hover:bg-white group-hover:text-indigo-600"
                                                    )}>
                                                        <Users size={22} />
                                                    </div>
                                                    <div>
                                                        <span className={cn("font-bold block transition-colors", adminTeamFilter === -2 ? "text-indigo-700" : "text-foreground")}>Mieszane</span>
                                                        <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest opacity-60">
                                                            Wybrane osoby
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>

                                            <div className="h-px bg-white/40 mx-4 my-2" />


                                        </>
                                    ) : (
                                        <>
                                            {/* Coordinator Sidebar */}
                                            <button
                                                onClick={() => setCoordViewMode("MANAGEMENT")}
                                                className={cn(
                                                    "w-full text-left p-5 rounded-[28px] transition-all flex items-center group",
                                                    coordViewMode === "MANAGEMENT"
                                                        ? "glass-panel bg-white/60 border-primary/20 shadow-lg scale-[1.02]"
                                                        : "hover:bg-white/40 border border-transparent"
                                                )}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm",
                                                        coordViewMode === "MANAGEMENT" ? "bg-primary text-white scale-110 shadow-primary/20" : "bg-white/60 text-muted-foreground group-hover:bg-white group-hover:text-primary"
                                                    )}>
                                                        <Users size={22} />
                                                    </div>
                                                    <div>
                                                        <span className={cn("font-bold block transition-colors", coordViewMode === "MANAGEMENT" ? "text-primary" : "text-foreground")}>Zarządzanie</span>
                                                        <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest opacity-60">
                                                            Weryfikacja zespołu
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>

                                            <button
                                                onClick={() => setCoordViewMode("PERSONAL")}
                                                className={cn(
                                                    "w-full text-left p-5 rounded-[28px] transition-all flex items-center group",
                                                    coordViewMode === "PERSONAL"
                                                        ? "glass-panel bg-white/60 border-primary/20 shadow-lg scale-[1.02]"
                                                        : "hover:bg-white/40 border border-transparent"
                                                )}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm",
                                                        coordViewMode === "PERSONAL" ? "bg-orange-600 text-white scale-110 shadow-orange-500/20" : "bg-white/60 text-muted-foreground group-hover:bg-white group-hover:text-orange-600"
                                                    )}>
                                                        <CheckCircle size={22} />
                                                    </div>
                                                    <div>
                                                        <span className={cn("font-bold block transition-colors", coordViewMode === "PERSONAL" ? "text-orange-700" : "text-foreground")}>Moje zadania</span>
                                                        <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest opacity-60">
                                                            {doZrobienia.length} aktywnych
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>


                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* RIGHT COLUMN: TASKS CONTENT */}
                        <div className={cn("space-y-6", (isAdmin || (isCoord && settings?.coordinatorTasks)) ? "lg:col-span-3" : "lg:col-span-4")}>
                            {showParticipantView ? (
                                /* --- PARTICIPANT VIEW FOR COORDINATOR --- */
                                <div className="glass-panel rounded-[40px] overflow-hidden border-white/40 animate-in fade-in slide-in-from-right-4">
                                    <div className="flex bg-white/40 p-10 border-b border-white/40 items-center justify-between">
                                        <div className="space-y-1">
                                            <h2 className="text-2xl font-black tracking-tight text-foreground">Moje zadania osobiste</h2>
                                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-60">Prywatna lista do wykonania</p>
                                        </div>
                                        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-600 border border-orange-500/20">
                                            <Clock size={24} />
                                        </div>
                                    </div>

                                    <div className="flex bg-white/20 p-2 border-b border-white/40">
                                        {[
                                            { id: "do-zrobienia", label: "Do zrobienia", count: doZrobienia.length, icon: Clock },
                                            { id: "wykonane", label: "Wykonane", count: wykonane.length, icon: History },
                                            { id: "do-poprawy", label: "Do poprawy", count: doPoprawy.length, icon: AlertTriangle }
                                        ].map((tab) => {
                                            const Icon = tab.icon;
                                            const isActive = activeTab === tab.id;
                                            return (
                                                <button
                                                    key={tab.id}
                                                    onClick={() => setActiveTab(tab.id)}
                                                    className={cn(
                                                        "flex-1 py-5 rounded-[22px] flex items-center justify-center gap-3 transition-all relative group",
                                                        isActive ? "bg-white text-primary shadow-lg scale-[1.02]" : "text-muted-foreground hover:bg-white/40"
                                                    )}
                                                >
                                                    <Icon size={18} className={cn("transition-colors", isActive ? "text-primary" : "opacity-40 group-hover:opacity-100")} />
                                                    <span className="font-black text-[11px] uppercase tracking-wider">{tab.label}</span>
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded-lg text-[9px] font-black",
                                                        isActive ? "bg-primary text-white" : "bg-white/40 text-muted-foreground"
                                                    )}>
                                                        {tab.count}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="p-10">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                                                <div className="col-span-full py-20 text-center">
                                                    <div className="w-16 h-16 rounded-full bg-white/40 flex items-center justify-center mx-auto mb-4 text-muted-foreground/20">
                                                        <Layers size={32} />
                                                    </div>
                                                    <p className="text-muted-foreground font-medium italic opacity-60">Brak zadań w tej sekcji</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* --- MANAGEMENT VIEW --- */
                                <>
                                    {/* DO SPRAWDZENIA - Verification Section */}
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between px-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 border border-amber-500/20">
                                                    <Clock size={18} />
                                                </div>
                                                <h2 className="text-xl font-black tracking-tight text-foreground">Do sprawdzenia</h2>
                                            </div>
                                            <div className="flex gap-2">
                                                {[
                                                    { id: "oczekujace", color: "bg-amber-500" },
                                                    { id: "zaakceptowane", color: "bg-emerald-500" },
                                                    { id: "doPoprawy", color: "bg-red-500" }
                                                ].map(t => (
                                                    <div
                                                        key={t.id}
                                                        className={cn(
                                                            "w-2 h-2 rounded-full transition-all duration-500",
                                                            verificationTab === t.id ? t.color : "bg-white/40"
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        <div className="glass-panel p-2 rounded-[32px] border-white/40">
                                            <div className="flex p-1 gap-1">
                                                {[
                                                    { id: "oczekujace", label: "Do sprawdzenia", count: weryfikacja_oczekujace.length, icon: Clock, color: "text-amber-500" },
                                                    { id: "zaakceptowane", label: "Zatwierdzone", count: weryfikacja_zaakceptowane.length, icon: CheckCircle, color: "text-emerald-500" },
                                                    { id: "doPoprawy", label: "Do poprawy", count: weryfikacja_doPoprawy.length, icon: AlertTriangle, color: "text-red-500" }
                                                ].map((tab) => {
                                                    const Icon = tab.icon;
                                                    const isActive = verificationTab === tab.id;
                                                    return (
                                                        <button
                                                            key={tab.id}
                                                            onClick={() => setVerificationTab(tab.id as any)}
                                                            className={cn(
                                                                "flex-1 py-4 rounded-[20px] flex flex-col items-center justify-center gap-1.5 transition-all group",
                                                                isActive ? "bg-white text-primary shadow-lg scale-[1.02]" : "text-muted-foreground hover:bg-white/40"
                                                            )}
                                                        >
                                                            <Icon size={16} className={cn("transition-colors", isActive ? tab.color : "opacity-40 group-hover:opacity-100")} />
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                                                                <span className={cn(
                                                                    "px-1.5 py-0.5 rounded-md text-[8px] font-black",
                                                                    isActive ? "bg-primary/10 text-primary" : "bg-white/40 text-muted-foreground"
                                                                )}>{tab.count}</span>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {verificationTab === "zaakceptowane" ? (
                                                    (() => {
                                                        // GROUPING LOGIC
                                                        const groupedTasks = weryfikacja_zaakceptowane.reduce((acc: any, curr: any) => {
                                                            const key = curr.task.tytul;
                                                            if (!acc[key]) {
                                                                acc[key] = {
                                                                    task: curr.task,
                                                                    executions: []
                                                                };
                                                            }
                                                            acc[key].executions.push(curr);
                                                            return acc;
                                                        }, {});

                                                        const sortedGroups = Object.values(groupedTasks).sort((a: any, b: any) =>
                                                            new Date(b.task.dataUtworzenia).getTime() - new Date(a.task.dataUtworzenia).getTime()
                                                        );

                                                        return sortedGroups.map((group: any) => (
                                                            <StackedTaskTile
                                                                key={group.task.id}
                                                                group={group}
                                                                onViewDetail={(ex: any) => setSelectedExecutionForDetail({ ...ex, tabType: verificationTab })}
                                                                onArchive={(ids: number[]) => {
                                                                    setExecutionToArchive(ids);
                                                                    setIsArchiveModalOpen(true);
                                                                }}
                                                            />
                                                        ));
                                                    })()
                                                ) : (
                                                    (verificationTab === "oczekujace" ? weryfikacja_oczekujace : weryfikacja_doPoprawy).map((exec: any) => (
                                                        <CollapsibleExecutionCard
                                                            key={exec.id}
                                                            execution={exec}
                                                            onViewDetail={() => setSelectedExecutionForDetail({ ...exec, tabType: verificationTab })}
                                                            tabType={verificationTab}
                                                        />
                                                    ))
                                                )}
                                                {(verificationTab === "oczekujace" ? weryfikacja_oczekujace :
                                                    verificationTab === "zaakceptowane" ? weryfikacja_zaakceptowane :
                                                        weryfikacja_doPoprawy).length === 0 && (
                                                        <div className="col-span-full py-12 text-center">
                                                            <p className="text-muted-foreground text-xs font-medium italic opacity-60">
                                                                Brak zgłoszeń w tej sekcji
                                                            </p>
                                                        </div>
                                                    )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* ZLECONE - Assigned Tasks Section */}
                                    <div className="space-y-6 pt-10">
                                        <div className="flex justify-between items-center px-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                                    <Layers size={18} />
                                                </div>
                                                <h2 className="text-xl font-black tracking-tight text-foreground">
                                                    {isAdmin ? (adminTeamFilter === "ALL" ? "Wszystkie zadania" : "Zadania zespołu") : "Zlecone przez Ciebie"}
                                                </h2>
                                            </div>

                                            <div className="relative">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setIsSortMenuOpen(!isSortMenuOpen); }}
                                                    className="flex items-center gap-2 px-4 py-2 bg-white/60 hover:bg-white rounded-2xl text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-all shadow-sm border border-white/40"
                                                >
                                                    <Filter size={14} className="text-primary" />
                                                    {sortConfig.field === "PRIORYTET" ? "Priorytet" : "Termin"}
                                                    <ChevronDown size={14} className={cn("transition-transform duration-300", isSortMenuOpen && "rotate-180")} />
                                                </button>

                                                <AnimatePresence>
                                                    {isSortMenuOpen && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                            className="absolute top-full right-0 mt-3 w-56 glass-panel p-2 z-[50] shadow-2xl border-white/60"
                                                        >
                                                            <div className="space-y-1">
                                                                <span className="text-[9px] font-black uppercase text-muted-foreground/60 px-3 py-2 block tracking-widest">Sortuj wg priorytetu</span>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setSortConfig({ field: "PRIORYTET", direction: "DESC" }); setIsSortMenuOpen(false); }}
                                                                    className={cn("w-full text-left px-4 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all", sortConfig.field === "PRIORYTET" && sortConfig.direction === "DESC" ? "bg-primary text-white" : "hover:bg-primary/10 text-foreground")}
                                                                >
                                                                    Najwyższy (Malejąco)
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setSortConfig({ field: "PRIORYTET", direction: "ASC" }); setIsSortMenuOpen(false); }}
                                                                    className={cn("w-full text-left px-4 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all", sortConfig.field === "PRIORYTET" && sortConfig.direction === "ASC" ? "bg-primary text-white" : "hover:bg-primary/10 text-foreground")}
                                                                >
                                                                    Najniższy (Rosnąco)
                                                                </button>

                                                                <div className="h-px bg-white/40 my-2 mx-2" />

                                                                <span className="text-[9px] font-black uppercase text-muted-foreground/60 px-3 py-2 block tracking-widest">Sortuj wg terminu</span>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setSortConfig({ field: "TERMIN", direction: "ASC" }); setIsSortMenuOpen(false); }}
                                                                    className={cn("w-full text-left px-4 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all", sortConfig.field === "TERMIN" && sortConfig.direction === "ASC" ? "bg-primary text-white" : "hover:bg-primary/10 text-foreground")}
                                                                >
                                                                    Najbliższy (Rosnąco)
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setSortConfig({ field: "TERMIN", direction: "DESC" }); setIsSortMenuOpen(false); }}
                                                                    className={cn("w-full text-left px-4 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all", sortConfig.field === "TERMIN" && sortConfig.direction === "DESC" ? "bg-primary text-white" : "hover:bg-primary/10 text-foreground")}
                                                                >
                                                                    Najdalszy (Malejąco)
                                                                </button>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {zlecone.map((t: any) => (
                                                <AdminTaskTile
                                                    key={t.id}
                                                    task={t}
                                                    onClick={() => setSelectedTask(t)}
                                                />
                                            ))}
                                            {zlecone.length === 0 && (
                                                <div className="col-span-full glass-panel p-20 text-center border-dashed border-white/40">
                                                    <div className="w-16 h-16 rounded-full bg-white/40 flex items-center justify-center mx-auto mb-4 text-muted-foreground/20">
                                                        <Layers size={32} />
                                                    </div>
                                                    <p className="text-muted-foreground font-medium italic opacity-60">
                                                        Brak zadań w tej sekcji
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* --- 3. STANDARD PARTICIPANT VIEW (NON-COORD) --- */}
                {(!isAdmin && !isCoord) && (
                    <div className="glass-panel rounded-[40px] overflow-hidden border-white/40 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex bg-white/40 p-10 border-b border-white/40 items-center justify-between">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black tracking-tight text-foreground">Twoje zadania</h2>
                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-60">Lista zadań do zrealizowania</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                <CheckCircle size={24} />
                            </div>
                        </div>

                        <div className="flex bg-white/20 p-2 border-b border-white/40">
                            {[
                                { id: "do-zrobienia", label: "Do zrobienia", count: doZrobienia.length, icon: Clock },
                                { id: "wykonane", label: "Wykonane", count: wykonane.length, icon: History },
                                { id: "do-poprawy", label: "Do poprawy", count: doPoprawy.length, icon: AlertTriangle }
                            ].map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <div
                                        key={tab.id}
                                        role="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={cn(
                                            "flex-1 py-5 rounded-[22px] flex items-center justify-center gap-3 transition-all relative group cursor-pointer",
                                            isActive ? "bg-white text-primary shadow-lg scale-[1.02]" : "text-muted-foreground hover:bg-white/40"
                                        )}
                                    >
                                        <Icon size={18} className={cn("transition-colors", isActive ? "text-primary" : "opacity-40 group-hover:opacity-100")} />
                                        <span className="font-black text-[11px] uppercase tracking-wider">{tab.label}</span>
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-lg text-[9px] font-black",
                                            isActive ? "bg-primary text-white" : "bg-white/40 text-muted-foreground"
                                        )}>
                                            {tab.count}
                                        </span>

                                        {isActive && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setIsSortMenuOpen(!isSortMenuOpen); }}
                                                    className="p-1.5 hover:bg-primary/5 rounded-lg text-primary transition-colors"
                                                >
                                                    <Filter size={14} />
                                                </button>

                                                <AnimatePresence>
                                                    {isSortMenuOpen && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                            className="absolute top-full right-0 mt-3 w-56 glass-panel p-2 z-[50] shadow-2xl border-white/60"
                                                        >
                                                            <div className="space-y-1">
                                                                <span className="text-[9px] font-black uppercase text-muted-foreground/60 px-3 py-2 block tracking-widest">Sortuj wg priorytetu</span>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setSortConfig({ field: "PRIORYTET", direction: "DESC" }); setIsSortMenuOpen(false); }}
                                                                    className={cn("w-full text-left px-4 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all", sortConfig.field === "PRIORYTET" && sortConfig.direction === "DESC" ? "bg-primary text-white" : "hover:bg-primary/10 text-foreground")}
                                                                >
                                                                    Najwyższy (Malejąco)
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setSortConfig({ field: "PRIORYTET", direction: "ASC" }); setIsSortMenuOpen(false); }}
                                                                    className={cn("w-full text-left px-4 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all", sortConfig.field === "PRIORYTET" && sortConfig.direction === "ASC" ? "bg-primary text-white" : "hover:bg-primary/10 text-foreground")}
                                                                >
                                                                    Najniższy (Rosnąco)
                                                                </button>

                                                                <div className="h-px bg-white/40 my-2 mx-2" />

                                                                <span className="text-[9px] font-black uppercase text-muted-foreground/60 px-3 py-2 block tracking-widest">Sortuj wg terminu</span>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setSortConfig({ field: "TERMIN", direction: "ASC" }); setIsSortMenuOpen(false); }}
                                                                    className={cn("w-full text-left px-4 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all", sortConfig.field === "TERMIN" && sortConfig.direction === "ASC" ? "bg-primary text-white" : "hover:bg-primary/10 text-foreground")}
                                                                >
                                                                    Najbliższy (Rosnąco)
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setSortConfig({ field: "TERMIN", direction: "DESC" }); setIsSortMenuOpen(false); }}
                                                                    className={cn("w-full text-left px-4 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all", sortConfig.field === "TERMIN" && sortConfig.direction === "DESC" ? "bg-primary text-white" : "hover:bg-primary/10 text-foreground")}
                                                                >
                                                                    Najdalszy (Malejąco)
                                                                </button>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="p-10">
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
                                    <div className="col-span-full py-20 text-center">
                                        <div className="w-16 h-16 rounded-full bg-white/40 flex items-center justify-center mx-auto mb-4 text-muted-foreground/20">
                                            <Layers size={32} />
                                        </div>
                                        <p className="text-muted-foreground font-medium italic opacity-60">Brak zadań w tej sekcji</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* MODALS */}

                {/* Submission Modal for Participant / Coordinator in Personal Mode */}
                {
                    mounted && createPortal(
                        <AnimatePresence>
                            {selectedTask && (showParticipantView || (!isAdmin && !isCoord)) && activeTab !== "wykonane" && (
                                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedTask(null)} className="absolute inset-0 bg-black/60 backdrop-blur-[20px]" />
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

                                            {/* NEW: Attachments Section for Participants */}
                                            <div className="bg-gray-50 border border-gray-100 rounded-[28px] p-6">
                                                <h4 className="text-[10px] font-black uppercase text-primary/40 tracking-widest mb-4 flex items-center gap-2">
                                                    <LinkIcon size={14} /> Załączniki (linki)
                                                </h4>

                                                <div className="space-y-3 mb-4">
                                                    {selectedTask.attachments && selectedTask.attachments.length > 0 ? (
                                                        <div className="grid grid-cols-1 gap-2">
                                                            {selectedTask.attachments.map((att: any) => (
                                                                <div key={att.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-2xl group transition-all hover:shadow-sm">
                                                                    <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-bold text-gray-700 hover:text-primary transition-colors overflow-hidden">
                                                                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-primary transition-all">
                                                                            {(att.url.startsWith('/uploads/') || att.url.includes('cloudinary.com')) ? <Paperclip size={14} /> : <LinkIcon size={14} />}
                                                                        </div>
                                                                        <span className="truncate">{att.nazwa}</span>
                                                                    </a>
                                                                    <button
                                                                        onClick={async () => {
                                                                            if (!confirm("Czy na pewno usunąć ten załącznik?")) return;
                                                                            const res = await deleteTaskAttachment(att.id);
                                                                            if (res.success) {
                                                                                setSelectedTask({
                                                                                    ...selectedTask,
                                                                                    attachments: selectedTask.attachments.filter((a: any) => a.id !== att.id)
                                                                                });
                                                                                onRefresh();
                                                                            }
                                                                        }}
                                                                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-[10px] text-muted-foreground italic text-center py-2">Brak dodanych załączników</p>
                                                    )}
                                                </div>

                                                <div className="bg-white p-3 rounded-[22px] border border-gray-100">
                                                    <div className="flex flex-col gap-2">
                                                        <input
                                                            className="lux-input py-2 text-[10px] bg-gray-50/50"
                                                            placeholder="Nazwa linku..."
                                                            value={newDetailAttachment.nazwa}
                                                            onChange={e => setNewDetailAttachment(prev => ({ ...prev, nazwa: e.target.value }))}
                                                        />
                                                        <div className="flex gap-2">
                                                            <input
                                                                className="lux-input py-2 text-[10px] bg-gray-50/50 flex-1"
                                                                placeholder="https://..."
                                                                value={newDetailAttachment.url}
                                                                onChange={e => setNewDetailAttachment(prev => ({ ...prev, url: e.target.value }))}
                                                            />
                                                            <button
                                                                onClick={async () => {
                                                                    if (!newDetailAttachment.nazwa || !newDetailAttachment.url) return;
                                                                    const res = await addTaskAttachment(selectedTask.id, newDetailAttachment.nazwa, newDetailAttachment.url);
                                                                    if (res.success && res.data) {
                                                                        setSelectedTask({
                                                                            ...selectedTask,
                                                                            attachments: [...(selectedTask.attachments || []), res.data]
                                                                        });
                                                                        setNewDetailAttachment({ nazwa: "", url: "" });
                                                                        onRefresh();
                                                                    }
                                                                }}
                                                                className="p-2 bg-primary text-white rounded-xl shadow-md hover:translate-y-[-1px] transition-all"
                                                            >
                                                                <Plus size={18} />
                                                            </button>
                                                        </div>

                                                        <div className="flex gap-2 border-t border-gray-100 pt-3 mt-1">
                                                            <input
                                                                type="file"
                                                                id="file-upload-participant"
                                                                className="hidden"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) handleFileUpload(file);
                                                                }}
                                                            />
                                                            <button
                                                                onClick={() => document.getElementById('file-upload-participant')?.click()}
                                                                disabled={isUploading}
                                                                className="flex-1 py-2 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all flex items-center justify-center gap-2 shadow-sm"
                                                            >
                                                                {isUploading ? (
                                                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                                ) : (
                                                                    <Paperclip size={14} />
                                                                )}
                                                                {isUploading ? "Wgrywanie..." : "Wgraj plik z urządzenia"}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
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
                        </AnimatePresence>,
                        document.body
                    )
                }

                {/* Rejection Modal for Coord/Admin */}
                {
                    mounted && createPortal(
                        <AnimatePresence>
                            {selectedTask && (isCoord || isAdmin) && rejectionNotes !== null && selectedTask.targetUserId && (
                                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setSelectedTask(null); setRejectionNotes(""); }} className="absolute inset-0 bg-black/60 backdrop-blur-[20px]" />
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
                        </AnimatePresence>,
                        document.body
                    )
                }

                {/* Execution Detail Modal */}
                {
                    mounted && selectedExecutionForDetail && createPortal(
                        <ExecutionDetailModal
                            execution={selectedExecutionForDetail}
                            onClose={() => setSelectedExecutionForDetail(null)}
                            onApprove={(taskId: number, userId: number) => {
                                handleApproveWork(taskId, userId);
                                setSelectedExecutionForDetail(null);
                            }}
                            onReject={(task: any, userId: number) => {
                                setSelectedTask({ ...task, targetUserId: userId, targetUserName: selectedExecutionForDetail.user?.imieNazwisko });
                                setSelectedExecutionForDetail(null);
                            }}
                            setIsAdmin={isAdmin}
                            onArchive={() => {
                                setExecutionToArchive(selectedExecutionForDetail.id);
                                setIsArchiveModalOpen(true);
                                setSelectedExecutionForDetail(null);
                            }}
                        />,
                        document.body
                    )
                }


                {/* NEW ADMIN TASK DETAIL MODAL */}
                {
                    mounted && selectedTask && (isAdmin || isCoord) && !selectedTask.targetUserId && !showParticipantView && createPortal(
                        <AnimatePresence>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-[10px] flex items-center justify-center p-4 overflow-y-auto"
                                onClick={(e) => { if (e.target === e.currentTarget) setSelectedTask(null); }}
                            >
                                <motion.div
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="bg-white rounded-[32px] w-full max-w-3xl shadow-2xl overflow-hidden relative border border-gray-100"
                                >
                                    {/* Modal Header */}
                                    <div className="p-8 pb-4">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-4">
                                                {isEditing ? (
                                                    <select
                                                        value={editForm.priorytet}
                                                        onChange={(e) => setEditForm({ ...editForm, priorytet: e.target.value })}
                                                        className="px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase border border-gray-200 outline-none focus:border-primary"
                                                    >
                                                        <option value="NORMALNY">NORMALNY</option>
                                                        <option value="WYSOKI">WYSOKI</option>
                                                        <option value="NISKI">NISKI</option>
                                                    </select>
                                                ) : (
                                                    <div className={cn(
                                                        "px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase inline-block",
                                                        selectedTask.priorytet === "WYSOKI" ? "bg-red-50 text-red-600" :
                                                            selectedTask.priorytet === "NORMALNY" ? "bg-blue-50 text-blue-600" :
                                                                "bg-green-50 text-green-600"
                                                    )}>
                                                        {selectedTask.priorytet}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex gap-2">
                                                {isEditing ? (
                                                    <>
                                                        <button
                                                            onClick={handleSaveEdit}
                                                            className="p-2 bg-primary text-white hover:bg-primary/90 rounded-full transition-colors shadow-lg shadow-primary/30"
                                                            title="Zapisz zmiany"
                                                        >
                                                            <Save size={20} />
                                                        </button>
                                                        <button
                                                            onClick={() => setIsEditing(false)}
                                                            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                                                            title="Anuluj edycję"
                                                        >
                                                            <XCircle size={20} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => setIsEditing(true)}
                                                        className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-primary transition-colors"
                                                        title="Edytuj zadanie"
                                                    >
                                                        <Edit2 size={20} />
                                                    </button>
                                                )}

                                                {!isEditing && (
                                                    <button
                                                        onClick={async () => {
                                                            if (!confirm("Czy na pewno chcesz usunąć to zadanie dla WSZYSTKICH?")) return;
                                                            await deleteTask(selectedTask.id);
                                                            setSelectedTask(null);
                                                            onRefresh();
                                                        }}
                                                        className="p-2 hover:bg-red-50 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                                                        title="Usuń zadanie dla wszystkich"
                                                    >
                                                        <Trash2 size={20} />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => setSelectedTask(null)}
                                                    className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                                                >
                                                    <X size={24} />
                                                </button>
                                            </div>
                                        </div>

                                        {isEditing ? (
                                            <div className="space-y-4 mb-4">
                                                <input
                                                    type="text"
                                                    value={editForm.tytul}
                                                    onChange={(e) => setEditForm({ ...editForm, tytul: e.target.value })}
                                                    className="text-3xl font-bold text-gray-900 w-full border-b border-gray-200 focus:border-primary outline-none py-2 bg-transparent placeholder:text-gray-300"
                                                    placeholder="Tytuł zadania"
                                                />
                                                <div className="flex items-center gap-2 text-sm font-bold text-gray-500">
                                                    <Calendar size={16} />
                                                    <input
                                                        type="date"
                                                        value={editForm.termin}
                                                        onChange={(e) => setEditForm({ ...editForm, termin: e.target.value })}
                                                        className="border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-primary"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <h2 className="text-3xl font-bold text-gray-900 mb-2">{selectedTask.tytul}</h2>
                                                {selectedTask.termin && (
                                                    <div className="flex items-center gap-2 text-sm font-bold text-gray-500">
                                                        <Calendar size={16} />
                                                        <span>Termin: {new Date(selectedTask.termin).toLocaleDateString('pl-PL')}</span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {/* Scrollable Content */}
                                    <div className="px-8 pb-8 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-8">
                                        {/* Description */}
                                        <div className={cn("rounded-2xl text-gray-700 leading-relaxed whitespace-pre-wrap", isEditing ? "" : "bg-gray-50 p-6")}>
                                            <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2">Opis zadania</h4>
                                            {isEditing ? (
                                                <textarea
                                                    value={editForm.opis}
                                                    onChange={(e) => setEditForm({ ...editForm, opis: e.target.value })}
                                                    className="w-full h-40 p-4 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary outline-none transition-all"
                                                    placeholder="Opis zadania..."
                                                />
                                            ) : (
                                                selectedTask.opis || "Brak szczegółowego opisu."
                                            )}
                                        </div>

                                        {/* NEW: Attachments Section for Admins/Coordinators */}
                                        <div className="bg-white border-2 border-primary/5 rounded-[28px] p-6 shadow-sm">
                                            <h4 className="text-[10px] font-black uppercase text-primary/40 tracking-widest mb-4 flex items-center gap-2">
                                                <LinkIcon size={14} /> Załączniki do zadania
                                            </h4>
                                            <div className="space-y-3 mb-6">
                                                {selectedTask.attachments && selectedTask.attachments.length > 0 ? (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {selectedTask.attachments.map((att: any) => (
                                                            <div key={att.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-2xl group transition-all hover:bg-white hover:shadow-sm">
                                                                <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-bold text-gray-700 hover:text-primary transition-colors overflow-hidden">
                                                                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-primary shadow-sm group-hover:bg-primary group-hover:text-white transition-all">
                                                                        {(att.url.startsWith('/uploads/') || att.url.includes('cloudinary.com')) ? <Paperclip size={14} /> : <LinkIcon size={14} />}
                                                                    </div>
                                                                    <span className="truncate">{att.nazwa}</span>
                                                                </a>
                                                                <button
                                                                    onClick={async () => {
                                                                        if (!confirm("Czy na pewno usunąć ten załącznik?")) return;
                                                                        const res = await deleteTaskAttachment(att.id);
                                                                        if (res.success) {
                                                                            setSelectedTask({
                                                                                ...selectedTask,
                                                                                attachments: selectedTask.attachments.filter((a: any) => a.id !== att.id)
                                                                            });
                                                                            onRefresh();
                                                                        }
                                                                    }}
                                                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="py-4 text-center border-2 border-dashed border-gray-100 rounded-[20px]">
                                                        <p className="text-xs text-muted-foreground italic">Brak dodanych załączników</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="bg-gray-50 p-4 rounded-[22px] border border-gray-100">
                                                <span className="text-[9px] font-black uppercase text-gray-400 block mb-3 ml-1">Dodaj nowy link lub plik</span>
                                                <div className="flex flex-col sm:flex-row gap-3">
                                                    <input
                                                        className="lux-input py-2 text-xs bg-white flex-[2]"
                                                        placeholder="Nazwa np. Prezentacja"
                                                        value={newDetailAttachment.nazwa}
                                                        onChange={e => setNewDetailAttachment(prev => ({ ...prev, nazwa: e.target.value }))}
                                                    />
                                                    <div className="flex flex-1 gap-2">
                                                        <input
                                                            className="lux-input py-2 text-xs bg-white flex-1"
                                                            placeholder="https://..."
                                                            value={newDetailAttachment.url}
                                                            onChange={e => setNewDetailAttachment(prev => ({ ...prev, url: e.target.value }))}
                                                        />
                                                        <button
                                                            onClick={async () => {
                                                                if (!newDetailAttachment.nazwa || !newDetailAttachment.url) return;
                                                                const res = await addTaskAttachment(selectedTask.id, newDetailAttachment.nazwa, newDetailAttachment.url);
                                                                if (res.success && res.data) {
                                                                    setSelectedTask({
                                                                        ...selectedTask,
                                                                        attachments: [...(selectedTask.attachments || []), res.data]
                                                                    });
                                                                    setNewDetailAttachment({ nazwa: "", url: "" });
                                                                    onRefresh();
                                                                }
                                                            }}
                                                            className="p-2 bg-primary text-white rounded-xl shadow-md hover:translate-y-[-2px] transition-all"
                                                        >
                                                            <Plus size={20} />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="mt-3 pt-3 border-t border-gray-200/50 flex gap-2">
                                                    <input
                                                        type="file"
                                                        id="file-upload-admin"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) handleFileUpload(file);
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => document.getElementById('file-upload-admin')?.click()}
                                                        disabled={isUploading}
                                                        className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all flex items-center justify-center gap-2 shadow-sm"
                                                    >
                                                        {isUploading ? (
                                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        ) : (
                                                            <Paperclip size={16} />
                                                        )}
                                                        {isUploading ? "Wgrywanie..." : "Dodaj plik z urządzenia"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Execution Status / Table */}
                                        <div>
                                            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Postęp Realizacji</h3>

                                            {/* Global Progress Bar */}
                                            <div className="mb-6 bg-gray-100 rounded-full h-4 overflow-hidden relative">
                                                <div
                                                    className="h-full bg-gradient-to-r from-primary to-purple-600 rounded-full transition-all duration-1000"
                                                    style={{ width: `${(selectedTask.executions?.filter((e: any) => e.status === "ZAAKCEPTOWANE").length / (selectedTask.executions?.length || 1)) * 100}%` }}
                                                />
                                            </div>

                                            {/* Executors List */}
                                            <div className="space-y-2">
                                                {selectedTask.executions?.map((ex: any) => (
                                                    <div key={ex.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:shadow-sm transition-all">
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn(
                                                                "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold",
                                                                ex.status === "ZAAKCEPTOWANE" ? "bg-green-100 text-green-600" :
                                                                    ex.status === "ODRZUCONE" ? "bg-red-100 text-red-600" :
                                                                        ex.status === "OCZEKUJACE" ? "bg-amber-100 text-amber-600" :
                                                                            "bg-gray-100 text-gray-400"
                                                            )}>
                                                                {ex.user?.imieNazwisko?.[0]}
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-bold text-gray-800">{ex.imieNazwisko} <span className="text-[10px] text-gray-400 font-normal ml-1">#{ex.userId}</span></div>
                                                                <div className={cn(
                                                                    "text-[10px] font-bold uppercase",
                                                                    ex.status === "ZAAKCEPTOWANE" ? "text-green-600" :
                                                                        ex.status === "ODRZUCONE" ? "text-red-600" :
                                                                            ex.status === "OCZEKUJACE" ? "text-amber-500" :
                                                                                "text-gray-400"
                                                                )}>
                                                                    {ex.status === "OCZEKUJACE" ? "Czeka na weryfikację" : ex.status}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={async () => {
                                                                if (!confirm(`Czy usunąć wykonawcę ${ex.imieNazwisko} z tego zadania?`)) return;
                                                                await deleteTaskExecution(selectedTask.id, ex.userId);
                                                                setSelectedTask((prev: any) => ({
                                                                    ...prev,
                                                                    executions: prev.executions.filter((e: any) => e.userId !== ex.userId)
                                                                }));
                                                                onRefresh();
                                                            }}
                                                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Usuń wykonawcę"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                                {(!selectedTask.executions || selectedTask.executions.length === 0) && (
                                                    <div className="text-center text-sm text-gray-400 italic py-4">Brak przypisanych wykonawców</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </motion.div>
                        </AnimatePresence>,
                        document.body
                    )
                }
            </div>





            <ArchiveSelectFolderModal
                isOpen={isArchiveModalOpen}
                onClose={() => setIsArchiveModalOpen(false)}
                userId={userId}
                role={activeRole}
                onSelect={async (folderId: number) => {
                    if (!executionToArchive) return;
                    const ids = Array.isArray(executionToArchive) ? executionToArchive : [executionToArchive];
                    await moveExecutionToArchive(ids, folderId);
                    setIsArchiveModalOpen(false);
                    setExecutionToArchive(null);
                    onRefresh();
                }}
            />
        </DashboardLayout >
    );
}

// NEW: Stacked Task Tile for Approved Tasks
function StackedTaskTile({ group, onViewDetail, onArchive }: any) {
    const [isExpanded, setIsExpanded] = useState(false);
    const task = group.task;
    const executions = group.executions;

    // Sort executions by date
    const sortedExecutions = [...executions].sort((a: any, b: any) =>
        new Date(b.dataOznaczenia).getTime() - new Date(a.dataOznaczenia).getTime()
    );

    return (
        <div className="space-y-2">
            <motion.div
                layout
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                    "rounded-[24px] p-5 cursor-pointer border-2 transition-all shadow-sm hover:shadow-md relative overflow-hidden group/stack",
                    isExpanded ? "bg-emerald-50/50 border-emerald-200" : "bg-white border-emerald-100/50 hover:border-emerald-200"
                )}
            >
                {/* Stack Effect Visuals */}
                {!isExpanded && executions.length > 1 && (
                    <>
                        <div className="absolute top-0.5 left-4 right-4 h-1 bg-emerald-100/50 rounded-t-xl mx-2 border-t border-x border-emerald-200/20" />
                        <div className="absolute top-1.5 left-2 right-2 h-1 bg-emerald-100/80 rounded-t-xl mx-1 border-t border-x border-emerald-200/40" />
                    </>
                )}

                <div className="flex items-center justify-between gap-4 relative z-10 w-full">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-white shadow-sm transition-colors",
                            isExpanded ? "bg-emerald-600" : "bg-emerald-500"
                        )}>
                            {executions.length > 1 ? (
                                <Layers size={22} />
                            ) : (
                                <CheckCircle size={22} />
                            )}
                        </div>

                        <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-gray-900 truncate text-base mb-1">{task.tytul}</h4>
                            <div className="flex items-center gap-2">
                                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                                    {executions.length} {executions.length === 1 ? "osoba" : "osoby"}
                                </span>
                                {!isExpanded && (
                                    <div className="flex -space-x-1.5">
                                        {sortedExecutions.slice(0, 3).map((ex: any, i: number) => (
                                            <div key={i} className="w-5 h-5 rounded-full bg-white border border-emerald-100 flex items-center justify-center text-[8px] font-bold text-emerald-600 shadow-sm" title={ex.user?.imieNazwisko}>
                                                {ex.user?.imieNazwisko?.[0]}
                                            </div>
                                        ))}
                                        {sortedExecutions.length > 3 && (
                                            <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[8px] font-bold text-emerald-600">
                                                +{sortedExecutions.length - 3}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onArchive) onArchive(executions.map((e: any) => e.id));
                            }}
                            className="p-2 hover:bg-emerald-100 rounded-xl text-gray-400 hover:text-emerald-700 transition-colors z-20 relative"
                            title="Archiwizuj grupę"
                        >
                            <Archive size={18} />
                        </button>
                        <div className={cn(
                            "p-2 rounded-xl transition-transform duration-300 transform",
                            isExpanded ? "rotate-180 bg-emerald-100 text-emerald-600" : "text-gray-300 group-hover/stack:text-emerald-400"
                        )}>
                            <ChevronDown size={20} />
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Expanded List */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pl-4 space-y-2 border-l-2 border-emerald-100/50 ml-6"
                    >
                        {sortedExecutions.map((ex: any) => (
                            <CollapsibleExecutionCard
                                key={ex.userId}
                                execution={ex}
                                onViewDetail={() => onViewDetail(ex)}
                                tabType="zaakceptowane" // Force style for expanded items
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

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
            <p className="text-sm text-muted-foreground flex-1 line-clamp-2 mb-4 leading-relaxed">{task.opis || "Brak opisu dodatkowego."}</p>

            {/* NEW: Attachments for Participants */}
            {task.attachments && task.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6 p-3 bg-gray-50 rounded-2xl border border-gray-100/50">
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest w-full mb-1 ml-1 opacity-60">Załączniki:</span>
                    {task.attachments.slice(0, 3).map((att: any) => (
                        <a
                            key={att.id}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-100 rounded-xl text-[10px] font-bold text-gray-600 hover:text-primary hover:border-primary/20 transition-all shadow-sm hover:shadow-md"
                        >
                            <ExternalLink size={10} className="text-primary/60" />
                            {att.nazwa}
                        </a>
                    ))}
                    {task.attachments.length > 3 && (
                        <span className="text-[10px] text-gray-400 font-bold self-center ml-1">+{task.attachments.length - 3}</span>
                    )}
                </div>
            )}

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



// Simplified Execution Card that triggers the Detail Modal
function CollapsibleExecutionCard({ execution, onViewDetail, tabType }: any) {
    const task = execution.task;
    const deadline = task.termin ? new Date(task.termin) : null;
    const isOverdue = deadline && deadline < new Date() && task.status === "AKTYWNE";

    // Dynamic styles based on tab/status
    const statusColor =
        tabType === "oczekujace" ? "amber" :
            tabType === "zaakceptowane" ? "emerald" : "red";

    const StatusIcon =
        tabType === "oczekujace" ? Clock :
            tabType === "zaakceptowane" ? CheckCircle : AlertTriangle;

    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
                "rounded-[20px] p-4 flex items-center justify-between gap-3 cursor-pointer border-2 transition-all shadow-sm hover:shadow-md",
                `bg-gradient-to-br from-${statusColor}-50 to-white border-${statusColor}-100 hover:border-${statusColor}-300`,
                tabType === "oczekujace" && isOverdue && "from-red-50 to-red-100 border-red-200/50"
            )}
            onClick={onViewDetail}
        >
            <div className="flex items-center gap-3 min-w-0">
                <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-sm",
                    tabType === "oczekujace" ? (isOverdue ? "bg-red-500" : "bg-amber-500") :
                        tabType === "zaakceptowane" ? "bg-emerald-500" : "bg-red-500"
                )}>
                    <StatusIcon size={18} />
                </div>
                <div className="min-w-0">
                    <h4 className="font-bold text-gray-900 truncate text-sm mb-0.5">{task.tytul}</h4>
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        <span>{execution.user?.imieNazwisko}</span>
                        {execution.terminPoprawki && tabType === "doPoprawy" && (
                            <span className="text-red-500 flex items-center gap-1">
                                <Clock size={10} /> Poprawa: {new Date(execution.terminPoprawki).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                </div>
            </div>
            <ChevronDown className="text-gray-400 rotate-270" size={18} />
        </motion.div>
    );
}

// Full Screen Detail Modal for Verification
function ExecutionDetailModal({ execution, onClose, onApprove, onReject, isAdmin, onArchive }: any) {
    if (!execution) return null;
    const task = execution.task;
    const tabType = execution.tabType || execution.status.toLowerCase();
    const deadline = task.termin ? new Date(task.termin) : null;
    const isOverdue = deadline && deadline < new Date() && task.status === "AKTYWNE";

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 md:p-10"
            >
                {/* Backdrop with Blur */}
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[20px]" onClick={onClose} />

                {/* Modal Content */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Modal Header */}
                    <div className="p-8 pb-6 border-b border-gray-100 flex justify-between items-start gap-6 bg-gray-50/50">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                    tabType === "oczekujace" ? "bg-amber-50 text-amber-600 border-amber-200" :
                                        tabType === "zaakceptowane" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                                            "bg-red-50 text-red-600 border-red-200"
                                )}>
                                    {tabType === "oczekujace" ? "Oczekuje na weryfikację" :
                                        tabType === "zaakceptowane" ? "Zatwierdzone" : "Do poprawy"}
                                </span>
                                {isOverdue && tabType === "oczekujace" && (
                                    <span className="bg-red-500 text-white px-2 py-1 rounded-full text-[8px] font-black uppercase animate-pulse">PO TERMINIE</span>
                                )}
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 leading-tight">{task.tytul}</h2>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                                        {execution.user?.imieNazwisko?.[0]}
                                    </div>
                                    <span>{execution.user?.imieNazwisko}</span>
                                </div>
                                <span>•</span>
                                <div className="flex items-center gap-1.5">
                                    <Clock size={14} />
                                    <span>Wysłano: {new Date(execution.dataWyslania || execution.updatedAt).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-3 hover:bg-white rounded-2xl transition-all shadow-sm hover:shadow-md border border-transparent hover:border-gray-100 text-gray-400 hover:text-gray-900 group">
                            <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>

                    {/* Modal Body - Scrollable */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                        {/* Grid for Quick Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gray-50 rounded-[24px] p-6 border border-gray-100 space-y-3 shadow-sm">
                                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <Filter size={14} /> Szczegóły zadania
                                </h4>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Priorytet:</span>
                                        <span className={cn(
                                            "font-bold",
                                            task.priorytet === "WYSOKI" ? "text-red-500" :
                                                task.priorytet === "NISKI" ? "text-blue-500" : "text-gray-700"
                                        )}>{task.priorytet}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Termin oddania:</span>
                                        <span className="font-bold text-gray-700">{deadline ? deadline.toLocaleDateString() : "Brak"}</span>
                                    </div>
                                    {task.team && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500">Zespół:</span>
                                            <span className="px-3 py-1 bg-white rounded-lg border border-gray-100 shadow-sm font-bold text-gray-700 text-xs">{task.team.nazwa}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-[24px] p-6 border border-gray-100 space-y-3 shadow-sm">
                                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <CheckCircle size={14} /> Status zgłoszenia
                                </h4>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Obecny stan:</span>
                                        <span className="font-bold text-gray-700 uppercase tracking-tight">{tabType}</span>
                                    </div>
                                    {execution.poprawione && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500">Po poprawce:</span>
                                            <span className="bg-emerald-500 text-white px-2 py-0.5 rounded-full text-[9px] font-black uppercase">TAK</span>
                                        </div>
                                    )}
                                    {execution.terminPoprawki && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-red-500 font-bold">Termin poprawki:</span>
                                            <span className="font-bold text-red-500">{new Date(execution.terminPoprawki).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Task Description & Attachments */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {task.opis && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-4">
                                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest pl-1">Instrukcja do zadania</h4>
                                    <div className="bg-blue-50/50 rounded-[24px] p-6 border border-blue-100/50 text-gray-700 text-base leading-relaxed h-full">
                                        {task.opis}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3 animate-in fade-in slide-in-from-top-4">
                                <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest pl-1">Załączniki</h4>
                                <div className="bg-gray-50/50 rounded-[24px] p-6 border border-gray-100 flex-1 h-full min-h-[100px]">
                                    {task.attachments && task.attachments.length > 0 ? (
                                        <div className="space-y-2">
                                            {task.attachments.map((att: any) => (
                                                <a
                                                    key={att.id}
                                                    href={att.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl text-sm font-bold text-gray-700 hover:text-primary transition-all shadow-sm hover:shadow-md"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                                        <ExternalLink size={14} />
                                                    </div>
                                                    {att.nazwa}
                                                </a>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-xs text-muted-foreground italic">
                                            Brak załączników
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* User Response - The Core Content */}
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
                            <div className="flex justify-between items-end">
                                <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest pl-1">Odpowiedź uczestnika</h4>
                                <span className="text-[10px] font-bold text-muted-foreground bg-gray-100 px-3 py-1 rounded-full">{execution.user?.imieNazwisko}</span>
                            </div>
                            <div className="bg-white rounded-[32px] p-8 border-2 border-gray-100 text-lg text-gray-800 leading-relaxed shadow-inner min-h-[200px]">
                                {(task.submissions?.find((s: any) => s.userId === execution.userId)?.opis) || execution.odpowiedz || <span className="italic text-gray-300">Brak treści odpowiedzi uczestnika...</span>}
                            </div>
                        </div>

                        {/* Rejection Notes */}
                        {execution.uwagiOdrzucenia && (
                            <div className="space-y-3 animate-in fade-in zoom-in-95">
                                <h4 className="text-xs font-black text-red-500 uppercase tracking-widest pl-1">Uwagi do poprawy</h4>
                                <div className="bg-red-50 rounded-[24px] p-6 border border-red-100 text-red-800 italic text-base">
                                    "{execution.uwagiOdrzucenia}"
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Modal Footer - Actions */}
                    <div className="p-8 border-t border-gray-100 bg-gray-50/80 backdrop-blur-md flex gap-4">
                        {tabType === "oczekujace" ? (
                            <>
                                <button
                                    onClick={() => onApprove(task.id, execution.userId)}
                                    className="flex-1 py-5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-[24px] transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-200 hover:-translate-y-1"
                                >
                                    <CheckCircle size={24} /> Zatwierdź zgłoszenie
                                </button>
                                <button
                                    onClick={() => onReject(task, execution.userId)}
                                    className="flex-1 py-5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-[24px] transition-all flex items-center justify-center gap-3 shadow-xl shadow-red-200 hover:-translate-y-1"
                                >
                                    <X size={24} /> Odrzuć do poprawy
                                </button>
                            </>
                        ) : (
                            <div className="w-full flex justify-between items-center bg-white p-4 rounded-[24px] border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-3 px-4">
                                    <div className={cn(
                                        "p-2 rounded-xl text-white",
                                        tabType === "zaakceptowane" ? "bg-emerald-500" : "bg-red-500"
                                    )}>
                                        {tabType === "zaakceptowane" ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Status końcowy</p>
                                        <p className={cn(
                                            "text-lg font-bold leading-none",
                                            tabType === "zaakceptowane" ? "text-emerald-600" : "text-red-600"
                                        )}>
                                            {tabType === "zaakceptowane" ? "Zatwierdzono" : "Odrzucono do poprawy"}
                                        </p>
                                    </div>
                                </div>

                                {tabType === "zaakceptowane" && (<>
                                    <button
                                        onClick={async () => {
                                            if (confirm("Czy na pewno chcesz trwale usunąć to zgłoszenie? Tej operacji nie można cofnąć.")) {
                                                await deleteTaskExecution(task.id, execution.userId);
                                                onClose();
                                            }
                                        }}
                                        className="px-6 py-4 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-2xl transition-all flex items-center gap-2 border border-red-100"
                                    >
                                        <Trash2 size={20} /> Usuń trwale
                                    </button>
                                    {isAdmin && (
                                        <button
                                            onClick={onArchive}
                                            className="px-6 py-4 bg-gray-900 text-white font-bold rounded-2xl transition-all flex items-center gap-2 hover:bg-gray-800"
                                        >
                                            <Archive size={20} /> Archiwizuj
                                        </button>
                                    )}
                                </>)}
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
