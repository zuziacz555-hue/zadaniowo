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
    User,
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
            <div className="p-8 max-w-7xl mx-auto space-y-12 animate-slide-in">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 lux-gradient shadow-lg shadow-primary/30 rounded-[20px] text-white">
                                <FileText size={32} />
                            </div>
                            <h1 className="text-5xl font-black gradient-text tracking-tighter">
                                Sprawozdania
                            </h1>
                        </div>
                        <p className="text-muted-foreground font-medium text-lg ml-1">System zarządzania dokumentacją i frekwencją spotkań.</p>
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
            <div className="lg:col-span-1 space-y-8">
                <div className="space-y-4">
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60 px-2">
                        Moje Zespoły
                    </h2>
                    <div className="space-y-2">
                        {teams.map((team: any) => (
                            <button
                                key={team.id}
                                onClick={() => onSelectTeam(team.id)}
                                className={cn(
                                    "w-full text-left p-5 rounded-[24px] transition-all duration-300 flex items-center justify-between group relative overflow-hidden",
                                    selectedTeam === team.id
                                        ? "bg-white shadow-xl shadow-primary/5 border border-primary/10 -translate-x-1 lg:translate-x-1"
                                        : "hover:bg-white/40 hover:translate-x-1"
                                )}
                            >
                                {selectedTeam === team.id && (
                                    <motion.div
                                        layoutId="active-team-reports"
                                        className="absolute left-0 top-4 bottom-4 w-1 bg-primary rounded-r-full"
                                    />
                                )}
                                <span className={cn(
                                    "font-bold transition-colors",
                                    selectedTeam === team.id ? "text-primary" : "text-foreground opacity-70 group-hover:opacity-100"
                                )}>
                                    {team.nazwa}
                                </span>
                                <ChevronRight className={cn(
                                    "size-4 transition-all",
                                    selectedTeam === team.id ? "text-primary opacity-100" : "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
                                )} />
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={onAddReport}
                    className="w-full group relative overflow-hidden p-[1px] rounded-[32px] transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-foreground opacity-100" />
                    <div className="relative bg-white/10 backdrop-blur-3xl rounded-[31px] p-8 text-white h-full">
                        <div className="relative z-10">
                            <div className="size-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Plus size={28} />
                            </div>
                            <h3 className="text-2xl font-black mb-2 leading-tight">Nowe<br />Sprawozdanie</h3>
                            <p className="text-white/70 text-sm font-medium mb-6">Uzupełnij dokumentację z ostatniego spotkania.</p>
                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary-foreground bg-white px-5 py-3 rounded-2xl w-fit shadow-lg shadow-black/10">
                                Rozpocznij
                            </div>
                        </div>
                    </div>
                </button>
            </div>

            <div className="lg:col-span-3 space-y-12">
                {pendingMeetings.length > 0 && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-2xl font-black text-red-500 flex items-center gap-3">
                                <AlertCircle size={28} /> Zaległe i Oczekujące
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {pendingMeetings.map((m: any) => (
                                <PendingReportCard key={m.id} meeting={m} checkDeadline={checkDeadline} />
                            ))}
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-2xl font-black text-foreground flex items-center gap-3">
                            <CheckCircle2 className="text-emerald-500" size={28} /> Archiwum Wysłanych
                        </h2>
                    </div>
                    {reports.filter((r: any) => r.meeting.teamId === selectedTeam).length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {reports.filter((r: any) => r.meeting.teamId === selectedTeam).map((report: any) => (
                                <ReportCard key={report.id} report={report} onClick={() => onViewReport(report)} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-24 bg-white/30 backdrop-blur-md rounded-[40px] border-2 border-dashed border-white/60">
                            <div className="size-20 rounded-[32px] bg-primary/5 flex items-center justify-center mx-auto mb-6 text-primary/20">
                                <FileText size={40} />
                            </div>
                            <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Brak sprawozdań w tym zespole</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function AdminView({ teams, reports, meetingsWithoutReports, onSelectTeam, selectedTeam, checkDeadline, onViewReport, onDeleteReport }: any) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
            <div className="lg:col-span-1 space-y-8">
                <div className="space-y-4">
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60 px-2">
                        Wszystkie Zespoły
                    </h2>
                    <div className="grid grid-cols-1 gap-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        {teams.map((team: any) => (
                            <button
                                key={team.id}
                                onClick={() => onSelectTeam(team.id)}
                                className={cn(
                                    "w-full text-left p-5 rounded-[24px] transition-all duration-300 flex items-center justify-between group relative overflow-hidden",
                                    selectedTeam === team.id
                                        ? "bg-white shadow-xl shadow-primary/5 border border-primary/10 -translate-x-1 lg:translate-x-1"
                                        : "hover:bg-white/40 hover:translate-x-1"
                                )}
                            >
                                {selectedTeam === team.id && (
                                    <motion.div
                                        layoutId="active-team-admin-reports"
                                        className="absolute left-0 top-4 bottom-4 w-1 bg-primary rounded-r-full"
                                    />
                                )}
                                <span className={cn(
                                    "font-bold transition-colors",
                                    selectedTeam === team.id ? "text-primary" : "text-foreground opacity-70 group-hover:opacity-100"
                                )}>
                                    {team.nazwa}
                                </span>
                                <ChevronRight className={cn(
                                    "size-4 transition-all",
                                    selectedTeam === team.id ? "text-primary opacity-100" : "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
                                )} />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="lg:col-span-3">
                <div className="lux-card-strong p-10 h-full">
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
            className="group lux-card p-8 hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/20 transition-all cursor-pointer relative flex flex-col h-full overflow-visible"
        >
            <div className="flex justify-between items-start gap-4 mb-6">
                <div className="space-y-1">
                    <h3 className="font-black text-xl text-foreground leading-tight group-hover:text-primary transition-colors">{report.meeting.opis}</h3>
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                        <Clock size={12} className="text-primary" /> {new Date(report.dataUtworzenia).toLocaleDateString()}
                    </div>
                </div>
                <span className="lux-badge lux-badge-success">
                    Wysłany
                </span>
            </div>

            <p className="text-sm text-muted-foreground mb-8 line-clamp-3 leading-relaxed font-medium">
                {preview}
            </p>

            <div className="flex items-center justify-between mt-auto pt-6 border-t border-white/60">
                <div className="flex items-center -space-x-3">
                    {report.meeting.attendance?.filter((a: any) => a.confirmed).slice(0, 4).map((a: any, i: number) => (
                        <div key={i} className="size-10 rounded-2xl bg-white border-[3px] border-white shadow-sm flex items-center justify-center text-xs font-black text-primary" title={a.imieNazwisko}>
                            {a.imieNazwisko.charAt(0)}
                        </div>
                    ))}
                    {report.meeting.attendance?.filter((a: any) => a.confirmed).length > 4 && (
                        <div className="size-10 rounded-2xl bg-primary/10 border-[3px] border-white flex items-center justify-center text-xs font-black text-primary backdrop-blur-sm">
                            +{report.meeting.attendance.filter((a: any) => a.confirmed).length - 4}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {onDelete && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm group/del"
                            title="Usuń raport"
                        >
                            <Trash2 size={20} />
                        </button>
                    )}
                    <div className="p-3 bg-primary/5 text-primary rounded-2xl group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                        <ChevronRight size={20} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function PendingReportCard({ meeting, checkDeadline }: any) {
    const isLate = checkDeadline(new Date(meeting.data));
    return (
        <div className={cn(
            "lux-card p-8 group border-2 transition-all hover:shadow-2xl relative overflow-hidden flex flex-col h-full",
            isLate ? "border-red-100 bg-red-50/10 shadow-red-500/5 hover:border-red-200" : "border-orange-100 bg-orange-50/10 shadow-orange-500/5 hover:border-orange-200"
        )}>
            <div className="flex justify-between items-start mb-6">
                <div className="size-16 rounded-[24px] bg-white shadow-inner flex items-center justify-center text-primary/40 group-hover:text-primary transition-colors">
                    <Calendar size={32} />
                </div>
                <span className={cn(
                    "lux-badge",
                    isLate ? "lux-badge-danger" : "lux-badge-warning"
                )}>
                    {isLate ? "Zaległy" : "Oczekujący"}
                </span>
            </div>

            <div className="space-y-3 mb-8">
                <h3 className="text-2xl font-black text-foreground group-hover:text-primary transition-colors leading-tight">{meeting.opis}</h3>
                <div className="flex flex-wrap items-center gap-4">
                    <span className="flex items-center gap-2 text-[10px] text-muted-foreground font-black uppercase tracking-widest bg-white/60 px-3 py-1.5 rounded-xl border border-white">
                        <Calendar size={12} className="text-primary" /> {new Date(meeting.data).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-2 text-[10px] text-muted-foreground font-black uppercase tracking-widest bg-white/60 px-3 py-1.5 rounded-xl border border-white">
                        <Users size={12} className="text-primary" /> {meeting.attendance?.length || 0} zapr.
                    </span>
                </div>
            </div>

            <p className="mt-auto text-xs text-muted-foreground font-medium italic opacity-60">
                Oczekuje na sporządzenie dokumentacji...
            </p>
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
                className="lux-card-strong w-full max-w-2xl max-h-[90vh] overflow-hidden relative z-10 flex flex-col border-white/60"
            >
                <div className="p-10 border-b border-white/40 flex justify-between items-start bg-white/40 backdrop-blur-md">
                    <div className="space-y-2">
                        <div className="lux-badge lux-badge-success flex items-center gap-2 w-fit">
                            <CheckCircle2 size={12} /> Sprawozdanie wysłane
                        </div>
                        <h2 className="text-3xl font-black gradient-text tracking-tight">{report.meeting.opis}</h2>
                        <div className="flex flex-wrap items-center gap-4 mt-4 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground/60">
                            <span className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-xl border border-white"><Calendar size={12} className="text-primary" /> {new Date(report.meeting.data).toLocaleDateString()}</span>
                            <span className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-xl border border-white"><Clock size={12} className="text-primary" /> {new Date(report.dataUtworzenia).toLocaleDateString()}</span>
                            <span className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-xl border border-white"><User size={12} className="text-primary" /> {report.utworzonePrzez}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 bg-white/60 hover:bg-white rounded-2xl transition-all text-muted-foreground hover:text-primary shadow-sm">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-10 overflow-y-auto custom-scrollbar space-y-12 bg-white/20">
                    <div className="space-y-6">
                        <h3 className="text-xs font-black text-muted-foreground/60 uppercase tracking-[0.2em] px-1">Treść sprawozdania</h3>
                        <div className="text-foreground leading-[1.8] font-medium whitespace-pre-wrap bg-white/60 backdrop-blur-md p-8 rounded-[32px] border border-white shadow-inner text-sm">
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

                    <div className="space-y-6">
                        <h3 className="text-xs font-black text-muted-foreground/60 uppercase tracking-[0.2em] px-1">Lista obecności</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {report.meeting.attendance?.map((a: any) => (
                                <div key={a.id} className={cn(
                                    "flex items-center gap-4 p-4 rounded-2xl transition-all border",
                                    a.confirmed
                                        ? "bg-emerald-50/30 border-emerald-100 shadow-sm"
                                        : "bg-white/40 border-white/60 opacity-50 grayscale"
                                )}>
                                    <div className={cn(
                                        "size-10 rounded-xl flex items-center justify-center text-xs font-black",
                                        a.confirmed ? "bg-emerald-100 text-emerald-600 shadow-sm" : "bg-gray-200 text-gray-400"
                                    )}>
                                        {a.imieNazwisko.charAt(0)}
                                    </div>
                                    <span className={cn(
                                        "font-bold text-sm",
                                        a.confirmed ? "text-foreground" : "text-muted-foreground line-through"
                                    )}>
                                        {a.imieNazwisko}
                                    </span>
                                    {a.confirmed && <CheckCircle2 size={18} className="ml-auto text-emerald-500 shadow-sm" />}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-8 border-t border-white/40 bg-white/40 backdrop-blur-md flex justify-end gap-4">
                    {onDelete && (
                        <button
                            onClick={async () => {
                                setIsLoading(true);
                                await onDelete();
                                setIsLoading(false);
                            }}
                            disabled={isLoading}
                            className="px-8 py-4 bg-red-50 text-red-500 font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-red-500 hover:text-white transition-all flex items-center gap-3 disabled:opacity-50 shadow-sm"
                        >
                            {isLoading ? "Usuwanie..." : <><Trash2 size={18} /> Usuń trwale</>}
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="px-8 py-4 bg-white/60 text-foreground font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-white transition-all shadow-sm border border-white"
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
                className="lux-card-strong w-full max-w-2xl max-h-[90vh] overflow-hidden relative z-10 flex flex-col border-white/60"
            >
                <div className="p-10 border-b border-white/40 bg-white/40 backdrop-blur-md">
                    <h2 className="text-3xl font-black gradient-text tracking-tight">
                        {step === 1 ? "Wybierz spotkanie" : "Uzupełnij sprawozdanie"}
                    </h2>
                    <p className="text-sm font-medium text-muted-foreground/60 mt-2 uppercase tracking-widest">
                        {step === 1 ? "Wybierz spotkanie z listy oczekujących" : selectedMeeting?.opis}
                    </p>
                </div>

                <div className="p-10 overflow-y-auto custom-scrollbar flex-1 bg-white/20">
                    {step === 1 ? (
                        <div className="space-y-4">
                            {meetings.length === 0 ? (
                                <div className="text-center py-20 text-muted-foreground italic font-medium opacity-50 px-10">Brak zaległych spotkań do uzupełnienia.</div>
                            ) : (
                                meetings.map((meeting: any) => (
                                    <button
                                        key={meeting.id}
                                        onClick={() => { setSelectedMeeting(meeting); setStep(2); }}
                                        className="w-full text-left p-6 rounded-[28px] border border-white/60 bg-white/40 backdrop-blur-md hover:bg-white hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all group flex items-center justify-between gap-6"
                                    >
                                        <div className="space-y-2">
                                            <span className="font-black text-lg text-foreground group-hover:text-primary transition-colors block">{meeting.opis}</span>
                                            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                                <span className="flex items-center gap-1.5"><Calendar size={12} className="text-primary" /> {new Date(meeting.data).toLocaleDateString()}</span>
                                                <span className="flex items-center gap-1.5"><Users size={12} className="text-primary" /> {meeting.attendance?.length || 0} zapr.</span>
                                            </div>
                                        </div>
                                        <div className="size-12 rounded-2xl bg-primary/5 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                                            <ChevronRight size={20} />
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="space-y-10">
                            <div className="space-y-4">
                                <label className="text-xs font-black text-muted-foreground/60 uppercase tracking-[0.2em] px-1">Treść sprawozdania</label>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className="lux-input py-6 px-8 min-h-[200px]"
                                    placeholder="Opisz przebieg spotkania, podjęte decyzje, wnioski..."
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-6">
                                <label className="text-xs font-black text-muted-foreground/60 uppercase tracking-[0.2em] px-1">Lista obecności (zaznacz obecnych)</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {selectedMeeting.attendance?.map((a: any) => (
                                        <button
                                            key={a.userId}
                                            onClick={() => setAttendanceState(prev => ({ ...prev, [a.userId]: !prev[a.userId] }))}
                                            className={cn(
                                                "flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 text-left",
                                                attendanceState[a.userId]
                                                    ? "bg-emerald-50/50 border-emerald-500/30 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/20"
                                                    : "bg-white border-white/60 hover:border-primary/20 hover:bg-white"
                                            )}
                                        >
                                            <div className={cn(
                                                "size-6 rounded-lg flex items-center justify-center border transition-all duration-300",
                                                attendanceState[a.userId]
                                                    ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                                    : "border-gray-200 bg-gray-50"
                                            )}>
                                                {attendanceState[a.userId] && <CheckSquare size={16} />}
                                            </div>
                                            <span className={cn(
                                                "font-bold text-sm transition-colors",
                                                attendanceState[a.userId] ? "text-emerald-700" : "text-foreground opacity-70"
                                            )}>
                                                {a.imieNazwisko}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-8 border-t border-white/40 bg-white/40 backdrop-blur-md flex justify-between items-center">
                    <button
                        onClick={() => step === 2 ? setStep(1) : onClose()}
                        className="px-8 py-4 bg-white/60 text-foreground font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-white transition-all shadow-sm border border-white"
                    >
                        {step === 2 ? "Wróć" : "Anuluj"}
                    </button>

                    {step === 2 && (
                        <button
                            onClick={handleSubmit}
                            disabled={!content.trim() || isSubmitting}
                            className="px-10 py-4 bg-primary text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20 disabled:opacity-50 disabled:shadow-none flex items-center gap-3"
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

