"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { cn, getContrastColor } from "@/lib/utils";
import {
    FileText,
    Folder,
    ChevronRight,
    Clock,
    AlertCircle,
    CheckCircle2,
    Calendar,
    X,
    Users,
    Plus,
    CheckSquare,
    Square,
    Trash2
} from "lucide-react";
import { createReport, updateReport, deleteReport } from "@/lib/actions/reports";
import { useRouter } from "next/navigation";

export default function ReportsClient({
    user,
    teamId,
    teams: initialTeams,
    reports: initialReports,
    meetingsWithoutReports: initialMeetingsWithoutReports,
    role,
    isCoord,
    isAdmin
}: any) {
    const router = useRouter();
    const [selectedTeam, setSelectedTeam] = useState<number>(teamId || (initialTeams[0]?.id));
    const [reports, setReports] = useState(initialReports);
    const [meetingsWithoutReports, setMeetingsWithoutReports] = useState(initialMeetingsWithoutReports);
    const [selectedReport, setSelectedReport] = useState<any>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Filter only teams where user is coordinator (or all for admin)
    const teams = useMemo(() => {
        if (isAdmin) return initialTeams;
        if (isCoord) return initialTeams.filter((t: any) => t.users.some((u: any) => u.userId === user.id && (u.rola === 'KOORDYNATOR' || u.rola === 'ADMIN')));
        return initialTeams.filter((t: any) => t.id === teamId);
    }, [initialTeams, isAdmin, isCoord, user.id, teamId]);

    useEffect(() => {
        setReports(initialReports);
        setMeetingsWithoutReports(initialMeetingsWithoutReports);
    }, [initialReports, initialMeetingsWithoutReports]);

    const checkDeadline = (date: Date) => {
        const now = new Date();
        const deadline = new Date(date);
        deadline.setDate(deadline.getDate() + 1); // 24h deadline
        return now > deadline;
    };

    const handleRefresh = () => {
        router.refresh();
    };

    const handleDeleteReport = async (reportId: number) => {
        if (!confirm("Czy na pewno chcesz trwale usunąć ten raport?")) return;

        const res = await deleteReport(reportId);
        if (res.success) {
            router.refresh();
            // onRefresh?.(); // Removed as handleRefresh handles router.refresh() 
            // but we might need to manually update local state if router.refresh is not enough or slow
            // For now assume router.refresh works. 
            // Actually, we should probably close the modal if deleted from modal
            setSelectedReport(null);
        } else {
            alert(res.error || "Wystąpił błąd podczas usuwania raportu.");
        }
    };


    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                            <span className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
                                <FileText size={32} />
                            </span>
                            Sprawozdania
                        </h1>
                        <p className="text-gray-500 mt-2 text-lg">Zarządzaj sprawozdaniami ze spotkań</p>
                    </div>
                </header>

                {isAdmin ? (
                    <AdminView
                        teams={teams}
                        reports={reports}
                        meetingsWithoutReports={meetingsWithoutReports}
                        onSelectTeam={setSelectedTeam}
                        selectedTeam={selectedTeam}
                        checkDeadline={checkDeadline}
                        onViewReport={setSelectedReport}
                        onDeleteReport={handleDeleteReport}
                    />
                ) : isCoord ? (
                    <CoordView
                        teams={teams}
                        reports={reports}
                        meetingsWithoutReports={meetingsWithoutReports}
                        onSelectTeam={setSelectedTeam}
                        selectedTeam={selectedTeam}
                        checkDeadline={checkDeadline}
                        onViewReport={setSelectedReport}
                        onAddReport={() => setIsAddModalOpen(true)}
                    />
                ) : (
                    <div className="text-center py-20 text-gray-400">Brak uprawnień do przeglądania tej sekcji.</div>
                )}

                {/* Report Details Modal */}
                <AnimatePresence>
                    {selectedReport && (
                        <ReportDetailsModal
                            report={selectedReport}
                            onClose={() => setSelectedReport(null)}
                            onDelete={isAdmin ? () => handleDeleteReport(selectedReport.id) : undefined}
                            isCoord={isCoord}
                            isAdmin={isAdmin}
                            onRefresh={handleRefresh}
                            teams={teams}
                        />
                    )}
                </AnimatePresence>

                {/* Add Report Modal (Initial Step - Select Meeting) */}
                <AnimatePresence>
                    {isAddModalOpen && (
                        <AddReportModal
                            meetings={meetingsWithoutReports.filter((m: any) => m.teamId === selectedTeam)}
                            onClose={() => setIsAddModalOpen(false)}
                            onRefresh={handleRefresh}
                            teams={teams}
                            user={user}
                        />
                    )}
                </AnimatePresence>
            </div>
        </DashboardLayout>
    );
}


