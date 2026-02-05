"use client";

import { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
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
    Square
} from "lucide-react";
import { createReport, updateReport } from "@/lib/actions/reports";
import { useRouter } from "next/navigation";

export default function ReportsClient({
    reports,
    meetingsWithoutReports,
    teams,
    isAdmin,
    isCoord,
    currentUser,
    onRefresh
}: {
    reports: any[],
    meetingsWithoutReports: any[],
    teams: any[],
    isAdmin: boolean,
    isCoord: boolean,
    currentUser: string,
    onRefresh?: () => void
}) {
    const router = useRouter();
    const [selectedTeam, setSelectedTeam] = useState<number | null>(teams[0]?.id || null);

    // Form State
    const [showForm, setShowForm] = useState(false);
    const [activeMeeting, setActiveMeeting] = useState<any>(null);
    const [formData, setFormData] = useState({
        summary: ""
    });
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingReportId, setEditingReportId] = useState<number | null>(null);

    // Attendance State
    const [confirmedUserIds, setConfirmedUserIds] = useState<number[]>([]);
    const [addedUserIds, setAddedUserIds] = useState<number[]>([]);
    const [showAddUserModal, setShowAddUserModal] = useState(false);

    // View State
    const [selectedReport, setSelectedReport] = useState<any>(null);

    const checkDeadline = (meetingDate: Date) => {
        const now = new Date();
        const diff = now.getTime() - meetingDate.getTime();
        return diff > 24 * 60 * 60 * 1000;
    };

    const handleOpenForm = (meeting: any) => {
        // Prevent opening if meeting is in future
        if (new Date(meeting.data) > new Date()) {
            alert("Nie można sporządzić raportu przed czasem spotkania.");
            return;
        }

        setActiveMeeting(meeting);
        // Get registered users IDs
        const registeredIds = meeting.attendance?.filter((a: any) => a.userId).map((a: any) => a.userId) || [];
        setConfirmedUserIds([]); // Start empty, user must check
        setAddedUserIds([]);

        // Auto-fill title from meeting description
        setFormData({
            summary: ""
        });

        setShowForm(true);
    };

    const handleEditReport = (report: any) => {
        setIsEditMode(true);
        setEditingReportId(report.id);
        setActiveMeeting(report.meeting);

        // Pre-fill content
        try {
            const parsed = JSON.parse(report.tresc);
            setFormData({ summary: parsed.summary || "" });
        } catch {
            setFormData({ summary: report.tresc });
        }

        // Pre-fill attendance
        const confirmedIds = report.meeting.attendance?.filter((a: any) => a.confirmed).map((a: any) => a.userId).filter(Boolean) || [];
        const addedIds = report.meeting.attendance?.filter((a: any) => a.confirmed && !report.meeting.attendance.some((orig: any) => orig.userId === a.userId && !orig.id)).map((a: any) => a.userId).filter(Boolean) || [];
        // Actually, we just want to know who is confirmed
        setConfirmedUserIds(report.meeting.attendance?.filter((a: any) => a.confirmed && a.userId).map((a: any) => a.userId) || []);

        // We need to identify who was "added" vs "registered"
        // Registered users are those already in meeting.attendance (prisma returns all)
        // But wait, the meeting object passed in reports has all attendance records.
        // We'll just set confirmedUserIds and let the UI handle it.
        // For "added" users, we might need a better way to distinguish them if we want to show the "Dodana" badge.
        // For now, let's keep it simple: confirmed is confirmed.

        setShowForm(true);
        setSelectedReport(null); // Close view modal
    };

    const toggleAttendance = (userId: number) => {
        setConfirmedUserIds(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleAddUser = (userId: number) => {
        if (!addedUserIds.includes(userId)) {
            setAddedUserIds(prev => [...prev, userId]);
            setConfirmedUserIds(prev => [...prev, userId]); // Auto confirm added users
        }
        setShowAddUserModal(false);
    };

    const handleSubmitReport = async () => {
        if (!activeMeeting) return;

        const combinedContent = JSON.stringify({
            summary: formData.summary,
        });

        let res;
        if (isEditMode && editingReportId) {
            res = await updateReport(editingReportId, {
                tresc: combinedContent,
                confirmedUserIds: confirmedUserIds.filter(id => !addedUserIds.includes(id)),
                addedUserIds: addedUserIds
            });
        } else {
            res = await createReport({
                meetingId: activeMeeting.id,
                tresc: combinedContent,
                utworzonePrzez: currentUser,
                confirmedUserIds: confirmedUserIds.filter(id => !addedUserIds.includes(id)),
                addedUserIds: addedUserIds
            });
        }

        if (res.success) {
            setShowForm(false);
            setIsEditMode(false);
            setEditingReportId(null);
            setFormData({ summary: "" });
            router.refresh();
            onRefresh?.();
        } else {
            alert(res.error || "Wystąpił błąd podczas zapisywania raportu.");
        }
    };

    // Get current team members for "Add User" modal
    const currentTeamMembers = useMemo(() => {
        if (!activeMeeting) return [];
        const team = teams.find(t => t.id === activeMeeting.teamId);
        return team?.users?.map((u: any) => u.user) || [];
    }, [activeMeeting, teams]);

    // Filter out users already in attendance list (registered)
    const availableToAdd = useMemo(() => {
        if (!activeMeeting) return [];
        const registeredIds = activeMeeting.attendance?.map((a: any) => a.userId) || [];
        return currentTeamMembers.filter((u: any) => !registeredIds.includes(u.id) && !addedUserIds.includes(u.id));
    }, [currentTeamMembers, activeMeeting, addedUserIds]);


    return (
        <DashboardLayout>
            <div className="space-y-8 animate-slide-in">
                {/* Header */}
                <div className="lux-card-strong p-12 text-center relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-2 h-full gradient-bg" />
                    <h1 className="text-4xl font-bold gradient-text mb-3">Sprawozdania ze spotkań</h1>
                    <p className="text-muted-foreground text-lg">Dokumentacja i monitoring aktywności zespołowych</p>
                </div>

                {isAdmin ? (
                    <AdminView
                        teams={teams}
                        reports={reports}
                        meetingsWithoutReports={meetingsWithoutReports}
                        onSelectTeam={setSelectedTeam}
                        selectedTeam={selectedTeam}
                        checkDeadline={checkDeadline}
                        onViewReport={setSelectedReport}
                    />
                ) : isCoord ? (
                    <CoordView
                        reports={reports}
                        meetingsWithoutReports={meetingsWithoutReports}
                        checkDeadline={checkDeadline}
                        onComplete={handleOpenForm}
                        onViewReport={setSelectedReport}
                    />
                ) : (
                    <div className="bg-white p-20 rounded-[25px] text-center shadow-lg">
                        <div className="text-4xl mb-4 text-muted-foreground"> - </div>
                        <h2 className="text-2xl font-bold text-muted-foreground">Brak uprawnień do sprawozdań</h2>
                    </div>
                )}

                {/* Report Completion Form Modal */}
                <AnimatePresence>
                    {showForm && activeMeeting && (
                        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                            >
                                <div className="lux-gradient p-10 text-white relative flex-shrink-0">
                                    <button onClick={() => { setShowForm(false); setIsEditMode(false); setEditingReportId(null); }} className="absolute top-8 right-8 p-2 bg-white/20 rounded-full hover:bg-white/30">
                                        <X size={20} />
                                    </button>
                                    <h2 className="text-3xl font-bold mb-2">{isEditMode ? "Edytuj sprawozdanie" : "Uzupełnij sprawozdanie"}</h2>
                                    <p className="text-white/70 font-bold uppercase tracking-widest text-[10px]">{activeMeeting.opis} • {new Date(activeMeeting.data).toLocaleDateString()}</p>
                                </div>
                                <div className="p-10 space-y-6 overflow-y-auto custom-scrollbar flex-grow">
                                    {/* Attendance Section */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Lista Obecności</label>
                                            <button
                                                onClick={() => setShowAddUserModal(true)}
                                                className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1 hover:bg-primary/5 px-2 py-1 rounded-lg"
                                            >
                                                <Plus size={12} /> Dodaj osobę
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            {/* Registered Users */}
                                            {activeMeeting.attendance?.map((att: any) => (
                                                <div
                                                    key={att.id}
                                                    onClick={() => att.userId && toggleAttendance(att.userId)}
                                                    className={cn(
                                                        "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                                                        att.userId && confirmedUserIds.includes(att.userId)
                                                            ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                                                            : "bg-white border-gray-100 text-gray-500 hover:border-emerald-100"
                                                    )}
                                                >
                                                    {att.userId && confirmedUserIds.includes(att.userId)
                                                        ? <CheckSquare size={18} />
                                                        : <Square size={18} />
                                                    }
                                                    <span className="text-sm font-bold">{att.imieNazwisko}</span>
                                                </div>
                                            ))}

                                            {/* Manually Added Users */}
                                            {addedUserIds.map(userId => {
                                                const user = currentTeamMembers.find((u: any) => u.id === userId);
                                                if (!user) return null;
                                                return (
                                                    <div key={userId} className="flex items-center gap-3 p-3 rounded-xl border bg-blue-50 border-blue-100 text-blue-700">
                                                        <CheckSquare size={18} />
                                                        <span className="text-sm font-bold">{user.imieNazwisko} (Dodana)</span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setAddedUserIds(prev => prev.filter(id => id !== userId));
                                                                setConfirmedUserIds(prev => prev.filter(id => id !== userId));
                                                            }}
                                                            className="ml-auto text-blue-400 hover:text-blue-600"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Opis</label>
                                        <textarea
                                            placeholder="Opisz przebieg spotkania, podjęte decyzje i wnioski..."
                                            className="lux-input min-h-[150px] py-4"
                                            value={formData.summary}
                                            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="p-8 bg-gray-50 flex justify-end gap-4 flex-shrink-0">
                                    <button onClick={() => { setShowForm(false); setIsEditMode(false); setEditingReportId(null); }} className="lux-btn-outline">Anuluj</button>
                                    <button onClick={handleSubmitReport} className="lux-btn px-10">{isEditMode ? "Zaktualizuj sprawozdanie" : "Wyślij sprawozdanie"}</button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Add User Modal */}
                <AnimatePresence>
                    {showAddUserModal && (
                        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-white w-full max-w-md rounded-[30px] shadow-2xl overflow-hidden"
                            >
                                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                    <h3 className="text-lg font-bold">Dodaj osobę do obecności</h3>
                                    <button onClick={() => setShowAddUserModal(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                                </div>
                                <div className="p-6 max-h-[400px] overflow-y-auto">
                                    {availableToAdd.length > 0 ? (
                                        <div className="space-y-2">
                                            {availableToAdd.map((user: any) => (
                                                <button
                                                    key={user.id}
                                                    onClick={() => handleAddUser(user.id)}
                                                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 hover:border-primary/20 transition-all text-left"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                                        {user.imieNazwisko.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <span className="font-bold text-gray-700">{user.imieNazwisko}</span>
                                                    <Plus size={16} className="ml-auto text-gray-300" />
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-center text-muted-foreground text-sm italic py-4">Wszyscy członkowie zespołu są już na liście.</p>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Report View Modal */}
                <AnimatePresence>
                    {selectedReport && (
                        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-white w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden"
                            >
                                <div className="lux-gradient p-12 text-white relative">
                                    <button onClick={() => setSelectedReport(null)} className="absolute top-8 right-8 p-2 bg-white/20 rounded-full hover:bg-white/30">
                                        <X size={20} />
                                    </button>
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                                            <FileText size={24} />
                                        </div>
                                        <div>
                                            <h2 className="text-3xl font-bold">{selectedReport.meeting?.opis || "Raport"}</h2>
                                            <p className="text-white/70 font-bold uppercase tracking-widest text-[10px]">Spotkanie z dnia: {new Date(selectedReport.meeting.data).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-12 space-y-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                    {(() => {
                                        let data = { topics: "", decisions: "", summary: "" };
                                        try {
                                            const parsed = JSON.parse(selectedReport.tresc);
                                            data = {
                                                topics: parsed.topics || "",
                                                decisions: parsed.decisions || "",
                                                summary: parsed.summary || ""
                                            };
                                        } catch {
                                            data.summary = selectedReport.tresc;
                                        }

                                        // Confirmed attendance from existing records
                                        const confirmedAttendance = selectedReport.meeting?.attendance?.filter((a: any) => a.confirmed);

                                        return (
                                            <>
                                                {/* Compatibility with old reports: show topics/decisions if present */}
                                                {(data.topics || data.decisions) && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                        {data.topics && (
                                                            <div className="space-y-4">
                                                                <h3 className="text-xs font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" /> Tematyka
                                                                </h3>
                                                                <p className="text-sm text-foreground/80 leading-relaxed font-medium whitespace-pre-wrap">{data.topics}</p>
                                                            </div>
                                                        )}
                                                        {data.decisions && (
                                                            <div className="space-y-4">
                                                                <h3 className="text-xs font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" /> Decyzje
                                                                </h3>
                                                                <p className="text-sm text-foreground/80 leading-relaxed font-medium whitespace-pre-wrap">{data.decisions}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div className={cn("space-y-4", (data.topics || data.decisions) && "pt-6 border-t border-gray-50")}>
                                                    <h3 className="text-xs font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" /> Opis
                                                    </h3>
                                                    <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                                                        <p className="text-sm text-foreground/80 leading-relaxed font-medium whitespace-pre-wrap">{data.summary || "Brak opisu"}</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-4 pt-6 border-t border-gray-50">
                                                    <h3 className="text-xs font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" /> Obecni ({confirmedAttendance?.length || 0})
                                                    </h3>
                                                    <div className="flex flex-wrap gap-2">
                                                        {confirmedAttendance?.map((att: any) => (
                                                            <span key={att.id} className="bg-white border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-600 shadow-sm flex items-center gap-2">
                                                                <CheckCircle2 size={12} className="text-emerald-500" /> {att.imieNazwisko}
                                                            </span>
                                                        ))}
                                                        {(!confirmedAttendance || confirmedAttendance.length === 0) && (
                                                            <span className="text-muted-foreground italic text-xs">Brak potwierdzonych obecności</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                                <div className="p-8 bg-gray-50 flex justify-between items-center text-xs text-muted-foreground font-bold uppercase tracking-widest px-12">
                                    <div className="flex flex-col gap-1">
                                        <span>Utworzone przez: {selectedReport.utworzonePrzez}</span>
                                        <span>{new Date(selectedReport.dataUtworzenia).toLocaleString()}</span>
                                    </div>
                                    {(isCoord || isAdmin) && (
                                        <button
                                            onClick={() => handleEditReport(selectedReport)}
                                            className="lux-btn py-2 px-6 flex items-center gap-2 text-[11px]"
                                        >
                                            <Plus size={14} className="rotate-45" /> Edytuj raport
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </DashboardLayout>
    );
}

function AdminView({ teams, reports, meetingsWithoutReports, onSelectTeam, selectedTeam, checkDeadline, onViewReport }: any) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-4">
                <h2 className="text-xl font-bold text-foreground/80 mb-4 flex items-center gap-2 px-2">
                    <Folder size={20} className="text-primary" /> Zespoły
                </h2>
                {teams.map((team: any) => {
                    const teamMeetingsWithoutReport = meetingsWithoutReports.filter((m: any) => m.teamId === team.id);
                    const hasLateReport = teamMeetingsWithoutReport.some((m: any) => checkDeadline(new Date(m.data)));

                    return (
                        <button
                            key={team.id}
                            onClick={() => onSelectTeam(team.id)}
                            className={cn(
                                "w-full text-left p-6 rounded-[28px] transition-all flex items-center justify-between border-2",
                                selectedTeam === team.id ? "bg-white shadow-xl border-primary/20" : "bg-white border-transparent hover:border-gray-100 shadow-sm"
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <div
                                    className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-colors", selectedTeam === team.id ? "scale-105" : "bg-gray-100 text-gray-400")}
                                    style={selectedTeam === team.id ? { backgroundColor: team.kolor || '#5400FF', background: `linear-gradient(135deg, ${team.kolor || '#5400FF'} 0%, ${team.kolor ? team.kolor + 'dd' : '#704df5'} 100%)` } : {}}
                                >
                                    <Folder size={22} style={selectedTeam !== team.id ? { color: team.kolor || '#9ca3af' } : {}} />
                                </div>
                                <div>
                                    <span className="font-bold text-gray-800 block">{team.nazwa}</span>
                                    <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">
                                        {reports.filter((r: any) => r.meeting.teamId === team.id).length} raportów
                                    </span>
                                </div>
                            </div>
                            {hasLateReport && (
                                <div className="w-8 h-8 flex items-center justify-center bg-red-100 text-red-600 rounded-full animate-bounce">
                                    <AlertCircle size={16} />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="lg:col-span-2">
                <AnimatePresence mode="wait">
                    {selectedTeam ? (
                        <motion.div key={selectedTeam} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            <div className="flex flex-col gap-2 px-2">
                                <h2 className="text-2xl font-bold text-gray-800">Raporty: {teams.find((t: any) => t.id === selectedTeam)?.nazwa}</h2>
                                <div className="h-1 w-12 bg-primary/20 rounded-full" />
                            </div>
                            <div className="space-y-4">
                                {/* Only past meetings need reports */}
                                {meetingsWithoutReports
                                    .filter((m: any) => m.teamId === selectedTeam && new Date(m.data) < new Date())
                                    .map((m: any) => (
                                        <PendingReportCard key={m.id} meeting={m} checkDeadline={checkDeadline} />
                                    ))}
                                {reports.filter((r: any) => r.meeting.teamId === selectedTeam).map((report: any) => (
                                    <ReportCard key={report.id} report={report} onClick={() => onViewReport(report)} />
                                ))}
                                {meetingsWithoutReports.filter((m: any) => m.teamId === selectedTeam && new Date(m.data) < new Date()).length === 0 &&
                                    reports.filter((r: any) => r.meeting.teamId === selectedTeam).length === 0 && (
                                        <div className="p-10 text-center text-muted-foreground italic">Brak spotkań wymagających raportu.</div>
                                    )
                                }
                            </div>
                        </motion.div>
                    ) : (
                        <div className="bg-white p-20 rounded-[40px] text-center shadow-inner border-2 border-dashed border-gray-100">
                            <p className="font-bold uppercase tracking-[0.2em] text-muted-foreground/40 text-sm">Wybierz zespół z listy obok</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

function CoordView({ reports, meetingsWithoutReports, checkDeadline, onComplete, onViewReport }: any) {
    const pendingMeetings = meetingsWithoutReports.filter((m: any) => new Date(m.data) < new Date());
    const mostRecentPending = pendingMeetings[0];
    const isLate = mostRecentPending ? checkDeadline(new Date(mostRecentPending.data)) : false;

    return (
        <div className="space-y-12">
            {mostRecentPending && (
                <div className={cn(
                    "p-10 rounded-[40px] shadow-2xl relative overflow-hidden transition-all group border-4",
                    isLate ? "bg-red-500 text-white border-red-400" : "bg-white border-orange-100"
                )}>
                    {isLate ? (
                        <div className="absolute -bottom-10 -right-10 opacity-10">
                            <AlertCircle size={200} />
                        </div>
                    ) : (
                        <div className="absolute -bottom-10 -right-10 opacity-5">
                            <Clock size={200} className="text-orange-500" />
                        </div>
                    )}
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10 text-center md:text-left">
                        <div className="space-y-4">
                            <div className={cn(
                                "inline-flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm",
                                isLate ? "bg-white text-red-600" : "bg-orange-50 text-orange-600"
                            )}>
                                <Clock size={16} /> {isLate ? "SPRAWOZDANIE ZALEGŁE (>24H!)" : "Czekamy na Twoje sprawozdanie"}
                            </div>
                            <h2 className="text-4xl font-bold tracking-tight">{mostRecentPending.opis}</h2>
                            <p className={cn("text-lg font-medium", isLate ? "text-white/80" : "text-muted-foreground")}>Termin spotkania: {new Date(mostRecentPending.data).toLocaleString()}</p>
                        </div>
                        <button
                            className={cn(
                                "px-12 py-6 rounded-[24px] font-bold text-xl shadow-2xl hover:scale-105 transition-all flex items-center gap-4 active:scale-95",
                                isLate ? "bg-white text-red-600" : "lux-gradient text-white"
                            )}
                            onClick={() => onComplete(mostRecentPending)}
                        >
                            <FileText size={24} /> Uzupełnij teraz
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-8">
                <div className="flex flex-col gap-2 px-2">
                    <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-4">
                        <CheckCircle2 className="text-emerald-500" size={32} /> Historia sprawozdań
                    </h2>
                    <div className="h-1 w-16 bg-emerald-500/20 rounded-full" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {reports.map((report: any) => (
                        <ReportCard key={report.id} report={report} onClick={() => onViewReport(report)} />
                    ))}
                    {reports.length === 0 && (
                        <div className="col-span-2 py-20 text-center opacity-20 italic font-bold uppercase tracking-widest text-sm">Brak przesłanych sprawozdań</div>
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
            "bg-white rounded-3xl p-8 shadow-sm border-2 transition-all hover:shadow-xl relative overflow-hidden group border-white cursor-not-allowed opacity-80",
            isLate ? "border-red-100 bg-red-50/20" : "border-orange-100 bg-orange-50/20"
        )}>
            <div className={cn("absolute top-0 right-0 px-6 py-2 text-[9px] font-bold text-white uppercase tracking-widest", isLate ? "bg-red-500" : "bg-orange-400 shadow-sm")}>{isLate ? "Zaległy" : "Oczekujący"}</div>
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

function ReportCard({ report, onClick }: any) {
    let preview = report.tresc;
    try {
        const parsed = JSON.parse(report.tresc);
        preview = parsed.summary || parsed.topics || report.tresc;
    } catch { }

    // Count confirmed
    const confirmedCount = report.meeting?.attendance?.filter((a: any) => a.confirmed).length || 0;

    return (
        <div
            onClick={onClick}
            className="bg-white rounded-3xl p-8 shadow-sm border-2 border-white hover:border-primary/20 transition-all hover:shadow-2xl cursor-pointer group"
        >
            <div className="flex justify-between items-start gap-6">
                <div className="space-y-6 flex-1">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 group-hover:text-primary transition-colors">{report.meeting?.opis || "Raport"}</h3>
                        <div className="flex flex-wrap items-center gap-4 mt-3">
                            <span className="flex items-center gap-2 text-[9px] text-muted-foreground font-bold uppercase tracking-widest bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                                <Calendar size={14} /> {new Date(report.meeting.data).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-2 text-[9px] text-emerald-600 font-bold uppercase tracking-widest bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                                <CheckCircle2 size={14} /> Przesłano
                            </span>
                        </div>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 italic font-medium">"{preview}"</p>

                    <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-[10px] font-bold text-gray-400 uppercase mr-2">Obecni:</span>
                        {report.meeting.attendance?.filter((a: any) => a.confirmed).slice(0, 3).map((a: any) => (
                            <span key={a.id} className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-[10px] font-bold border border-emerald-100 shadow-inner" title={a.imieNazwisko}>
                                {a.imieNazwisko.substring(0, 2).toUpperCase()}
                            </span>
                        ))}
                        {(confirmedCount > 3) && (
                            <span className="h-8 px-2 flex items-center text-[10px] text-muted-foreground font-bold">+ {confirmedCount - 3}</span>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-gray-50 text-gray-400 rounded-2xl group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                    <ChevronRight size={24} />
                </div>
            </div>
        </div>
    );
}
