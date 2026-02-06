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
        opis_dodatkowy: ""
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
        opisDodatkowy: ""
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
            setNewMeeting({ data: "", godzina: "", opis: "", opis_dodatkowy: "" });
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
            opisDodatkowy: meeting.opisDodatkowy || ""
        });
        setShowEditMeeting(true);
    };

    const handleSaveEditMeeting = async () => {
        const res = await updateMeeting(editMeetingData.id, {
            opis: editMeetingData.opis,
            opisDodatkowy: editMeetingData.opisDodatkowy
        });
        if (res.success) {
            router.refresh();
            onRefresh?.();
            setSelectedMeeting((prev: any) => ({
                ...prev,
                opis: editMeetingData.opis,
                opisDodatkowy: editMeetingData.opisDodatkowy
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
            <div className="space-y-8 animate-slide-in" style={containerStyle}>
                {/* Header Section */}
                <div className="lux-card p-8 flex flex-wrap justify-between items-center gap-6">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold gradient-text flex items-center gap-2">{selectedTeamName}</h1>
                        <p className="text-muted-foreground text-sm">
                            Zalogowana: <strong className="text-primary">{currentUser}</strong>
                            {(isAdmin || isCoord) && <span className="ml-3 lux-chip">{isAdmin ? "Administrator" : "Koordynatorka"}</span>}
                        </p>
                    </div>
                    {isAdmin && (
                        <div className="flex gap-4 items-center">
                            <button
                                onClick={toggleSelectionMode}
                                className={cn(
                                    "px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2",
                                    isSelectionMode ? "bg-red-100 text-red-600 ring-2 ring-red-200" : "lux-btn-outline"
                                )}
                            >
                                {isSelectionMode ? <X size={16} /> : <Trash2 size={16} />}
                                {isSelectionMode ? "Anuluj usuwanie" : "Usuń wiele"}
                            </button>
                            <select
                                value={selectedTeamId ?? "all"}
                                onChange={(e) => setSelectedTeamId(e.target.value === "all" ? null : Number(e.target.value))}
                                className="lux-select font-semibold"
                            >
                                <option value="all">🌐 Wszystkie zespoły</option>
                                {teams.map(t => (
                                    <option key={t.id} value={t.id}>{t.nazwa}</option>
                                ))}
                            </select>
                        </div>
                    )}
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
                    <div className="lux-card overflow-hidden">
                        <div className="grid grid-cols-7 gradient-bg text-white">
                            {DNI_TYGODNIA.map(wd => (
                                <div key={wd} className="py-4 text-center font-bold text-xs uppercase tracking-widest opacity-80">{wd}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7">
                            {calendarDays.map((item, idx) => (
                                <div
                                    key={idx}
                                    className={cn(
                                        "min-h-[120px] p-2 border-r border-b border-gray-100 transition-colors hover:bg-white/70",
                                        item.empty && "bg-gray-50/50",
                                        item.isToday && "bg-blue-50"
                                    )}
                                >
                                    <div className={cn(
                                        "text-xs font-bold mb-2",
                                        item.isToday ? "text-primary" : "text-muted-foreground"
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
                                                        "w-full text-left p-1.5 rounded-lg text-[10px] font-bold truncate transition-all shadow-sm flex items-center gap-2",
                                                        isMarked ? "ring-2 ring-white" : "opacity-90 hover:opacity-100",
                                                        (isSelectionMode && selectedIds.has(meeting.id)) ? "ring-2 ring-red-500 scale-95 opacity-50" : ""
                                                    )}
                                                    style={{
                                                        background: `linear-gradient(135deg, ${teamColor} 0%, ${teamColor}dd 100%)`,
                                                        backgroundColor: teamColor,
                                                        color: getContrastColor(teamColor)
                                                    }}
                                                >
                                                    {isSelectionMode && (
                                                        <div className={cn(
                                                            "w-3 h-3 rounded-full border border-white/50 flex items-center justify-center shrink-0",
                                                            selectedIds.has(meeting.id) ? "bg-white text-red-500" : "bg-transparent"
                                                        )}>
                                                            {selectedIds.has(meeting.id) && <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                                                        </div>
                                                    )}
                                                    <span className="truncate">
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
                                            "lux-card p-6 flex flex-col items-center justify-center gap-4 transition-all hover:scale-105 active:scale-95 border-2",
                                            isCurrentMonth ? "border-primary bg-primary/5" : "border-transparent hover:border-gray-200"
                                        )}
                                    >
                                        <div className={cn(
                                            "text-xl font-bold uppercase tracking-widest",
                                            isCurrentMonth ? "text-primary" : "text-gray-600"
                                        )}>
                                            {monthName}
                                        </div>

                                        <div className="flex flex-col items-center gap-1">
                                            <div className="text-4xl font-black gradient-text">
                                                {count}
                                            </div>
                                            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                                Ilość spotkań
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
                                    className="relative bg-white w-full max-w-[550px] rounded-[30px] shadow-[0_20px_60px_rgba(0,0,0,0.3)] overflow-hidden"
                                >
                                    <div className="gradient-bg p-8 relative" style={{ color: getContrastColor(selectedMeeting.team?.kolor || '#5400FF') }}>
                                        <button
                                            onClick={() => setSelectedMeeting(null)}
                                            className="absolute top-6 right-6 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-all"
                                            style={{ color: getContrastColor(selectedMeeting.team?.kolor || '#5400FF') }}
                                        >
                                            <X size={20} />
                                        </button>
                                        <h3 className="text-2xl font-bold pr-10">{selectedMeeting.opis}</h3>
                                    </div>
                                    <div className="p-8 space-y-8">
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3 text-primary font-bold text-lg">
                                                <CalendarIcon size={20} />
                                                {new Date(selectedMeeting.data).toLocaleDateString()}
                                                <span className="ml-2 px-3 py-1 bg-primary/10 rounded-lg text-sm flex items-center gap-1.5">
                                                    <Clock size={16} /> {new Date(selectedMeeting.data).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>

                                            {selectedMeeting.opisDodatkowy && (
                                                <div className="bg-[#f7f8fc] p-6 rounded-2xl border-l-[6px] border-primary text-[#444] leading-relaxed font-medium">
                                                    {selectedMeeting.opisDodatkowy}
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                                <Users size={14} /> Uczestnicy ({selectedMeeting.attendance?.length || 0})
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedMeeting.attendance && selectedMeeting.attendance.length > 0 ? (
                                                    selectedMeeting.attendance.map((att: any) => (
                                                        <span key={att.id} className={cn(
                                                            "px-4 py-2 rounded-full text-xs font-bold shadow-sm border",
                                                            att.imieNazwisko === currentUser
                                                                ? "bg-primary/5 text-primary border-primary/20"
                                                                : "bg-gray-100 text-muted-foreground border-gray-200"
                                                        )}>
                                                            {att.imieNazwisko} {att.imieNazwisko === currentUser && "(Ty)"}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <p className="text-muted-foreground italic text-sm">Brak zapisanych osób</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-gray-100 space-y-3">
                                            {!isCoord && (
                                                <button
                                                    disabled={selectedMeeting.attendance?.some((a: any) => a.imieNazwisko === currentUser)}
                                                    className={cn(
                                                        "w-full py-4 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2",
                                                        selectedMeeting.attendance?.some((a: any) => a.imieNazwisko === currentUser)
                                                            ? "bg-gray-100 text-muted-foreground cursor-not-allowed"
                                                            : "lux-gradient text-white shadow-[0_12px_30px_rgba(61,15,26,0.2)] hover:-translate-y-1"
                                                    )}
                                                    onClick={() => handleMarkAttendance(selectedMeeting.id)}
                                                >
                                                    {selectedMeeting.attendance?.some((a: any) => a.imieNazwisko === currentUser) ? "Obecność oznaczona" : "Oznacz obecność"}
                                                </button>
                                            )}

                                            {(isAdmin || isCoord) && (
                                                <div className="space-y-3">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <button
                                                            className="bg-[#f8f9fa] text-[#555] py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#eef1ff] hover:text-primary transition-all"
                                                            onClick={() => handleEditMeeting(selectedMeeting)}
                                                        >
                                                            <Edit2 size={16} /> Edytuj
                                                        </button>
                                                        <button
                                                            className="lux-btn-outline py-3 flex items-center justify-center gap-2"
                                                            onClick={() => handleDeleteMeeting(selectedMeeting.id)}
                                                        >
                                                            <Trash2 size={16} /> Usuń
                                                        </button>
                                                    </div>
                                                    <button
                                                        className="w-full py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        onClick={() => handleDeleteByName(selectedMeeting.opis)}
                                                    >
                                                        Usuń wszystkie o nazwie "{selectedMeeting.opis}"
                                                    </button>
                                                </div>
                                            )}
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
                                    className="relative bg-white w-full max-w-[520px] rounded-[30px] shadow-[0_20px_60px_rgba(0,0,0,0.3)] overflow-hidden"

                                >
                                    <div className="gradient-bg p-8 text-white relative">
                                        <button
                                            onClick={() => setShowAddMeeting(false)}
                                            className="absolute top-6 right-6 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-all"
                                        >
                                            <X size={20} />
                                        </button>
                                        <h3 className="text-2xl font-bold pr-10">Nowe spotkanie</h3>
                                    </div>
                                    <div className="p-8 space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Data</label>
                                                <input
                                                    type="date"
                                                    className="lux-input"
                                                    value={newMeeting.data}
                                                    onChange={(e) => setNewMeeting(prev => ({ ...prev, data: e.target.value }))}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Godzina</label>
                                                <input
                                                    type="time"
                                                    className="lux-input"
                                                    value={newMeeting.godzina}
                                                    onChange={(e) => setNewMeeting(prev => ({ ...prev, godzina: e.target.value }))}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Tytuł spotkania</label>
                                            <input
                                                type="text"
                                                className="lux-input"
                                                placeholder="np. Spotkanie operacyjne"
                                                value={newMeeting.opis}
                                                onChange={(e) => setNewMeeting(prev => ({ ...prev, opis: e.target.value }))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Opis dodatkowy</label>
                                            <textarea
                                                className="lux-textarea h-24 resize-none"
                                                placeholder="Opcjonalnie"
                                                value={newMeeting.opis_dodatkowy}
                                                onChange={(e) => setNewMeeting(prev => ({ ...prev, opis_dodatkowy: e.target.value }))}
                                            ></textarea>
                                        </div>

                                        {/* Recurrence Options */}
                                        <div className="space-y-4 pt-4 border-t border-gray-100">
                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary transition-all"
                                                    checked={isRecurring}
                                                    onChange={(e) => setIsRecurring(e.target.checked)}
                                                />
                                                <span className="text-sm font-bold text-gray-700 group-hover:text-primary transition-colors">Spotkanie cykliczne</span>
                                            </label>

                                            <AnimatePresence>
                                                {isRecurring && (
                                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="grid grid-cols-2 gap-4 pl-6 overflow-hidden">
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Powtarzaj co (dni)</label>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                className="lux-input"
                                                                value={recurrenceInterval}
                                                                onChange={(e) => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Do kiedy</label>
                                                            <input
                                                                type="date"
                                                                className="lux-input"
                                                                value={recurrenceEndDate}
                                                                onChange={(e) => setRecurrenceEndDate(e.target.value)}
                                                            />
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                        <div className="flex justify-end gap-3 pt-2">
                                            <button className="lux-btn-outline px-6 py-3" onClick={() => setShowAddMeeting(false)}>
                                                Anuluj
                                            </button>
                                            <button className="lux-btn px-6 py-3" onClick={handleAddMeeting}>
                                                Zapisz spotkanie
                                            </button>
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
                                    className="relative bg-white w-full max-w-[520px] rounded-[30px] shadow-[0_20px_60px_rgba(0,0,0,0.3)] overflow-hidden"
                                >
                                    <div className="gradient-bg p-8 text-white relative">
                                        <button
                                            onClick={() => setShowEditMeeting(false)}
                                            className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10"
                                        >
                                            <X size={24} />
                                        </button>
                                        <div className="flex items-center gap-4">
                                            <Edit2 size={32} />
                                            <div>
                                                <h3 className="text-2xl font-bold">Edytuj spotkanie</h3>
                                                <p className="text-sm opacity-80">Zaktualizuj dane spotkania</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-8 space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Tytuł spotkania</label>
                                            <input
                                                type="text"
                                                className="lux-input"
                                                placeholder="np. Spotkanie operacyjne"
                                                value={editMeetingData.opis}
                                                onChange={(e) => setEditMeetingData(prev => ({ ...prev, opis: e.target.value }))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Opis dodatkowy</label>
                                            <textarea
                                                className="lux-textarea h-24 resize-none"
                                                placeholder="Opcjonalnie"
                                                value={editMeetingData.opisDodatkowy}
                                                onChange={(e) => setEditMeetingData(prev => ({ ...prev, opisDodatkowy: e.target.value }))}
                                            ></textarea>
                                        </div>
                                        <div className="flex justify-end gap-3 pt-2">
                                            <button className="lux-btn-outline px-6 py-3" onClick={() => setShowEditMeeting(false)}>
                                                Anuluj
                                            </button>
                                            <button className="lux-btn px-6 py-3" onClick={handleSaveEditMeeting}>
                                                Zapisz zmiany
                                            </button>
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
                            className="fixed bottom-10 right-10 w-20 h-20 rounded-full shadow-[0_10px_40px_rgba(84,0,255,0.3)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 overflow-hidden"
                            style={{ backgroundColor: fabColor }}
                            onClick={() => setShowAddMeeting(true)}
                        >
                            <Plus size={24} color={getContrastColor(fabColor)} />
                        </button>
                    );
                })()}

            </div>
        </DashboardLayout>

    );
}