function CoordView({ teams, reports, meetingsWithoutReports, onSelectTeam, selectedTeam, checkDeadline, onViewReport, onAddReport }: any) {
    const activeTeam = teams.find((t: any) => t.id === selectedTeam);
    const pendingMeetings = meetingsWithoutReports.filter((m: any) => m.teamId === selectedTeam && new Date(m.data) < new Date());

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Folder className="text-blue-500" /> Twoje Zespoły
                </h2>
                <div className="space-y-2">
                    {teams.map((team: any) => (
                        <button
                            key={team.id}
                            onClick={() => onSelectTeam(team.id)}
                            className={cn(
                                "w-full text-left p-4 rounded-2xl transition-all flex items-center justify-between group",
                                selectedTeam === team.id
                                    ? "bg-white shadow-md border-l-4 border-blue-500"
                                    : "bg-white/50 hover:bg-white hover:shadow-sm"
                            )}
                        >
                            <span className="font-semibold text-gray-700 group-hover:text-blue-600 transition-colors">
                                {team.nazwa}
                            </span>
                            {selectedTeam === team.id && <ChevronRight className="text-blue-500" />}
                        </button>
                    ))}
                </div>

                <div className="mt-8 p-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl text-white shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-transform cursor-pointer" onClick={onAddReport}>
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <FileText size={120} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Dodaj nowe sprawozdanie</h3>
                    <p className="opacity-90 mb-6 text-sm">Uzupełnij raporty z ostatnich spotkań</p>
                    <div className="bg-white/20 backdrop-blur-md p-3 rounded-xl inline-flex items-center gap-2 font-bold text-sm group-hover:bg-white/30 transition-colors">
                        <Plus size={18} /> Rozpocznij
                    </div>
                </div>
            </div>

            <div className="lg:col-span-2 space-y-8">
                {pendingMeetings.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2 px-2">
                            <h2 className="text-3xl font-bold text-red-500 flex items-center gap-4">
                                <AlertCircle size={32} /> Zaległe / Oczekujące
                            </h2>
                            <div className="h-1 w-16 bg-red-500/20 rounded-full" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {pendingMeetings.map((m: any) => (
                                <PendingReportCard key={m.id} meeting={m} checkDeadline={checkDeadline} />
                            ))}
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    <div className="flex flex-col gap-2 px-2">
                        <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-4">
                            <CheckCircle2 className="text-emerald-500" size={32} /> Wysłane sprawozdania
                        </h2>
                        <div className="h-1 w-16 bg-emerald-500/20 rounded-full" />
                    </div>
                    {reports.filter((r: any) => r.meeting.teamId === selectedTeam).length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {reports.filter((r: any) => r.meeting.teamId === selectedTeam).map((report: any) => (
                                <ReportCard key={report.id} report={report} onClick={() => onViewReport(report)} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-white/50 rounded-3xl border-2 border-dashed border-gray-200">
                            <p className="text-gray-400 font-medium">Brak wysłanych sprawozdań w tym zespole</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function AdminView({ teams, reports, meetingsWithoutReports, onSelectTeam, selectedTeam, checkDeadline, onViewReport, onDeleteReport }: any) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Folder className="text-blue-500" /> Wszystkie Zespoły
                </h2>
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {teams.map((team: any) => (
                        <button
                            key={team.id}
                            onClick={() => onSelectTeam(team.id)}
                            className={cn(
                                "w-full text-left p-4 rounded-2xl transition-all flex items-center justify-between group",
                                selectedTeam === team.id
                                    ? "bg-white shadow-md border-l-4 border-blue-500"
                                    : "bg-white/50 hover:bg-white hover:shadow-sm"
                            )}
                        >
                            <span className="font-semibold text-gray-700 group-hover:text-blue-600 transition-colors">
                                {team.nazwa}
                            </span>
                            {selectedTeam === team.id && <ChevronRight className="text-blue-500" />}
                        </button>
                    ))}
                </div>
            </div>

            <div className="lg:col-span-2">
                <div className="bg-white/80 backdrop-blur-xl rounded-[40px] p-8 shadow-xl border border-white/50">
                    {selectedTeam ? (
                        <div className="space-y-8">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">
                                {teams.find((t: any) => t.id === selectedTeam)?.nazwa}
                            </h2>

                            <div className="space-y-4">
                                {/* Only past meetings need reports */}
                                {meetingsWithoutReports
                                    .filter((m: any) => m.teamId === selectedTeam && new Date(m.data) < new Date())
                                    .map((m: any) => (
                                        <PendingReportCard key={m.id} meeting={m} checkDeadline={checkDeadline} />
                                    ))}
                                {reports.filter((r: any) => r.meeting.teamId === selectedTeam).map((report: any) => (
                                    <ReportCard key={report.id} report={report} onClick={() => onViewReport(report)} onDelete={() => onDeleteReport(report.id)} />
                                ))}
                                {meetingsWithoutReports.filter((m: any) => m.teamId === selectedTeam && new Date(m.data) < new Date()).length === 0 &&
                                    reports.filter((r: any) => r.meeting.teamId === selectedTeam).length === 0 && (
                                        <div className="text-center py-20 text-gray-400 italic">Brak raportów i zaległości dla tego zespołu.</div>
                                    )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-20 text-gray-400">Wybierz zespół, aby zobaczyć raporty.</div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ReportCard({ report, onClick, onDelete }: any) {
    let preview = report.tresc;
    try {
        const parsed = JSON.parse(report.tresc);
        if (parsed.ops) {
            preview = parsed.ops.map((op: any) => op.insert).join(" ").substring(0, 150) + "...";
        }
    } catch (e) {
        preview = report.tresc.substring(0, 150) + "...";
    }

    return (
        <div
            onClick={onClick}
            className="group bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-100 transition-all cursor-pointer relative overflow-hidden"
        >
            <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500/0 group-hover:bg-emerald-500 transition-all duration-300" />
            <div className="flex justify-between items-start gap-4 mb-4">
                <div>
                    <h3 className="font-bold text-gray-800 mb-1">{report.meeting.opis}</h3>
                    <p className="text-xs text-gray-400 flex items-center gap-2">
                        <Clock size={12} /> {new Date(report.dataUtworzenia).toLocaleDateString()}
                    </p>
                </div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-600 text-[10px] font-bold uppercase tracking-wider rounded-full">
                    Wysłany
                </span>
            </div>

            <p className="text-sm text-gray-500 mb-6 line-clamp-2 leading-relaxed">
                {preview}
            </p>

            <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                <div className="flex items-center -space-x-2">
                    {report.meeting.attendance?.filter((a: any) => a.confirmed).slice(0, 3).map((a: any, i: number) => (
                        <div key={i} className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-500" title={a.imieNazwisko}>
                            {a.imieNazwisko.charAt(0)}
                        </div>
                    ))}
                    {report.meeting.attendance?.filter((a: any) => a.confirmed).length > 3 && (
                        <div className="w-8 h-8 rounded-full bg-gray-50 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-400">
                            +{report.meeting.attendance.filter((a: any) => a.confirmed).length - 3}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-2">
                    <div className="p-4 bg-gray-50 text-gray-400 rounded-2xl group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                        <ChevronRight size={24} />
                    </div>
                    {onDelete && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            className="p-4 bg-red-50 text-red-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-inner backdrop-blur-sm z-10"
                            title="Usuń raport"
                        >
                            <Trash2 size={24} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function PendingReportCard({ meeting, checkDeadline }: any) {
    const isLate = checkDeadline(new Date(meeting.data));
    return (
        <div className={cn(
            "bg-white rounded-3xl p-8 shadow-sm border-2 transition-all hover:shadow-xl relative overflow-hidden group border-white",
            isLate ? "border-red-100 bg-red-50/20" : "border-orange-100 bg-orange-50/20"
        )}>
            <div className={cn("absolute top-0 right-0 px-6 py-2 text-[9px] font-bold text-white uppercase tracking-widest", isLate ? "bg-red-500" : "bg-orange-400 shadow-sm")}>
                {isLate ? "Zaległy" : "Oczekujący"}
            </div>

            <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-800">{meeting.opis}</h3>
                <div className="flex items-center gap-6">
                    <span className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest bg-white/60 px-3 py-1.5 rounded-xl border border-gray-100">
                        <Calendar size={14} /> {new Date(meeting.data).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                        <Users size={14} /> {meeting.attendance?.length || 0} zap.
                    </span>
                </div>
                <p className="text-xs text-muted-foreground italic">Raport nie został jeszcze sporządzony.</p>
            </div>
        </div>
    );
}

// ... ReportDetailsModal and others ...

function ReportDetailsModal({ report, onClose, onDelete, isCoord, isAdmin }: any) {
    const [isLoading, setIsLoading] = useState(false);

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden relative z-10 flex flex-col"
            >
                <div className="p-6 border-b flex justify-between items-start bg-gray-50/50">
                    <div>
                        <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <CheckCircle2 size={14} /> Sprawozdanie wysłane
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">{report.meeting.opis}</h2>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center gap-1.5"><Calendar size={14} /> {new Date(report.meeting.data).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1.5"><Clock size={14} /> {new Date(report.dataUtworzenia).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1.5"><Users size={14} /> Utworzył: {report.utworzonePrzez}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                    <div className="prose prose-stone max-w-none">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Treść sprawozdania</h3>
                        <div className="text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 p-6 rounded-2xl border border-gray-100 font-medium">
                            {(() => {
                                try {
                                    const parsed = JSON.parse(report.tresc);
                                    if (parsed.ops) {
                                        return parsed.ops.map((op: any) => op.insert).join("");
                                    }
                                    return report.tresc;
                                } catch (e) {
                                    return report.tresc;
                                }
                            })()}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Lista obecności</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {report.meeting.attendance?.map((a: any) => (
                                <div key={a.id} className={cn(
                                    "flex items-center gap-3 p-3 rounded-xl border transition-all",
                                    a.confirmed ? "bg-emerald-50/50 border-emerald-100" : "bg-gray-50 border-gray-100 opacity-50"
                                )}>
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                                        a.confirmed ? "bg-emerald-100 text-emerald-600" : "bg-gray-200 text-gray-400"
                                    )}>
                                        {a.imieNazwisko.charAt(0)}
                                    </div>
                                    <span className={cn("font-medium", a.confirmed ? "text-gray-700" : "text-gray-400 line-through")}>
                                        {a.imieNazwisko}
                                    </span>
                                    {a.confirmed && <CheckCircle2 size={16} className="ml-auto text-emerald-500" />}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t bg-gray-50/50 flex justify-end gap-3">
                    {onDelete && (
                        <button
                            onClick={async () => {
                                setIsLoading(true);
                                await onDelete();
                                setIsLoading(false);
                            }}
                            disabled={isLoading}
                            className="px-6 py-3 bg-red-50 text-red-500 font-bold rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {isLoading ? "Usuwanie..." : <><Trash2 size={18} /> Usuń trwale</>}
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-all"
                    >
                        Zamknij
                    </button>
                </div>
            </motion.div>
        </div>,
        document.body
    );
}

function AddReportModal({ meetings, onClose, onRefresh, user }: any) {
    const [step, setStep] = useState(1);
    const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
    const [content, setContent] = useState("");
    const [attendanceState, setAttendanceState] = useState<Record<number, boolean>>({});
    const [addedUsers, setAddedUsers] = useState<any[]>([]); // New users not in initial attendance
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (selectedMeeting) {
            const initialAttendance: Record<number, boolean> = {};
            selectedMeeting.attendance.forEach((a: any) => {
                initialAttendance[a.userId] = true; // Default present? Or false? Let's say true for convenience or false. Usually false.
                // Wait, typically coordinators mark who was present.
                // Let's modify to default false.
                initialAttendance[a.userId] = false;
            });
            setAttendanceState(initialAttendance);
        }
    }, [selectedMeeting]);

    const handleSubmit = async () => {
        if (!selectedMeeting || !content.trim()) return;

        setIsSubmitting(true);
        try {
            const confirmedUserIds = Object.entries(attendanceState)
                .filter(([_, confirmed]) => confirmed)
                .map(([userId]) => Number(userId));

            // Assuming we don't handle "addedUsers" in this simple version yet as I don't have User list easily available
            // If I need to add users, I would need a user picker. For now, let's stick to existing attendance list.

            const res = await createReport({
                meetingId: selectedMeeting.id,
                tresc: content,
                utworzonePrzez: user?.name || "Nieznany", // Use user prop
                confirmedUserIds,
                addedUserIds: [] // Not implemented in UI yet
            });

            if (res.success) {
                onRefresh();
                onClose();
            } else {
                alert("Błąd podczas tworzenia raportu");
            }
        } catch (e) {
            console.error(e);
            alert("Wystąpił błąd");
        } finally {
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden relative z-10 flex flex-col"
            >
                <div className="p-6 border-b">
                    <h2 className="text-2xl font-bold text-gray-800">
                        {step === 1 ? "Wybierz spotkanie" : "Uzupełnij sprawozdanie"}
                    </h2>
                    <p className="text-sm text-gray-500">
                        {step === 1 ? "Wybierz spotkanie z listy oczekujących, aby sporządzić raport." : selectedMeeting?.opis}
                    </p>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    {step === 1 ? (
                        <div className="space-y-4">
                            {meetings.length === 0 ? (
                                <div className="text-center py-10 text-gray-400 italic">Brak zaległych spotkań do uzupełnienia.</div>
                            ) : (
                                meetings.map((meeting: any) => (
                                    <button
                                        key={meeting.id}
                                        onClick={() => { setSelectedMeeting(meeting); setStep(2); }}
                                        className="w-full text-left p-4 rounded-2xl border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-bold text-gray-800">{meeting.opis}</span>
                                            <span className="text-xs font-bold text-blue-500 bg-blue-100 px-2 py-1 rounded-full group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                                Wybierz
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                            <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(meeting.data).toLocaleDateString()}</span>
                                            <span className="flex items-center gap-1"><Users size={12} /> {meeting.attendance?.length || 0} zaproszonych</span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Treść sprawozdania</label>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className="w-full p-4 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all min-h-[150px] outline-none resize-none font-medium text-gray-700"
                                    placeholder="Opisz przebieg spotkania, podjęte decyzje, wnioski..."
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-4">Lista obecności (zaznacz obecnych)</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {selectedMeeting.attendance?.map((a: any) => (
                                        <div
                                            key={a.userId}
                                            onClick={() => setAttendanceState(prev => ({ ...prev, [a.userId]: !prev[a.userId] }))}
                                            className={cn(
                                                "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none",
                                                attendanceState[a.userId]
                                                    ? "bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500"
                                                    : "bg-white border-gray-200 hover:border-gray-300"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-5 h-5 rounded flex items-center justify-center border transition-colors",
                                                attendanceState[a.userId] ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300 bg-white"
                                            )}>
                                                {attendanceState[a.userId] && <CheckSquare size={14} />}
                                            </div>
                                            <span className={cn("font-medium text-sm", attendanceState[a.userId] ? "text-emerald-700" : "text-gray-600")}>
                                                {a.imieNazwisko}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
                    <button
                        onClick={() => step === 2 ? setStep(1) : onClose()}
                        className="px-6 py-2.5 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-all"
                    >
                        {step === 2 ? "Wróć" : "Anuluj"}
                    </button>

                    {step === 2 && (
                        <button
                            onClick={handleSubmit}
                            disabled={!content.trim() || isSubmitting}
                            className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
                        >
                            {isSubmitting ? "Wysyłanie..." : "Wyślij sprawozdanie"}
                        </button>
                    )}
                </div>
            </motion.div>
        </div>,
        document.body
    );
}

