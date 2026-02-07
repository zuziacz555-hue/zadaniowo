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
                        {onApprove && onReject && tabType === "oczekujace" ? (
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

                                <div className="flex gap-2">
                                    {tabType === "zaakceptowane" && onArchive && isAdmin && (
                                        <button
                                            onClick={onArchive}
                                            className="px-6 py-4 bg-gray-900 text-white font-bold rounded-2xl transition-all flex items-center gap-2 hover:bg-gray-800"
                                        >
                                            <Archive size={20} /> Archiwizuj
                                        </button>
                                    )}

                                    {onUnarchive && (
                                        <button
                                            onClick={onUnarchive}
                                            className="px-6 py-4 bg-amber-50 hover:bg-amber-100 text-amber-600 font-bold rounded-2xl transition-all flex items-center gap-2 border border-amber-100"
                                        >
                                            <Archive size={20} className="rotate-180" /> Usuń z archiwum
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
                                            className="px-6 py-4 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-2xl transition-all flex items-center gap-2 border border-red-100"
                                        >
                                            <Trash2 size={20} /> Usuń trwale
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
