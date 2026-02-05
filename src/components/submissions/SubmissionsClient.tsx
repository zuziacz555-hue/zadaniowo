"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
    CheckCircle2,
    XCircle,
    Clock,
    Users,
    Trash2,
    RefreshCcw,
    MessageSquare,
    AlertTriangle,
    Calendar,
    X,
    Folder,
    UserCog,
    ChevronDown
} from "lucide-react";
import { closeTaskGlobally, rejectTaskWork, deleteTask, approveTaskWork, deleteTaskExecution } from "@/lib/actions/tasks";
import { useRouter } from "next/navigation";

export default function SubmissionsClient({ initialTasks, teams = [], isAdmin, onRefresh }: { initialTasks: any[], teams?: any[], isAdmin: boolean, onRefresh: () => void }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("OCZEKUJACE");
    const [selectedTeam, setSelectedTeam] = useState<number | null>(teams[0]?.id || null);

    const tasks = initialTasks;

    // Unified filtering logic
    const getFilteredSubmissions = () => {
        const results: any[] = [];

        tasks.forEach(task => {
            // Apply team filter for Admin (if not in "Coordinator Tasks" folder)
            if (isAdmin && selectedTeam && selectedTeam !== -1 && task.teamId !== selectedTeam) {
                return;
            }

            const relevantExecutions = task.executions.filter((ex: any) => {
                // 1. Status check
                if (ex.status !== activeTab) return false;

                // 2. Determine submitter's role in the specific team (or global role for global tasks)
                const userTeamRole = task.teamId
                    ? ex.user?.zespoly?.find((ut: any) => ut.teamId === task.teamId)?.rola
                    : ex.user?.rola;
                const isSubmitterCoord = userTeamRole?.toUpperCase() === "KOORDYNATORKA";

                if (isAdmin) {
                    if (selectedTeam === -1) {
                        // "Zadania koordynatorek" folder: Show ONLY coordinator submissions
                        return isSubmitterCoord;
                    } else {
                        // Team folder: Show ONLY participant submissions
                        return !isSubmitterCoord;
                    }
                } else {
                    // Regular Coordinator view: Show ONLY participant submissions
                    return !isSubmitterCoord;
                }
            });

            if (relevantExecutions.length > 0) {
                results.push({ ...task, activeExecutions: relevantExecutions });
            }
        });
        return results;
    };

    const filteredTasks = getFilteredSubmissions();

    // Flatten executions to display as individual cards
    const flatExecutions = filteredTasks.flatMap((t: any) =>
        t.activeExecutions.map((ex: any) => ({ ...ex, task: t }))
    );

    const [rejectionMode, setRejectionMode] = useState<{ taskId: number, userId: number } | null>(null);
    const [rejectionNote, setRejectionNote] = useState("");
    const [rejectionDeadline, setRejectionDeadline] = useState("");

    const handleAccept = async (taskId: number, userId: number) => {
        const res = await approveTaskWork(taskId, userId);
        if (res.success) {
            onRefresh();
        }
    };

    const handleRejectClick = (taskId: number, userId: number) => {
        setRejectionMode({ taskId, userId });
        setRejectionNote("");
        setRejectionDeadline("");
    };

    const submitRejection = async () => {
        if (!rejectionMode) return;

        // Default message if empty? User said "miejsce do wpisania opisu", so let's allow empty or require it.
        // Assuming user wants to write something.
        const note = rejectionNote.trim() || "Wymaga poprawek.";
        const deadlineDate = rejectionDeadline ? new Date(rejectionDeadline) : null;

        const res = await rejectTaskWork(rejectionMode.taskId, rejectionMode.userId, note, deadlineDate);
        if (res.success) {
            setRejectionMode(null);
            setRejectionNote("");
            setRejectionDeadline("");
            onRefresh();
        }
    };

    const cancelRejection = () => {
        setRejectionMode(null);
        setRejectionNote("");
        setRejectionDeadline("");
    };

    return (
        <DashboardLayout>
            <div className="space-y-10 animate-slide-in">
                {/* Header Section */}
                <div className="lux-card-strong p-12 text-center relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-2 h-full gradient-bg" />
                    <h1 className="text-4xl font-bold gradient-text mb-3">Do sprawdzenia</h1>
                    <p className="text-muted-foreground text-lg">Weryfikuj postępy i dbaj o jakość realizacji zadań.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT COLUMN: TEAMS (ADMIN ONLY) */}
                    {isAdmin && (
                        <div className="lg:col-span-1 space-y-4">
                            <h2 className="text-xl font-bold text-foreground/80 mb-4 flex items-center gap-2 px-2">
                                <Folder size={20} className="text-primary" /> Foldery
                            </h2>

                            {/* Coordinator Tasks Virtual Folder */}
                            <button
                                onClick={() => setSelectedTeam(-1)}
                                className={cn(
                                    "w-full text-left p-6 rounded-[28px] transition-all flex items-center justify-between border-2",
                                    selectedTeam === -1 ? "bg-white shadow-xl border-primary/20" : "bg-white border-transparent hover:border-gray-100 shadow-sm"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg", selectedTeam === -1 ? "lux-gradient" : "bg-gray-100 text-gray-400")}>
                                        <UserCog size={22} className={cn(selectedTeam === -1 ? "text-white" : "text-gray-400")} />
                                    </div>
                                    <div>
                                        <span className="font-bold text-gray-800 block">Zadania koordynatorek</span>
                                        <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">
                                            Realizacje osobiste
                                        </span>
                                    </div>
                                </div>
                                {activeTab === "OCZEKUJACE" && (
                                    <div className="w-8 h-8 flex items-center justify-center bg-primary/10 text-primary rounded-full font-bold text-xs">
                                        {tasks.reduce((acc, t) => acc + t.executions.filter((ex: any) => {
                                            const role = ex.user?.zespoly?.find((ut: any) => ut.teamId === t.teamId)?.rola;
                                            return ex.status === "OCZEKUJACE" && role === "KOORDYNATORKA";
                                        }).length, 0)}
                                    </div>
                                )}
                            </button>

                            <div className="h-px bg-gray-100 my-4 mx-6" />
                            <h2 className="text-xl font-bold text-foreground/80 mb-4 flex items-center gap-2 px-2">
                                <Users size={20} className="text-primary" /> Zespoły
                            </h2>
                            {teams.map((team: any) => {
                                // Count pending submissions for this team (PARTICIPANTS ONLY)
                                const teamTasks = tasks.filter(t => t.teamId === team.id);
                                const pendingCount = teamTasks.reduce((acc, t) => {
                                    return acc + t.executions.filter((ex: any) => {
                                        const role = ex.user?.zespoly?.find((ut: any) => ut.teamId === t.teamId)?.rola;
                                        return ex.status === "OCZEKUJACE" && role !== "KOORDYNATORKA";
                                    }).length;
                                }, 0);

                                return (
                                    <button
                                        key={team.id}
                                        onClick={() => setSelectedTeam(team.id)}
                                        className={cn(
                                            "w-full text-left p-6 rounded-[28px] transition-all flex items-center justify-between border-2",
                                            selectedTeam === team.id ? "bg-white shadow-xl border-primary/20" : "bg-white border-transparent hover:border-gray-100 shadow-sm"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div
                                                className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all", selectedTeam === team.id ? "scale-105" : "bg-gray-100 text-gray-400")}
                                                style={selectedTeam === team.id ? { backgroundColor: team.kolor || '#5400FF', background: `linear-gradient(135deg, ${team.kolor || '#5400FF'} 0%, ${team.kolor ? team.kolor + 'dd' : '#704df5'} 100%)` } : {}}
                                            >
                                                <Folder size={22} style={selectedTeam !== team.id ? { color: team.kolor || '#9ca3af' } : {}} />
                                            </div>
                                            <div>
                                                <span className="font-bold text-gray-800 block">{team.nazwa}</span>
                                                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">
                                                    {pendingCount} do weryfikacji
                                                </span>
                                            </div>
                                        </div>
                                        {pendingCount > 0 && activeTab === "OCZEKUJACE" && (
                                            <div className="w-8 h-8 flex items-center justify-center bg-orange-100 text-orange-600 rounded-full font-bold text-xs">
                                                {pendingCount}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* RIGHT COLUMN: TASKS CONTENT */}
                    <div className={cn("space-y-8", isAdmin ? "lg:col-span-2" : "lg:col-span-3")}>
                        {/* Status Tabs */}
                        <div className="flex gap-4 p-2 bg-white rounded-3xl shadow-sm border border-gray-100 max-w-fit">
                            {[
                                { id: "OCZEKUJACE", label: "Oczekujące", icon: Clock, color: "text-amber-500" },
                                { id: "ZAAKCEPTOWANE", label: "Zaakceptowane", icon: CheckCircle2, color: "text-emerald-500" },
                                { id: "ODRZUCONE", label: "Do poprawy", icon: RefreshCcw, color: "text-red-500" }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex items-center gap-3 px-8 py-4 rounded-2xl font-bold transition-all",
                                        activeTab === tab.id
                                            ? "bg-gray-900 text-white shadow-xl scale-105"
                                            : "text-muted-foreground hover:bg-gray-50"
                                    )}
                                >
                                    <tab.icon size={20} className={activeTab === tab.id ? "text-white" : tab.color} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* LIST */}
                        <div className="space-y-8">
                            <AnimatePresence mode="popLayout">
                                {flatExecutions.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {flatExecutions.map((exec: any) => (
                                            <CollapsibleExecutionCard
                                                key={exec.id}
                                                execution={exec}
                                                onApprove={handleAccept}
                                                onReject={handleRejectClick}
                                                isAdmin={isAdmin}
                                                tabType={activeTab}
                                                rejectionMode={rejectionMode}
                                                rejectionNote={rejectionNote}
                                                setRejectionNote={setRejectionNote}
                                                rejectionDeadline={rejectionDeadline}
                                                setRejectionDeadline={setRejectionDeadline}
                                                submitRejection={submitRejection}
                                                cancelRejection={cancelRejection}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-white p-20 rounded-[40px] text-center border-2 border-dashed border-gray-100">
                                        <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-6">
                                            <CheckCircle2 size={40} className="text-gray-200" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-400 uppercase tracking-[0.2em]">Brak zadań {activeTab.toLowerCase()}</h3>
                                        {isAdmin && !selectedTeam && <p className="mt-2 text-sm text-muted-foreground">Wybierz zespół z listy, aby zobaczyć szczegóły.</p>}
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

// Collapsible Verification Card for specific Execution (Tabbed View)
function CollapsibleExecutionCard({
    execution,
    onApprove,
    onReject,
    isAdmin,
    tabType,
    // Rejection props
    rejectionMode,
    rejectionNote,
    setRejectionNote,
    rejectionDeadline,
    setRejectionDeadline,
    submitRejection,
    cancelRejection
}: any) {
    const [isExpanded, setIsExpanded] = useState(false);
    const task = execution.task;

    const deadline = task.termin ? new Date(task.termin) : null;
    const isOverdue = deadline && deadline < new Date() && task.status === "AKTYWNE";

    // Check if rejection form is active for this card
    const isRejectionActive = rejectionMode?.taskId === task.id && rejectionMode?.userId === execution.userId;

    // Auto-expand if rejection is active
    if (isRejectionActive && !isExpanded) {
        setIsExpanded(true);
    }

    // Dynamic styles based on tab/status
    const statusColor =
        tabType === "OCZEKUJACE" ? "amber" :
            tabType === "ZAAKCEPTOWANE" ? "emerald" : "red";

    const StatusIcon =
        tabType === "OCZEKUJACE" ? Clock :
            tabType === "ZAAKCEPTOWANE" ? CheckCircle2 : AlertTriangle;

    return (
        <motion.div
            layout
            className={cn(
                "rounded-[20px] overflow-hidden transition-all cursor-pointer border-2",
                isExpanded
                    ? `bg-white shadow-xl border-${statusColor}-500/20`
                    : `bg-gradient-to-br from-${statusColor}-50 to-white border-${statusColor}-100 hover:border-${statusColor}-300 shadow-sm hover:shadow-md`,
                // Overdue styling only for pending
                tabType === "OCZEKUJACE" && isOverdue && !isExpanded && "from-red-50 to-red-100 border-red-200/50"
            )}
            onClick={() => setIsExpanded(!isExpanded)}
        >
            {/* Collapsed View - Small Tile */}
            <div className={cn("p-4 flex items-center justify-between gap-3", isExpanded && `border-b border-gray-100 bg-${statusColor}-50/30`)}>
                <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-sm",
                        tabType === "OCZEKUJACE" ? (isOverdue ? "bg-red-500" : "bg-amber-500") :
                            tabType === "ZAAKCEPTOWANE" ? "bg-emerald-500" : "bg-red-500"
                    )}>
                        <StatusIcon size={18} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-baseline gap-2 mb-0.5">
                            <h4 className="font-bold text-gray-900 truncate text-sm">{task.tytul}</h4>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            <span>{execution.imieNazwisko || execution.user?.imieNazwisko}</span>
                            {execution.terminPoprawki && tabType === "ODRZUCONE" && (
                                <span className="text-red-500 flex items-center gap-1">
                                    <Clock size={10} /> Poprawa: {new Date(execution.terminPoprawki).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    className="text-gray-400 flex-shrink-0"
                >
                    <ChevronDown size={20} />
                </motion.div>
            </div>

            {/* Expanded View - Full Details */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-5 space-y-4 bg-white">
                            {/* Task & Exec Info */}
                            <div className="space-y-3">
                                <div className="flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-widest">
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-full border",
                                        task.priorytet === "WYSOKI" ? "bg-red-50 text-red-600 border-red-100" :
                                            task.priorytet === "NISKI" ? "bg-blue-50 text-blue-600 border-blue-100" :
                                                "bg-gray-50 text-gray-600 border-gray-100"
                                    )}>
                                        Priorytet: {task.priorytet}
                                    </span>
                                    {deadline && (
                                        <span className={cn("flex items-center gap-1", isOverdue ? "text-red-600" : "text-muted-foreground")}>
                                            <Clock size={9} />
                                            Termin: {deadline.toLocaleDateString()}
                                        </span>
                                    )}
                                    <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                        Wysłano: {new Date(execution.dataWyslania || execution.updatedAt).toLocaleString()}
                                    </span>
                                    <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                                        {task.team?.nazwa || "Ogólne"}
                                    </span>
                                </div>
                                {task.opis && (
                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Opis zadania</span>
                                        <p className="text-xs text-gray-600">{task.opis}</p>
                                    </div>
                                )}
                            </div>

                            {/* User Response */}
                            <div className="space-y-2">
                                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest pl-1">Odpowiedź uczestnika</p>
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-sm text-gray-800">
                                    {execution.odpowiedz ? execution.odpowiedz : <span className="italic text-gray-400">Brak opisu tekstowego</span>}
                                </div>
                            </div>

                            {/* Previous Rejection Notes (if any) */}
                            {execution.uwagiOdrzucenia && (
                                <div className="space-y-2">
                                    <p className="text-[9px] font-black uppercase text-red-400 tracking-widest pl-1">Uwagi odrzucenia</p>
                                    <div className="bg-red-50 rounded-xl p-4 border border-red-100 text-sm text-red-800 italic">
                                        "{execution.uwagiOdrzucenia}"
                                    </div>
                                </div>
                            )}

                            {/* Actions or Rejection Form */}
                            <div className="pt-2" onClick={(e) => e.stopPropagation()}>
                                {isRejectionActive ? (
                                    <div className="w-full bg-gray-50 p-4 rounded-xl border border-gray-200 animate-in fade-in slide-in-from-top-2">
                                        <p className="text-xs font-bold mb-2">Powód odrzucenia:</p>
                                        <textarea
                                            autoFocus
                                            className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 mb-2"
                                            rows={2}
                                            placeholder="Wpisz uwagi..."
                                            value={rejectionNote}
                                            onChange={(e) => setRejectionNote(e.target.value)}
                                        />
                                        <div className="flex gap-2 items-center mb-3">
                                            <span className="text-xs font-medium text-muted-foreground">Termin:</span>
                                            <input
                                                type="date"
                                                className="text-xs p-1 border rounded"
                                                value={rejectionDeadline}
                                                onChange={(e) => setRejectionDeadline(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <button onClick={cancelRejection} className="text-xs font-bold text-gray-500 px-3 py-1.5 hover:bg-gray-200 rounded">Anuluj</button>
                                            <button onClick={submitRejection} className="text-xs font-bold bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 shadow-sm">Wyślij uwagi</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {isAdmin && tabType === 'OCZEKUJACE' && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onApprove(task.id, execution.userId); }}
                                                    className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                                                >
                                                    <CheckCircle2 size={16} /> Akceptuj
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onReject(task.id, execution.userId); }}
                                                    className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-200"
                                                >
                                                    <X size={16} /> Odrzuć
                                                </button>
                                            </div>
                                        )}
                                        {isAdmin && tabType === 'ZAAKCEPTOWANE' && (
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (confirm("Cofnąć akceptację?")) {
                                                        await deleteTaskExecution(task.id, execution.userId);
                                                    }
                                                }}
                                                className="w-full py-2 bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                                            >
                                                <Trash2 size={14} /> Cofnij akceptację
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}


function StatCard({ icon, label, value, color }: any) {
    return (
        <motion.div whileHover={{ y: -5 }} className="lux-card p-6 flex items-center gap-6 group">
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110", color)}>
                {icon}
            </div>
            <div>
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{label}</h3>
                <p className="text-3xl font-bold gradient-text">{value}</p>
            </div>
        </motion.div>
    );
}

function Section({ title, count, accentColor, children }: any) {
    return (
        <div className="lux-card p-8 space-y-8">
            <div className={cn("flex justify-between items-center pb-6 border-b", accentColor)}>
                <h2 className="text-2xl font-bold text-foreground">{title}</h2>
                <span className="bg-gray-100 text-foreground px-4 py-1.5 rounded-full text-xs font-bold tracking-widest">{count} ZADAŃ</span>
            </div>
            <div className="space-y-6">
                {children}
            </div>
        </div>
    );
}

function TaskCard({ task, isAdmin, onAccept, onReject, onDelete }: any) {
    // Should be executed by at least one person? Or some other logic.
    // In original code there was 'powinno_wykonac'. In my schema I don't have that per task.
    // I'll just show executions count.
    const executionsCount = task.executions?.length || 0;
    const progress = 100; // Mocked or logic-based

    return (
        <div className={cn(
            "border-2 rounded-[20px] p-8 space-y-6 transition-all hover:translate-x-3 relative overflow-hidden",
            task.status === 'ZAAKCEPTOWANE' ? "border-green-200 bg-green-50/30" :
                task.status === 'ODRZUCONE' ? "border-red-200 bg-red-50/20" :
                    "border-gray-100 bg-white"
        )}>
            <div className={cn(
                "absolute left-0 top-0 w-2 h-full",
                task.status === 'ZAAKCEPTOWANE' ? "bg-green-500" :
                    task.status === 'ODRZUCONE' ? "bg-red-500" : "bg-primary"
            )} />

            <div className="flex justify-between items-start gap-6">
                <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap gap-2 items-center">
                        <h3 className="text-xl font-bold text-foreground">{task.tytul}</h3>
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm border border-gray-200">
                            {task.team?.nazwa || "Ogólne"}
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <span className="flex items-center gap-1.5 text-xs font-bold bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full shadow-sm">
                            <Clock size={14} /> Termin: {task.termin ? new Date(task.termin).toLocaleDateString() : "Brak"}
                        </span>
                        <span className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-bold tracking-widest shadow-sm",
                            task.priorytet === 'WYSOKI' ? "bg-red-50 text-red-600 animate-pulse border border-red-200" : "bg-blue-50 text-blue-600"
                        )}>
                            {task.priorytet}
                        </span>
                    </div>
                </div>
            </div>

            {/* Completed Users */}
            <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Users size={14} /> Zgłoszenia do weryfikacji:
                </h4>
                <div className="space-y-3">
                    {task.executions && task.executions.length > 0 ? (
                        task.executions.map((ex: any) => (
                            <div key={ex.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap justify-between items-center gap-4 transition-all hover:bg-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white",
                                        ex.status === 'ZAAKCEPTOWANE' ? "bg-green-500" :
                                            ex.status === 'ODRZUCONE' ? "bg-red-500" : "bg-primary"
                                    )}>
                                        {ex.imieNazwisko[0]}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-gray-900">{ex.imieNazwisko}</p>
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "text-[8px] font-black uppercase tracking-widest",
                                                ex.status === 'ZAAKCEPTOWANE' ? "text-green-600" :
                                                    ex.status === 'ODRZUCONE' ? "text-red-600" : "text-amber-600"
                                            )}>
                                                {ex.status}
                                            </span>
                                            {ex.poprawione && <span className="text-[8px] bg-green-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest">PO POPRAWCE</span>}
                                            {ex.status === 'ODRZUCONE' && ex.terminPoprawki && (
                                                <span className="text-[9px] font-bold text-red-500 flex items-center gap-1">
                                                    <Clock size={10} />
                                                    Poprawa do: {new Date(ex.terminPoprawki).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {isAdmin && ex.status === 'OCZEKUJACE' && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => onAccept(task.id, ex.userId)}
                                            className="px-4 py-2 bg-green-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-600 shadow-sm transition-all"
                                        >
                                            <CheckCircle2 size={12} className="inline mr-1" /> Akceptuj
                                        </button>
                                        <button
                                            onClick={() => onReject(task.id, ex.userId)}
                                            className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 shadow-sm transition-all"
                                        >
                                            <RefreshCcw size={12} className="inline mr-1" /> Poprawa
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <span className="text-muted-foreground italic text-xs">Nikt jeszcze nie oznaczył wykonania</span>
                    )}
                </div>
            </div>

            {/* Submissions / Notes */}
            <div className="bg-white/50 border border-gray-100 p-6 rounded-2xl space-y-4 shadow-inner">
                <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                    <MessageSquare size={14} /> Najnowsze opisy wykonania
                </h4>
                <div className="space-y-3">
                    {task.submissions && task.submissions.length > 0 ? (
                        task.submissions.map((s: any) => (
                            <div key={s.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-2">
                                <div className="flex justify-between text-[10px] font-bold text-primary">
                                    <span>{s.imieNazwisko}</span>
                                    <span className="text-muted-foreground">{new Date(s.dataDodania).toLocaleString()}</span>
                                </div>
                                <p className="text-sm text-foreground font-medium leading-relaxed">{s.opis}</p>
                            </div>
                        ))
                    ) : (
                        <p className="text-muted-foreground italic text-xs">Brak opisów wykonania</p>
                    )}
                </div>
            </div>

            {/* Admin Actions */}
            {isAdmin && (
                <div className="pt-6 border-t border-gray-100 flex flex-wrap gap-3">
                    {task.status === 'AKTYWNE' && (
                        <button className="flex-1 lux-btn flex items-center justify-center gap-2" onClick={() => onAccept(task.id)}>
                            Zakończ zadanie globalnie
                        </button>
                    )}

                    <div className="w-full md:w-auto flex flex-1 gap-3 justify-end">
                        <button className="lux-btn-outline px-6 py-4" onClick={() => onDelete(task.id)}>
                            <Trash2 size={24} />
                        </button>
                    </div>
                </div>
            )}

            {isAdmin && task.status !== 'AKTYWNE' && (
                <div className="pt-6 border-t border-gray-100 flex justify-end">
                    <button className="lux-btn-outline px-4 py-2 text-xs" onClick={() => onDelete(task.id)}>
                        Usuń wpis
                    </button>
                </div>
            )}
        </div>
    );
}
