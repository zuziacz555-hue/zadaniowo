"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { cn, hexToHSL, getContrastColor } from "@/lib/utils";
import {
    ChevronLeft,
    ChevronRight,
    // ... (keep structure) -> Actually I need to be careful with imports.
    // I'll update the imports first, then the component body.
    // Better to do safe replace.

    Plus,
    X,
    Edit2,
    Trash2,
    Calendar as CalendarIcon,
    Clock,
    Users
} from "lucide-react";
import { createMeeting, deleteMeeting, updateMeeting, addAttendance, removeAttendance, getMeetings, deleteMeetingsBulk, deleteMeetingsByName } from "@/lib/actions/meetings";
import { useRouter } from "next/navigation";

const MIESIACE = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
];

const DNI_TYGODNIA = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];

export default function MeetingsClient({
    initialMeetings,
    teams,
    isAdmin,
    isCoord,
    currentUser,
    currentUserId,
    activeTeamId,
    onRefresh
}: {
    initialMeetings: any[],
    teams: any[],
    isAdmin: boolean,
    isCoord: boolean,
    currentUser: string,
    currentUserId: number,
    activeTeamId: number | null,
    onRefresh?: () => void
}) {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const [view, setView] = useState<'month' | 'year'>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
    const [showAddMeeting, setShowAddMeeting] = useState(false);
    const [selectedTeamId, setSelectedTeamId] = useState<number | null>(activeTeamId || teams[0]?.id || null);

    const [newMeeting, setNewMeeting] = useState({
        data: "", // Date string
        godzina: "", // Time string e.g. "18:00"
        opis: "",
        opis_dodatkowy: "",
        signupDeadline: ""
    });

    // Recurrence State
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceInterval, setRecurrenceInterval] = useState(7);
    const [recurrenceEndDate, setRecurrenceEndDate] = useState("");

    // Edit meeting modal state
    const [showEditMeeting, setShowEditMeeting] = useState(false);
    const [editMeetingData, setEditMeetingData] = useState({
        id: 0,
        opis: "",
        opisDodatkowy: "",
        signupDeadline: ""
    });

    // Meetings state - for admin filtering
    const [meetings, setMeetings] = useState<any[]>(initialMeetings);

    // Refetch meetings when admin changes team
    useEffect(() => {
        const refetchMeetings = async () => {
            if (isAdmin) {
                // Admin: fetch for selected team (or all if no team selected)
                const res = await getMeetings(selectedTeamId ?? undefined);
                if (res.success) {
                    setMeetings(res.data || []);
                }
            } else {
                // Non-admin: filter from initial meetings
                if (selectedTeamId) {
                    setMeetings(initialMeetings.filter((m: any) => m.teamId === selectedTeamId));
                } else {
                    setMeetings(initialMeetings);
                }
            }
        };
        refetchMeetings();
    }, [selectedTeamId, isAdmin, initialMeetings]);

    // Bulk Selection State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    // Toggle selection mode
    const toggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode);
        setSelectedIds(new Set());
    };

    // Toggle individual meeting selection
    const toggleMeetingSelection = (id: number) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Czy na pewno chcesz usunąć zaznaczone spotkania (${selectedIds.size})?`)) return;

        const res = await deleteMeetingsBulk(Array.from(selectedIds));
        if (res.success) {
            setSelectedIds(new Set());
            setIsSelectionMode(false);
            router.refresh();
            onRefresh?.();
        } else {
            alert("Błąd podczas usuwania spotkań.");
        }
    };

    const handleDeleteByName = async (name: string) => {
        if (!confirm(`Czy na pewno chcesz usunąć WSZYSTKIE spotkania o nazwie "${name}"? Tej operacji nie można cofnąć.`)) return;

        const res = await deleteMeetingsByName(name, selectedTeamId || undefined);
        if (res.success) {
            setSelectedMeeting(null);
            router.refresh();
            onRefresh?.();
            alert(`Usunięto ${res.count} spotkań.`);
        } else {
            alert("Błąd podczas usuwania spotkań.");
        }
    };

    const curYear = currentDate.getFullYear();
    const curMonth = currentDate.getMonth();

    const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
    const getFirstDayOfMonth = (y: number, m: number) => {
        let d = new Date(y, m, 1).getDay();
        return d === 0 ? 6 : d - 1; // Adjust for Monday start
    };

    const changeMonth = (val: number) => {
        setCurrentDate(new Date(curYear, curMonth + val, 1));
    };

    const daysInMonth = getDaysInMonth(curYear, curMonth);
    const firstDay = getFirstDayOfMonth(curYear, curMonth);
    const calendarDays = [];

    for (let i = 0; i < firstDay; i++) {
        calendarDays.push({ day: null, empty: true });
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dayMeetings = meetings.filter(s => {
            const dt = new Date(s.data);
            return dt.getFullYear() === curYear && dt.getMonth() === curMonth && dt.getDate() === d;
        });
        calendarDays.push({
            day: d,
            meetings: dayMeetings,
            isToday: d === new Date().getDate() && curMonth === new Date().getMonth() && curYear === new Date().getFullYear()
        });
    }

    const handleAddMeeting = async () => {
        if (!newMeeting.data || !newMeeting.godzina || !newMeeting.opis.trim() || !selectedTeamId) return;

        // Validation for recurrence
        if (isRecurring && !recurrenceEndDate) {
            alert("Proszę podać datę końcową dla spotkania cyklicznego.");
            return;
        }

        const res = await createMeeting({
            teamId: selectedTeamId,
            data: newMeeting.data,
            godzina: newMeeting.godzina,
            opis: newMeeting.opis.trim(),
            opisDodatkowy: newMeeting.opis_dodatkowy.trim(),
            signupDeadline: newMeeting.signupDeadline || undefined,
            recurrence: isRecurring ? {
                intervalDays: recurrenceInterval,
                endDate: recurrenceEndDate
            } : undefined
        });

        if (res.success) {
            // Auto add coordinator to attendance
            if (isCoord && res.data) {
                await addAttendance(res.data.id, currentUser, currentUserId);
            }
            setShowAddMeeting(false);
            setShowAddMeeting(false);
            setNewMeeting({ data: "", godzina: "", opis: "", opis_dodatkowy: "", signupDeadline: "" });
            setIsRecurring(false);
            setRecurrenceEndDate("");
            setRecurrenceInterval(7);
            router.refresh();
            onRefresh?.();
        } else {
            alert("Błąd podczas tworzenia spotkania");
        }
    };

    const handleDeleteMeeting = async (id: number) => {
        if (!confirm("Czy na pewno chcesz usunąć to spotkanie?")) return;
        const res = await deleteMeeting(id);
        if (res.success) {
            setSelectedMeeting(null);
            router.refresh();
            onRefresh?.();
        }
    };

    const handleMarkAttendance = async (id: number) => {
        const res = await addAttendance(id, currentUser, currentUserId);
        if (res.success) {
            // Optimistic update to prevent double clicking
            if (selectedMeeting && selectedMeeting.id === id) {
                setSelectedMeeting((prev: any) => ({
                    ...prev,
                    attendance: [...(prev.attendance || []), res.data]
                }));
            }
            router.refresh();
            onRefresh?.();
        }
    };

    const handleEditMeeting = (meeting: any) => {
        setEditMeetingData({
            id: meeting.id,
            opis: meeting.opis || "",
            opisDodatkowy: meeting.opisDodatkowy || "",
            signupDeadline: meeting.signupDeadline ? new Date(meeting.signupDeadline).toISOString().slice(0, 16) : ""
        });
        setShowEditMeeting(true);
    };

    const handleSaveEditMeeting = async () => {
        const res = await updateMeeting(editMeetingData.id, {
            opis: editMeetingData.opis,
            opisDodatkowy: editMeetingData.opisDodatkowy,
            signupDeadline: editMeetingData.signupDeadline || null
        });
        if (res.success) {
            router.refresh();
            onRefresh?.();
            setSelectedMeeting((prev: any) => ({
                ...prev,
                opis: editMeetingData.opis,
                opisDodatkowy: editMeetingData.opisDodatkowy,
                signupDeadline: editMeetingData.signupDeadline ? new Date(editMeetingData.signupDeadline) : null
            }));
            setShowEditMeeting(false);
        }
    };

    const selectedTeamName = selectedTeamId
        ? (teams.find(t => t.id === selectedTeamId)?.nazwa || "Zespół")
        : "Wszystkie zespoły";

    const selectedTeamColor = selectedTeamId ? teams.find(t => t.id === selectedTeamId)?.kolor : null;
    const teamTheme = selectedTeamColor ? hexToHSL(selectedTeamColor) : null;

    // Apply theme locally to this container if team is selected
    const containerStyle = teamTheme ? {
        '--primary-h': teamTheme.h,
        '--primary-s': teamTheme.s,
        '--primary-l': teamTheme.l,
        '--color-primary': `hsl(${teamTheme.h}, ${teamTheme.s}, ${teamTheme.l})`
    } as React.CSSProperties : {};

    return (
        <DashboardLayout>
            <div className="space-y-10 animate-slide-in pb-12" style={containerStyle}>
                {/* Header Section */}
                <div className="glass-panel p-10 rounded-[32px] flex flex-wrap justify-between items-center gap-8 relative overflow-hidden">
                    {/* Background Glow */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-[80px]" />

                    <div className="relative z-10 space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                <CalendarIcon size={24} />
                            </div>
                            <h1 className="text-4xl font-black tracking-tight text-foreground">{selectedTeamName}</h1>
                        </div>
                        <p className="text-muted-foreground font-medium flex items-center gap-2">
                            Zalogowana jako <span className="text-primary font-bold">{currentUser}</span>
                            {(isAdmin || isCoord) && (
                                <span className="px-3 py-1 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-widest rounded-full border border-primary/20">
                                    {isAdmin ? "Administrator" : "Koordynatorka"}
                                </span>
                            )}
                        </p>
                    </div>

                    <div className="relative z-10 flex flex-wrap gap-4 items-center">
                        {isAdmin && (
                            <>
                                <button
                                    onClick={toggleSelectionMode}
                                    className={cn(
                                        "px-6 py-3 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 shadow-sm",
                                        isSelectionMode
                                            ? "bg-red-500 text-white shadow-red-200"
                                            : "bg-white border border-gray-100 text-gray-600 hover:border-primary hover:text-primary"
                                    )}
                                >
                                    {isSelectionMode ? <X size={18} /> : <Trash2 size={18} />}
                                    {isSelectionMode ? "Anuluj" : "Usuń wiele"}
                                </button>
                                <select
                                    value={selectedTeamId ?? "all"}
                                    onChange={(e) => setSelectedTeamId(e.target.value === "all" ? null : Number(e.target.value))}
                                    className="lux-select min-w-[200px] border-none shadow-sm bg-white/80 font-bold"
                                >
                                    <option value="all">🌐 Wszystkie zespoły</option>
                                    {teams.map(t => (
                                        <option key={t.id} value={t.id}>{t.nazwa}</option>
                                    ))}
                                </select>
                            </>
                        )}
                        {(isAdmin || isCoord) && (
                            <button
                                onClick={() => setShowAddMeeting(true)}
                                className="lux-btn flex items-center gap-2 group"
                            >
                                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform">
                                    <Plus size={14} />
                                </div>
                                Nowe spotkanie
                            </button>
                        )}
                    </div>
                </div>

                {/* Bulk Action Bar - Sticky Bottom */}
                <AnimatePresence>
                    {isSelectionMode && selectedIds.size > 0 && (
                        <motion.div
                            initial={{ y: 100 }}
                            animate={{ y: 0 }}
                            exit={{ y: 100 }}
                            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-white text-foreground px-8 py-4 rounded-full shadow-2xl border border-gray-100 flex items-center gap-6"
                        >
                            <span className="font-bold">Zaznaczono: {selectedIds.size}</span>
                            <button
                                onClick={handleBulkDelete}
                                className="lux-btn bg-red-500 hover:bg-red-600 text-white px-6 py-2 flex items-center gap-2"
                            >
                                <Trash2 size={18} /> Usuń zaznaczone
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* View Switcher */}
                <div className="flex justify-center gap-3">
                    <button
                        onClick={() => setView('month')}
                        className={cn(
                            "px-8 py-3 rounded-full font-bold transition-all shadow-lg",
                            view === 'month' ? "lux-btn" : "lux-btn-outline"
                        )}
                    >
                        Miesiąc
                    </button>
                    <button
                        onClick={() => setView('year')}
                        className={cn(
                            "px-8 py-3 rounded-full font-bold transition-all shadow-lg",
                            view === 'year' ? "lux-btn" : "lux-btn-outline"
                        )}
                    >
                        Rok
                    </button>
                </div>

                {/* Calendar Navigation */}
                <div className="flex items-center justify-center gap-6">
                    <button
                        onClick={() => {
                            if (view === 'month') changeMonth(-1);
                            else setCurrentDate(new Date(curYear - 1, curMonth, 1));
                        }}
                        className="p-3 bg-white/80 rounded-full text-primary hover:bg-white transition-all shadow-sm"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <h2 className="text-3xl font-bold text-foreground min-w-[300px] text-center drop-shadow-md">
                        {view === 'month' ? `${MIESIACE[curMonth]} ${curYear}` : curYear}
                    </h2>
                    <button
                        onClick={() => {
                            if (view === 'month') changeMonth(1);
                            else setCurrentDate(new Date(curYear + 1, curMonth, 1));
                        }}
                        className="p-3 bg-white/80 rounded-full text-primary hover:bg-white transition-all shadow-sm"
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>

                {/* View Switcher Content */}
                {view === 'month' ? (
                    <div className="glass-panel overflow-hidden rounded-[32px]">
                        <div className="grid grid-cols-7 bg-white/40 border-b border-white/40">
                            {DNI_TYGODNIA.map(wd => (
                                <div key={wd} className="py-5 text-center font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{wd}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 bg-white/20">
                            {calendarDays.map((item, idx) => (
                                <div
                                    key={idx}
                                    className={cn(
                                        "min-h-[140px] p-3 border-r border-b border-white/40 transition-all duration-300 relative group",
                                        item.empty && "bg-gray-50/10",
                                        item.isToday && "bg-primary/5"
                                    )}
                                >
                                    <div className={cn(
                                        "text-[10px] font-black mb-3 w-6 h-6 rounded-full flex items-center justify-center transition-colors",
                                        item.isToday ? "bg-primary text-white shadow-lg shadow-primary/30" : "text-muted-foreground group-hover:text-foreground"
                                    )}>
                                        {item.day}
                                    </div>
                                    <div className="space-y-1">
                                        {item.meetings?.map(meeting => {
                                            const isMarked = meeting.attendance?.some((a: any) => a.imieNazwisko === currentUser);
                                            // Get team color from meeting.team.kolor (if available from backend) or fallback
                                            const teamColor = meeting.team?.kolor || '#5400FF';

                                            return (
                                                <button
                                                    key={meeting.id}
                                                    onClick={(e) => {
                                                        if (isSelectionMode) {
                                                            e.stopPropagation();
                                                            toggleMeetingSelection(meeting.id);
                                                        } else {
                                                            setSelectedMeeting(meeting);
                                                        }
                                                    }}
                                                    className={cn(
                                                        "w-full text-left p-2 rounded-xl text-[10px] font-bold truncate transition-all shadow-sm flex items-center gap-2 hover:-translate-y-0.5",
                                                        isMarked ? "ring-2 ring-white" : "opacity-90 hover:opacity-100",
                                                        (isSelectionMode && selectedIds.has(meeting.id)) ? "ring-2 ring-red-500 scale-95 opacity-50" : "hover:shadow-md"
                                                    )}
                                                    style={{
                                                        background: `linear-gradient(135deg, ${teamColor}e6 0%, ${teamColor}cc 100%)`,
                                                        backgroundColor: teamColor,
                                                        color: getContrastColor(teamColor)
                                                    }}
                                                >
                                                    {isSelectionMode && (
                                                        <div className={cn(
                                                            "w-3.5 h-3.5 rounded-full border border-white/50 flex items-center justify-center shrink-0 shadow-inner",
                                                            selectedIds.has(meeting.id) ? "bg-white text-red-500" : "bg-transparent"
                                                        )}>
                                                            {selectedIds.has(meeting.id) && <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                                                        </div>
                                                    )}
                                                    <span className="truncate flex items-center gap-1.5">
                                                        <Clock size={10} className="shrink-0 opacity-70" />
                                                        {new Date(meeting.data).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {meeting.opis}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8 animate-slide-in">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {MIESIACE.map((monthName, monthIndex) => {
                                const count = meetings.filter(s => {
                                    const dt = new Date(s.data);
                                    return dt.getFullYear() === curYear && dt.getMonth() === monthIndex;
                                }).length;

                                const isCurrentMonth = new Date().getMonth() === monthIndex && new Date().getFullYear() === curYear;

                                return (
                                    <button
                                        key={monthName}
                                        onClick={() => {
                                            setCurrentDate(new Date(curYear, monthIndex, 1));
                                            setView('month');
                                        }}
                                        className={cn(
                                            "glass-panel p-10 flex flex-col items-center justify-center gap-6 transition-all hover:scale-[1.03] active:scale-95 border-2 rounded-[32px] group relative overflow-hidden",
                                            isCurrentMonth ? "border-primary/50 ring-4 ring-primary/5" : "border-transparent hover:border-white"
                                        )}
                                    >
                                        {isCurrentMonth && (
                                            <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary animate-pulse" />
                                        )}

                                        <div className={cn(
                                            "text-xs font-black uppercase tracking-[0.3em] transition-colors",
                                            isCurrentMonth ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                        )}>
                                            {monthName}
                                        </div>

                                        <div className="flex flex-col items-center gap-1">
                                            <div className="text-6xl font-black gradient-text group-hover:scale-110 transition-transform">
                                                {count}
                                            </div>
                                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                                                Spotkań
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Meeting Detail Modal */}
                {mounted && createPortal(
                    <AnimatePresence>
                        {selectedMeeting && (
                            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setSelectedMeeting(null)}
                                    className="absolute inset-0 bg-black/60 backdrop-blur-[20px]"
                                />
                                <motion.div
                                    initial={{ scale: 0.9, y: 20, opacity: 0 }}
                                    animate={{ scale: 1, y: 0, opacity: 1 }}
                                    exit={{ scale: 0.9, y: 20, opacity: 0 }}
                                    className="relative glass-panel w-full max-w-[550px] rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.4)] overflow-hidden border-white/40"
                                >
                                    <div className="p-10 relative overflow-hidden"
                                        style={{
                                            background: selectedMeeting.team?.kolor
                                                ? `linear-gradient(135deg, ${selectedMeeting.team.kolor}22 0%, transparent 100%)`
                                                : 'linear-gradient(135deg, var(--color-primary)/10 0%, transparent 100%)'
                                        }}>

                                        {/* Corner Accent */}
                                        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-[60px] opacity-20"
                                            style={{ backgroundColor: selectedMeeting.team?.kolor || 'var(--color-primary)' }} />

                                        <button
                                            onClick={() => setSelectedMeeting(null)}
                                            className="absolute top-8 right-8 w-10 h-10 flex items-center justify-center bg-white/40 hover:bg-white/60 rounded-full transition-all border border-white/40 shadow-sm z-20"
                                        >
                                            <X size={20} />
                                        </button>

                                        <div className="relative z-10 space-y-8">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-3 py-1 bg-white/60 border border-white/60 rounded-full text-[10px] font-black uppercase tracking-widest text-primary shadow-sm">
                                                        Szczegóły spotkania
                                                    </span>
                                                    {selectedMeeting.team?.nazwa && (
                                                        <span className="px-3 py-1 bg-white/40 border border-white/40 rounded-full text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                            {selectedMeeting.team.nazwa}
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="text-4xl font-black tracking-tight text-foreground leading-tight">
                                                    {selectedMeeting.opis}
                                                </h3>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-white/40 p-5 rounded-3xl border border-white/60 shadow-sm">
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Data</p>
                                                    <div className="flex items-center gap-2 text-foreground font-black">
                                                        <CalendarIcon size={16} className="text-primary" />
                                                        {new Date(selectedMeeting.data).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <div className="bg-white/40 p-5 rounded-3xl border border-white/60 shadow-sm">
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Godzina</p>
                                                    <div className="flex items-center gap-2 text-foreground font-black">
                                                        <Clock size={16} className="text-primary" />
                                                        {new Date(selectedMeeting.data).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>

                                            {selectedMeeting.opisDodatkowy && (
                                                <div className="bg-white/60 p-8 rounded-[32px] border border-white/80 shadow-sm relative group">
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 opacity-60">Notatki</p>
                                                    <p className="text-foreground/80 leading-relaxed font-medium">
                                                        {selectedMeeting.opisDodatkowy}
                                                    </p>
                                                </div>
                                            )}

                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                                        <Users size={14} className="text-primary" /> Uczestnicy
                                                    </h4>
                                                    <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                                                        {selectedMeeting.attendance?.length || 0}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedMeeting.attendance && selectedMeeting.attendance.length > 0 ? (
                                                        selectedMeeting.attendance.map((att: any) => (
                                                            <span key={att.id} className={cn(
                                                                "px-5 py-2.5 rounded-2xl text-[11px] font-bold shadow-sm transition-all",
                                                                att.imieNazwisko === currentUser
                                                                    ? "bg-primary text-white shadow-primary/20 scale-105"
                                                                    : "bg-white/80 text-muted-foreground border border-white/60 hover:bg-white"
                                                            )}>
                                                                {att.imieNazwisko} {att.imieNazwisko === currentUser && "(Ty)"}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <p className="text-muted-foreground italic text-sm py-2">Brak zapisanych osób</p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="pt-8 flex flex-col gap-4">
                                                {selectedMeeting.signupDeadline && (
                                                    <div className="text-center pb-2">
                                                        <span className={cn(
                                                            "text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-2xl shadow-sm border",
                                                            new Date() > new Date(selectedMeeting.signupDeadline) ? "bg-red-50 text-red-600 border-red-100" : "bg-green-50 text-green-600 border-green-100"
                                                        )}>
                                                            {new Date() > new Date(selectedMeeting.signupDeadline) ? "Zapisy zamknięte" : `Zapisy do: ${new Date(selectedMeeting.signupDeadline).toLocaleDateString()} ${new Date(selectedMeeting.signupDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                                        </span>
                                                    </div>
                                                )}

                                                {!isCoord && (
                                                    <button
                                                        disabled={selectedMeeting.attendance?.some((a: any) => a.imieNazwisko === currentUser) || (selectedMeeting.signupDeadline && new Date() > new Date(selectedMeeting.signupDeadline))}
                                                        className={cn(
                                                            "w-full py-5 rounded-[24px] font-black transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95",
                                                            selectedMeeting.attendance?.some((a: any) => a.imieNazwisko === currentUser) || (selectedMeeting.signupDeadline && new Date() > new Date(selectedMeeting.signupDeadline))
                                                                ? "bg-gray-100 text-muted-foreground cursor-not-allowed opacity-60"
                                                                : "lux-btn text-lg hover:-translate-y-1"
                                                        )}
                                                        onClick={() => handleMarkAttendance(selectedMeeting.id)}
                                                    >
                                                        {selectedMeeting.attendance?.some((a: any) => a.imieNazwisko === currentUser) ? "Jesteś zapisana" : "Zapisz się na spotkanie"}
                                                    </button>
                                                )}

                                                {(isAdmin || isCoord) && (
                                                    <div className="space-y-4">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <button
                                                                className="bg-white border border-gray-100 text-gray-700 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary/5 hover:text-primary transition-all shadow-sm"
                                                                onClick={() => handleEditMeeting(selectedMeeting)}
                                                            >
                                                                <Edit2 size={18} /> Edytuj
                                                            </button>
                                                            <button
                                                                className="bg-red-50 text-red-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all shadow-sm shadow-red-100"
                                                                onClick={() => handleDeleteMeeting(selectedMeeting.id)}
                                                            >
                                                                <Trash2 size={18} /> Usuń
                                                            </button>
                                                        </div>
                                                        <button
                                                            className="w-full py-3 text-[10px] font-black text-red-500 hover:text-red-600 uppercase tracking-widest transition-colors opacity-60 hover:opacity-100"
                                                            onClick={() => handleDeleteByName(selectedMeeting.opis)}
                                                        >
                                                            Usuń serię: "{selectedMeeting.opis}"
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}

                {/* Add Meeting Form */}
                {mounted && createPortal(
                    <AnimatePresence>
                        {showAddMeeting && (
                            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setShowAddMeeting(false)}
                                    className="absolute inset-0 bg-black/60 backdrop-blur-[20px]"
                                />
                                <motion.div
                                    initial={{ scale: 0.95, y: 20, opacity: 0 }}
                                    animate={{ scale: 1, y: 0, opacity: 1 }}
                                    exit={{ scale: 0.95, y: 20, opacity: 0 }}
                                    className="relative glass-panel w-full max-w-[550px] rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.4)] overflow-hidden border-white/40"
                                >
                                    <div className="p-10 space-y-8 relative overflow-hidden">
                                        <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/10 rounded-full blur-[60px]" />

                                        <div className="relative z-10 flex justify-between items-start">
                                            <div className="space-y-1">
                                                <span className="px-3 py-1 bg-primary/5 border border-primary/20 rounded-full text-[10px] font-black uppercase tracking-widest text-primary shadow-sm">
                                                    Planowanie
                                                </span>
                                                <h3 className="text-3xl font-black tracking-tight text-foreground">Nowe spotkanie</h3>
                                            </div>
                                            <button
                                                onClick={() => setShowAddMeeting(false)}
                                                className="w-10 h-10 flex items-center justify-center bg-white/40 hover:bg-white/60 rounded-full transition-all border border-white/40 shadow-sm"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>

                                        <div className="relative z-10 space-y-6">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Data</label>
                                                    <input
                                                        type="date"
                                                        className="lux-input bg-white/60 focus:bg-white shadow-sm"
                                                        value={newMeeting.data}
                                                        onChange={(e) => setNewMeeting(prev => ({ ...prev, data: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Godzina</label>
                                                    <input
                                                        type="time"
                                                        className="lux-input bg-white/60 focus:bg-white shadow-sm"
                                                        value={newMeeting.godzina}
                                                        onChange={(e) => setNewMeeting(prev => ({ ...prev, godzina: e.target.value }))}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Tytuł spotkania</label>
                                                <input
                                                    type="text"
                                                    className="lux-input bg-white/60 focus:bg-white shadow-sm"
                                                    placeholder="np. Spotkanie operacyjne"
                                                    value={newMeeting.opis}
                                                    onChange={(e) => setNewMeeting(prev => ({ ...prev, opis: e.target.value }))}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Opis dodatkowy</label>
                                                <textarea
                                                    className="lux-textarea h-28 resize-none bg-white/60 focus:bg-white shadow-sm"
                                                    placeholder="Dodaj szczegóły spotkania..."
                                                    value={newMeeting.opis_dodatkowy}
                                                    onChange={(e) => setNewMeeting(prev => ({ ...prev, opis_dodatkowy: e.target.value }))}
                                                ></textarea>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1 cursor-help" title="Zapisy zostaną zablokowane po tym terminie">Termin zapisów (opcjonalnie)</label>
                                                <input
                                                    type="datetime-local"
                                                    className="lux-input bg-white/60 focus:bg-white shadow-sm"
                                                    value={newMeeting.signupDeadline}
                                                    onChange={(e) => setNewMeeting(prev => ({ ...prev, signupDeadline: e.target.value }))}
                                                />
                                            </div>

                                            {/* Recurrence Options */}
                                            <div className="pt-6 border-t border-white/40">
                                                <label className="flex items-center gap-3 cursor-pointer group">
                                                    <div className={cn(
                                                        "w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center",
                                                        isRecurring ? "bg-primary border-primary shadow-lg shadow-primary/30" : "bg-white/40 border-white/60 group-hover:border-primary/40"
                                                    )}>
                                                        {isRecurring && <Plus size={14} className="text-white" />}
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={isRecurring}
                                                        onChange={(e) => setIsRecurring(e.target.checked)}
                                                    />
                                                    <span className="text-[11px] font-black text-foreground/70 uppercase tracking-widest group-hover:text-primary transition-colors">Spotkanie cykliczne</span>
                                                </label>

                                                <AnimatePresence>
                                                    {isRecurring && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                                            animate={{ height: "auto", opacity: 1, marginTop: 16 }}
                                                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                                            className="grid grid-cols-2 gap-4 pl-8 overflow-hidden"
                                                        >
                                                            <div className="space-y-2">
                                                                <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Co ile dni?</label>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    className="lux-input bg-white/60 focus:bg-white"
                                                                    value={recurrenceInterval}
                                                                    onChange={(e) => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Do kiedy?</label>
                                                                <input
                                                                    type="date"
                                                                    className="lux-input bg-white/60 focus:bg-white"
                                                                    value={recurrenceEndDate}
                                                                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                                                                />
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            <div className="flex justify-end gap-3 pt-4">
                                                <button className="flex-1 px-6 py-4 rounded-2xl font-bold bg-white/40 border border-white/60 hover:bg-white transition-all shadow-sm" onClick={() => setShowAddMeeting(false)}>
                                                    Anuluj
                                                </button>
                                                <button className="flex-[2] lux-btn py-4" onClick={handleAddMeeting}>
                                                    Zapisz spotkanie
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}

                {/* Edit Meeting Modal */}
                {mounted && createPortal(
                    <AnimatePresence>
                        {showEditMeeting && (
                            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setShowEditMeeting(false)}
                                    className="absolute inset-0 bg-black/60 backdrop-blur-[20px]"
                                />
                                <motion.div
                                    initial={{ scale: 0.95, y: 20, opacity: 0 }}
                                    animate={{ scale: 1, y: 0, opacity: 1 }}
                                    exit={{ scale: 0.95, y: 20, opacity: 0 }}
                                    className="relative glass-panel w-full max-w-[550px] rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.4)] overflow-hidden border-white/40"
                                >
                                    <div className="p-10 space-y-8 relative overflow-hidden">
                                        <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/10 rounded-full blur-[60px]" />

                                        <div className="relative z-10 flex justify-between items-start">
                                            <div className="space-y-1">
                                                <span className="px-3 py-1 bg-primary/5 border border-primary/20 rounded-full text-[10px] font-black uppercase tracking-widest text-primary shadow-sm">
                                                    Edycja
                                                </span>
                                                <h3 className="text-3xl font-black tracking-tight text-foreground">Edytuj spotkanie</h3>
                                            </div>
                                            <button
                                                onClick={() => setShowEditMeeting(false)}
                                                className="w-10 h-10 flex items-center justify-center bg-white/40 hover:bg-white/60 rounded-full transition-all border border-white/40 shadow-sm"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>

                                        <div className="relative z-10 space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Tytuł spotkania</label>
                                                <input
                                                    type="text"
                                                    className="lux-input bg-white/60 focus:bg-white shadow-sm"
                                                    value={editMeetingData.opis}
                                                    onChange={(e) => setEditMeetingData(prev => ({ ...prev, opis: e.target.value }))}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Opis dodatkowy</label>
                                                <textarea
                                                    className="lux-textarea h-32 resize-none bg-white/60 focus:bg-white shadow-sm"
                                                    value={editMeetingData.opisDodatkowy}
                                                    onChange={(e) => setEditMeetingData(prev => ({ ...prev, opisDodatkowy: e.target.value }))}
                                                ></textarea>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Termin zapisów (opcjonalnie)</label>
                                                <input
                                                    type="datetime-local"
                                                    className="lux-input bg-white/60 focus:bg-white shadow-sm"
                                                    value={editMeetingData.signupDeadline}
                                                    onChange={(e) => setEditMeetingData(prev => ({ ...prev, signupDeadline: e.target.value }))}
                                                />
                                            </div>
                                            <div className="flex justify-end gap-3 pt-4">
                                                <button className="flex-1 px-6 py-4 rounded-2xl font-bold bg-white/40 border border-white/60 hover:bg-white transition-all shadow-sm" onClick={() => setShowEditMeeting(false)}>
                                                    Anuluj
                                                </button>
                                                <button className="flex-[2] lux-btn py-4" onClick={handleSaveEditMeeting}>
                                                    Zapisz zmiany
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}

                {/* Admin/Coord FAB */}
                {(isAdmin || isCoord) && (() => {
                    const selectedTeam = teams.find(t => t.id === selectedTeamId);
                    const fabColor = selectedTeam?.kolor || '#5400FF'; // Default purple
                    return (
                        <button
                            className="fixed bottom-10 right-10 w-20 h-20 rounded-[30px] shadow-[0_20px_60px_rgba(0,0,0,0.3)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 group hover:rotate-12"
                            style={{
                                background: `linear-gradient(135deg, ${fabColor} 0%, ${fabColor}dd 100%)`,
                                boxShadow: `0 20px 60px ${fabColor}44`
                            }}
                            onClick={() => setShowAddMeeting(true)}
                        >
                            <Plus size={32} color={getContrastColor(fabColor)} className="group-hover:rotate-90 transition-transform duration-500" />
                        </button>
                    );
                })()}

            </div>
        </DashboardLayout>

    );
}
