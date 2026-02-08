"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, Filter, CheckCircle, ExternalLink, AlertTriangle, Trash2, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteTaskExecution } from "@/lib/actions/tasks";

interface ExecutionDetailModalProps {
    execution: any;
    onClose: () => void;
    onApprove?: (taskId: number, userId: number) => void;
    onReject?: (task: any, userId: number) => void;
    isAdmin?: boolean;
    onArchive?: () => void;
    onUnarchive?: () => void;
}

export default function ExecutionDetailModal({
    execution,
    onClose,
    onApprove,
    onReject,
    isAdmin,
    onArchive,
    onUnarchive
}: ExecutionDetailModalProps) {
    if (!execution) return null;
    const task = execution.task;
    const tabType = execution.tabType || execution.status.toLowerCase();
    const deadline = task.termin ? new Date(task.termin) : null;
    const isOverdue = deadline && deadline < new Date() && task.status === "AKTYWNE";

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 md:p-10">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-[20px]"
                    onClick={onClose}
                />

                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="lux-card-strong w-full max-w-4xl max-h-[90vh] p-0 relative overflow-hidden flex flex-col border-white/40"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Modal Header */}
                    <div className="p-10 pb-4">
                        <div className="flex justify-between items-start gap-6 mb-6">
                            <div className="space-y-3">
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className={cn(
                                        "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border border-white/60",
                                        tabType === "oczekujace" ? "bg-amber-500 text-white" :
                                            tabType === "zaakceptowane" ? "bg-emerald-600 text-white" :
                                                "bg-red-600 text-white"
                                    )}>
                                        {tabType === "oczekujace" ? "Oczekuje na weryfikację" :
                                            tabType === "zaakceptowane" ? "Zatwierdzone" : "Do poprawy"}
                                    </span>
                                    {isOverdue && tabType === "oczekujace" && (
                                        <span className="bg-red-600 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase shadow-lg shadow-red-200 animate-pulse">
                                            PO TERMINIE
                                        </span>
                                    )}
                                </div>
                                <h2 className="text-4xl font-black gradient-text tracking-tighter leading-none">{task.tytul}</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="size-12 bg-white/60 text-muted-foreground/30 hover:text-red-600 rounded-2xl border border-white/60 transition-all flex items-center justify-center hover:rotate-90 hover:scale-110"
                            >
                                <X size={28} />
                            </button>
                        </div>

                        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                            <div className="flex items-center gap-2 bg-white/60 px-3 py-2 rounded-xl border border-white">
                                <div className="size-6 rounded-full lux-gradient flex items-center justify-center text-white text-[9px]">
                                    {execution.user?.imieNazwisko?.[0]}
                                </div>
                                <span className="text-gray-800">{execution.user?.imieNazwisko}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/40 px-3 py-2 rounded-xl border border-white/40">
                                <Clock size={14} className="text-primary" />
                                <span>Wysłano: {new Date(execution.dataWyslania || execution.updatedAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Modal Body */}
                    <div className="flex-1 overflow-y-auto p-10 pt-6 space-y-10 custom-scrollbar">
                        {/* Task Instructions */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase text-primary/40 tracking-widest ml-1">Wyzwanie od koordynatora</h4>
                            <div className="bg-white/80 rounded-[40px] p-10 border-2 border-white/60 text-lg font-medium text-foreground leading-relaxed shadow-xl shadow-primary/5 min-h-[250px] relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-2 h-full bg-primary/20" />
                                {(task.submissions?.find((s: any) => s.userId === execution.userId)?.opis) || execution.odpowiedz || <span className="italic text-gray-300">Uczestniczka nie podała treści odpowiedzi...</span>}
                            </div>
                        </div>

                        {/* Middle Section: Info & Attachments */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Info Card */}
                            <div className="bg-white/40 border border-white/60 rounded-[32px] p-8 shadow-sm space-y-6">
                                <h4 className="text-[10px] font-black text-primary/40 uppercase tracking-widest flex items-center gap-2">
                                    <Filter size={14} /> Specyfikacja
                                </h4>
                                <div className="space-y-4">
                                    {[
                                        { label: "Priorytet", val: task.priorytet, color: task.priorytet === "WYSOKI" ? "text-red-600" : "text-primary" },
                                        { label: "Termin", val: deadline ? deadline.toLocaleDateString() : "Brak", color: "text-gray-800" },
                                        { label: "Zespół", val: task.team?.nazwa, color: "text-gray-800", isBadge: true }
                                    ].map((item, i) => (
                                        <div key={i} className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest border-b border-white pb-3 last:border-0">
                                            <span className="text-muted-foreground/40">{item.label}</span>
                                            {item.isBadge ? (
                                                <span className="px-3 py-1 bg-white rounded-lg border border-white shadow-sm text-primary">{item.val}</span>
                                            ) : (
                                                <span className={item.color}>{item.val}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Attachments Card */}
                            <div className="bg-white/40 border border-white/60 rounded-[32px] p-8 shadow-sm space-y-6 flex flex-col">
                                <h4 className="text-[10px] font-black text-primary/40 uppercase tracking-widest flex items-center gap-2">
                                    <ExternalLink size={14} /> Materiały
                                </h4>
                                <div className="flex-1 min-h-[120px]">
                                    {task.attachments && task.attachments.length > 0 ? (
                                        <div className="grid grid-cols-1 gap-2">
                                            {task.attachments.map((att: any) => (
                                                <a
                                                    key={att.id}
                                                    href={att.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-3 p-3 bg-white/80 border border-white/60 rounded-2xl text-[10px] font-black uppercase text-gray-700 hover:text-primary transition-all hover:translate-x-1"
                                                >
                                                    <div className="size-8 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                                                        <ExternalLink size={14} />
                                                    </div>
                                                    <span className="truncate">{att.nazwa}</span>
                                                </a>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full opacity-20 py-8 grayscale">
                                            <ExternalLink size={32} />
                                            <p className="text-[9px] font-black uppercase mt-2">Brak załączników</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Rejection Notes */}
                        {execution.uwagiOdrzucenia && (
                            <div className="space-y-4 animate-in fade-in zoom-in-95">
                                <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-1">Komentarz koordynatora</h4>
                                <div className="bg-red-50/50 rounded-[32px] p-10 border-2 border-red-100/50 text-red-900 italic text-lg leading-relaxed shadow-xl shadow-red-500/5">
                                    "{execution.uwagiOdrzucenia}"
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Modal Footer Actions */}
                    <div className="p-10 border-t border-white/40 bg-white/40 backdrop-blur-md flex gap-4">
                        {onApprove && onReject && tabType === "oczekujace" ? (
                            <>
                                <button
                                    onClick={() => onApprove(task.id, execution.userId)}
                                    className="flex-[2] py-6 lux-btn bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                                >
                                    <CheckCircle size={24} /> Zatwierdź zgłoszenie
                                </button>
                                <button
                                    onClick={() => onReject(task, execution.userId)}
                                    className="flex-1 py-6 lux-btn bg-white text-red-600 border-red-100 hover:bg-red-50 shadow-red-100"
                                >
                                    <X size={24} /> Odrzuć
                                </button>
                            </>
                        ) : (
                            <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-6 bg-white/60 p-6 rounded-[32px] border border-white shadow-xl">
                                <div className="flex items-center gap-4 px-4">
                                    <div className={cn(
                                        "size-12 rounded-2xl flex items-center justify-center text-white shadow-lg",
                                        tabType === "zaakceptowane" ? "bg-emerald-600" : "bg-red-600"
                                    )}>
                                        {tabType === "zaakceptowane" ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest mb-1">Status końcowy</p>
                                        <p className={cn(
                                            "text-xl font-black uppercase tracking-tight",
                                            tabType === "zaakceptowane" ? "text-emerald-700" : "text-red-700"
                                        )}>
                                            {tabType === "zaakceptowane" ? "Zatwierdzono" : "Do poprawy"}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-2 w-full sm:w-auto">
                                    {tabType === "zaakceptowane" && onArchive && isAdmin && (
                                        <button
                                            onClick={onArchive}
                                            className="flex-1 sm:flex-none px-8 py-5 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-3 hover:bg-primary shadow-xl shadow-gray-200"
                                        >
                                            <Archive size={20} /> Archiwizuj
                                        </button>
                                    )}

                                    {onUnarchive && (
                                        <button
                                            onClick={onUnarchive}
                                            className="flex-1 sm:flex-none px-8 py-5 bg-amber-50 hover:bg-amber-100 text-amber-600 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-3 border border-amber-100"
                                        >
                                            <Archive size={20} className="rotate-180" /> Przywróć z archiwum
                                        </button>
                                    )}

                                    {isAdmin && (
                                        <button
                                            onClick={async () => {
                                                if (confirm("Czy na pewno chcesz trwale usunąć to zgłoszenie? Tej operacji nie można cofnąć.")) {
                                                    await deleteTaskExecution(task.id, execution.userId);
                                                    onClose();
                                                }
                                            }}
                                            className="flex-1 sm:flex-none px-6 py-5 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-3 border border-red-100"
                                            title="Usuń trwale"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
