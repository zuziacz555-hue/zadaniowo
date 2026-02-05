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
    Folder
} from "lucide-react";
import { closeTaskGlobally, rejectTaskWork, deleteTask, approveTaskWork, deleteTaskExecution } from "@/lib/actions/tasks";
import { useRouter } from "next/navigation";

export default function SubmissionsClient({ initialTasks, teams = [], isAdmin, onRefresh }: { initialTasks: any[], teams?: any[], isAdmin: boolean, onRefresh: () => void }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("OCZEKUJACE");
    const [selectedTeam, setSelectedTeam] = useState<number | null>(teams[0]?.id || null);

    const tasks = initialTasks;

    // Filter based on ADMIN VIEW (Selected Team)
    const displayedTasks = isAdmin && selectedTeam
        ? tasks.filter(t => t.teamId === selectedTeam)
        : tasks;

    // Filter executions across displayed tasks based on their status
    const getFilteredSubmissions = () => {
        const results: any[] = [];
        displayedTasks.forEach(task => {
            const relevantExecutions = task.executions.filter((ex: any) => ex.status === activeTab);
            if (relevantExecutions.length > 0) {
                results.push({ ...task, activeExecutions: relevantExecutions });
            }
        });
        return results;
    };

    const filteredTasks = getFilteredSubmissions();

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
                                <Folder size={20} className="text-primary" /> Zespoły
                            </h2>
                            {teams.map((team: any) => {
                                // Count pending submissions for this team
                                const teamTasks = tasks.filter(t => t.teamId === team.id);
                                const pendingCount = teamTasks.reduce((acc, t) => {
                                    return acc + t.executions.filter((ex: any) => ex.status === "OCZEKUJACE").length;
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
                                {filteredTasks.length > 0 ? (
                                    filteredTasks.map(task => (
                                        <motion.div
                                            key={task.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="lux-card overflow-hidden border border-gray-100 shadow-md group"
                                        >
                                            <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                                                <div className="flex flex-wrap justify-between items-start gap-6">
                                                    <div className="space-y-4 flex-1">
                                                        <div className="flex flex-wrap gap-3 items-center">
                                                            <h2 className="text-2xl font-bold text-gray-900">{task.tytul}</h2>
                                                            <span className="lux-chip bg-primary/10 text-primary border-primary/20">{task.team?.nazwa || "Zadanie ogólne"}</span>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl italic">"{task.opis || "Brak opisu dodatkowego."}"</p>
                                                    </div>
                                                    <div className="flex flex-wrap gap-4">
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Termin</span>
                                                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
                                                                <Calendar size={14} className="text-primary" />
                                                                <span className="text-sm font-bold">{task.termin ? new Date(task.termin).toLocaleDateString() : "Bez terminu"}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Priorytet</span>
                                                            <div className={cn(
                                                                "px-4 py-2 rounded-xl text-sm font-bold border shadow-sm",
                                                                task.priorytet === 'WYSOKI' ? "bg-red-50 text-red-600 border-red-100" : "bg-blue-50 text-blue-600 border-blue-100"
                                                            )}>
                                                                {task.priorytet}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-8 pt-6 border-t border-gray-100 flex flex-wrap items-center gap-6">
                                                    <div className="flex items-center gap-2">
                                                        <Users size={16} className="text-muted-foreground" />
                                                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                                            Przypisanie: {task.typPrzypisania === 'WSZYSCY' ? "Cały zespół" : "Wybrane osoby"}
                                                        </span>
                                                    </div>
                                                    {task.typPrzypisania === 'OSOBY' && (
                                                        <div className="flex gap-1.5">
                                                            {task.assignments?.map((a: any) => (
                                                                <span key={a.id} className="text-[10px] bg-white border border-gray-200 px-2.5 py-1 rounded-lg font-bold text-gray-600">
                                                                    {a.user.imieNazwisko}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="p-8 space-y-6">
                                                <h4 className="text-xs font-black uppercase text-primary tracking-[0.2em] mb-4">Zgłoszenia użytkowników:</h4>
                                                <div className="grid grid-cols-1 gap-4">
                                                    {task.activeExecutions.map((ex: any) => (
                                                        <div key={ex.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm transition-all hover:shadow-md group/ex">
                                                            {/* HEADER: User Info */}
                                                            <div className="flex justify-between items-start mb-6">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-base">
                                                                        {ex.imieNazwisko[0]}
                                                                    </div>
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <p className="font-bold text-gray-900">{ex.imieNazwisko}</p>
                                                                            {ex.poprawione && (
                                                                                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                                                                                    Poprawione
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-xs text-muted-foreground">
                                                                            Przesłano: {new Date(ex.dataOznaczenia).toLocaleString()}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {ex.terminPoprawki && (
                                                                    <div className="text-right">
                                                                        <span className="text-[10px] font-black uppercase text-red-500 tracking-widest block">Termin poprawy</span>
                                                                        <span className="text-xs font-bold text-red-700">{new Date(ex.terminPoprawki).toLocaleDateString()}</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* BODY: Content */}
                                                            <div className="pl-14 mb-6">
                                                                <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-medium">
                                                                    {task.submissions.find((s: any) => s.userId === ex.userId)?.opis || <span className="text-muted-foreground italic">Brak opisu wykonania.</span>}
                                                                </div>

                                                                {/* Rejection Feedback Display */}
                                                                {ex.status === "ODRZUCONE" && ex.uwagiOdrzucenia && (
                                                                    <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-100">
                                                                        <p className="text-[10px] font-black uppercase text-red-600 tracking-widest mb-1">Twoje uwagi:</p>
                                                                        <p className="text-sm font-medium text-red-900">{ex.uwagiOdrzucenia}</p>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* FOOTER: Actions */}
                                                            <div className="pl-14 pt-4 border-t border-gray-100 flex flex-wrap gap-3 justify-end items-center">
                                                                {(activeTab === "OCZEKUJACE" || activeTab === "ZAAKCEPTOWANE") && (
                                                                    <>
                                                                        {rejectionMode?.taskId === task.id && rejectionMode?.userId === ex.userId ? (
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
                                                                                {activeTab === "ZAAKCEPTOWANE" ? (
                                                                                    <button
                                                                                        onClick={async () => {
                                                                                            if (confirm("Cofnąć akceptację?")) {
                                                                                                await deleteTaskExecution(task.id, ex.userId);
                                                                                                if (onRefresh) onRefresh();
                                                                                            }
                                                                                        }}
                                                                                        className="text-xs font-bold text-muted-foreground hover:text-red-500 px-3 py-2 flex items-center gap-1 transition-colors"
                                                                                    >
                                                                                        <Trash2 size={14} /> Cofnij
                                                                                    </button>
                                                                                ) : (
                                                                                    <>
                                                                                        <button
                                                                                            onClick={() => handleRejectClick(task.id, ex.userId)}
                                                                                            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-bold text-xs hover:bg-gray-50 hover:border-red-200 hover:text-red-600 transition-all"
                                                                                        >
                                                                                            Do poprawy
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => handleAccept(task.id, ex.userId)}
                                                                                            className="px-6 py-2 bg-black text-white rounded-lg font-bold text-xs hover:bg-gray-800 shadow-sm hover:shadow transition-all flex items-center gap-2"
                                                                                        >
                                                                                            <CheckCircle2 size={14} /> Zaakceptuj
                                                                                        </button>
                                                                                    </>
                                                                                )}
                                                                            </>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
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
