"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
    Trash2,
    MapPin,
    User,
    Calendar,
    Plus,
    X,
    ChevronDown,
    Users,
    XCircle,
    CheckCircle
} from "lucide-react";
import { createAnnouncement, deleteAnnouncement, updateAnnouncement } from "@/lib/actions/announcements";
import { getTeamById } from "@/lib/actions/teams";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Edit2, Timer } from "lucide-react";

interface AnnouncementsClientProps {
    initialAnnouncements: any[];
    teams: any[];
    userTasks?: any[];
    isAdmin: boolean;
    isDirector?: boolean;
    isCoord: boolean;
    currentUserName: string;
    currentUserId: number;
    activeTeamId: number | null;
    userRole?: string;
    onRefresh?: () => void;
}

export default function AnnouncementsClient({
    initialAnnouncements,
    teams,
    userTasks = [],
    isAdmin,
    isDirector,
    isCoord,
    currentUserName,
    currentUserId,
    activeTeamId,
    userRole,
    onRefresh
}: AnnouncementsClientProps) {
    const router = useRouter();
    const [selectedTeamId, setSelectedTeamId] = useState<number | null>(activeTeamId || teams[0]?.id || null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingAnnouncementId, setEditingAnnouncementId] = useState<number | null>(null);

    const [newAnnouncement, setNewAnnouncement] = useState({
        title: "",
        content: "",
        typPrzypisania: "WSZYSCY",
        expiresAt: "" as string | null,
    });

    const [isPermanent, setIsPermanent] = useState(true);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [assignedUserIds, setAssignedUserIds] = useState<number[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (selectedTeamId) {
            getTeamById(selectedTeamId).then(res => {
                if (res.success && res.data) {
                    setTeamMembers(res.data.users.map((u: any) => u.user));
                }
            });
        }
    }, [selectedTeamId]);

    // Display only manual announcements (no system alerts)
    const announcements = initialAnnouncements;

    // Filter announcements for selected team
    const displayedAnnouncements = announcements.filter(a => a.teamId === selectedTeamId);

    const selectedTeam = teams.find(t => t.id === selectedTeamId);
    const selectedTeamName = selectedTeam?.nazwa || "Ogólne";

    const handleAddAnnouncement = async () => {
        if (!selectedTeamId) return;
        if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) return;

        // Validation for targeted announcements
        if (newAnnouncement.typPrzypisania === "OSOBY" && assignedUserIds.length === 0) {
            setStatusMessage({ type: 'error', text: "Wybierz przynajmniej jedną osobę lub zmień tryb na 'Cały zespół'." });
            return;
        }

        setStatusMessage(null);

        try {
            const expiryDate = isPermanent ? null : (newAnnouncement.expiresAt ? new Date(newAnnouncement.expiresAt) : null);

            if (selectedTeamId === -1) {
                // BROADCAST MODE
                if (!confirm(`Czy na pewno chcesz wysłać to ogłoszenie do WSZYSTKICH ${teams.length} zespołów?`)) return;

                const promises = teams.map(team => createAnnouncement({
                    teamId: team.id,
                    tytul: newAnnouncement.title.trim(),
                    tresc: newAnnouncement.content.trim(),
                    utworzonePrzez: currentUserName,
                    typPrzypisania: "WSZYSCY",
                    assignedUserIds: [],
                    expiresAt: expiryDate
                }));

                await Promise.all(promises);

                // Success for broadcast
                setNewAnnouncement({ title: "", content: "", typPrzypisania: "WSZYSCY", expiresAt: null });
                setAssignedUserIds([]);
                setShowAddForm(false);
                setIsPermanent(true);
                router.refresh();
                onRefresh?.();
                alert("Pomyślnie wysłano ogłoszenie do wszystkich zespołów!");

            } else {
                // SINGLE TEAM MODE
                const res = await createAnnouncement({
                    teamId: selectedTeamId,
                    tytul: newAnnouncement.title.trim(),
                    tresc: newAnnouncement.content.trim(),
                    utworzonePrzez: currentUserName,
                    typPrzypisania: newAnnouncement.typPrzypisania,
                    assignedUserIds: newAnnouncement.typPrzypisania === "OSOBY" ? assignedUserIds : [],
                    expiresAt: expiryDate
                });

                if (res.success) {
                    setNewAnnouncement({ title: "", content: "", typPrzypisania: "WSZYSCY", expiresAt: null });
                    setAssignedUserIds([]);
                    setShowAddForm(false);
                    setIsPermanent(true);
                    router.refresh();
                    onRefresh?.();
                } else {
                    setStatusMessage({ type: 'error', text: res.error || "Wystąpił błąd podczas dodawania ogłoszenia." });
                }
            }
        } catch (err: any) {
            setStatusMessage({ type: 'error', text: "Błąd krytyczny: " + err.message });
        }
    };

    const handleStartEdit = (announcement: any) => {
        setEditingAnnouncementId(announcement.id);
        setNewAnnouncement({
            title: announcement.tytul,
            content: announcement.tresc,
            typPrzypisania: announcement.typPrzypisania,
            expiresAt: announcement.expiresAt ? new Date(announcement.expiresAt).toISOString().split('T')[0] : null
        });
        setIsPermanent(!announcement.expiresAt);
        setAssignedUserIds(announcement.assignments?.map((a: any) => a.userId) || []);
        setShowAddForm(true);
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleEditAnnouncement = async () => {
        if (!editingAnnouncementId) return;
        if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) return;

        setStatusMessage(null);

        try {
            const expiryDate = isPermanent ? null : (newAnnouncement.expiresAt ? new Date(newAnnouncement.expiresAt) : null);

            const res = await updateAnnouncement(editingAnnouncementId, {
                tytul: newAnnouncement.title.trim(),
                tresc: newAnnouncement.content.trim(),
                typPrzypisania: newAnnouncement.typPrzypisania,
                assignedUserIds: newAnnouncement.typPrzypisania === "OSOBY" ? assignedUserIds : [],
                expiresAt: expiryDate
            });

            if (res.success) {
                setEditingAnnouncementId(null);
                setNewAnnouncement({ title: "", content: "", typPrzypisania: "WSZYSCY", expiresAt: null });
                setAssignedUserIds([]);
                setShowAddForm(false);
                setIsPermanent(true);
                router.refresh();
                onRefresh?.();
                setStatusMessage({ type: 'success', text: "Ogłoszenie zostało zaktualizowane." });
            } else {
                setStatusMessage({ type: 'error', text: res.error || "Błąd podczas aktualizacji." });
            }
        } catch (err: any) {
            setStatusMessage({ type: 'error', text: "Błąd krytyczny: " + err.message });
        }
    };

    const handleDeleteAnnouncement = async (id: number) => {
        if (!confirm("Czy na pewno chcesz usunąć to ogłoszenie?")) return;
        const res = await deleteAnnouncement(id);
        if (res.success) {
            router.refresh();
            onRefresh?.();
        }
    };


    const isAuthorizedToManage = isAdmin || isCoord || isDirector;

    return (
        <DashboardLayout>
            <div className="space-y-8 animate-slide-in">
                {/* Navbar-like Header Section */}
                <div className="lux-card p-8 flex flex-wrap justify-between items-center gap-6">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold gradient-text flex items-center gap-2">Ogłoszenia</h1>
                        <p className="text-muted-foreground text-sm">
                            Zespół: <strong className="text-primary">{selectedTeamId === -1 ? "WSZYSTKIE ZESPOŁY" : selectedTeamName}</strong>
                        </p>
                    </div>

                    <div className="flex gap-4 items-center">
                        {isAdmin && (
                            <select
                                value={selectedTeamId || ""}
                                onChange={(e) => setSelectedTeamId(Number(e.target.value))}
                                className={cn(
                                    "lux-select font-semibold max-w-[250px]",
                                    selectedTeamId === -1 && "bg-primary text-white border-primary ring-2 ring-primary/20"
                                )}
                            >
                                <option value="">-- Wybierz zespół --</option>
                                <option value="-1" className="font-bold bg-gray-100">📢 WSZYSTKIE ZESPOŁY (Broadcast)</option>
                                {teams.map(t => (
                                    <option key={t.id} value={t.id}>{t.nazwa}</option>
                                ))}
                            </select>
                        )}
                        {isAuthorizedToManage && (
                            <button
                                onClick={() => setShowAddForm(!showAddForm)}
                                className="lux-btn p-3"
                            >
                                {showAddForm ? <X size={20} /> : <Plus size={20} />}
                            </button>
                        )}
                    </div>
                </div>

                {/* Add Announcement Form */}
                <AnimatePresence>
                    {showAddForm && selectedTeamId && isAuthorizedToManage && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="lux-card p-8 mb-8 border border-primary/10">
                                <div className="space-y-6">
                                    {statusMessage && (
                                        <div className={cn(
                                            "p-4 rounded-xl text-sm font-bold flex items-center justify-between gap-3 animate-slide-in",
                                            statusMessage.type === 'error' ? "bg-red-50 text-red-600 border border-red-100" : "bg-green-50 text-green-600 border border-green-100"
                                        )}>
                                            <div className="flex items-center gap-3">
                                                {statusMessage.type === 'error' ? <XCircle size={18} /> : <CheckCircle size={18} />}
                                                {statusMessage.text}
                                            </div>
                                            <button onClick={() => setStatusMessage(null)} className="opacity-50 hover:opacity-100"><X size={14} /></button>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Left Column: Header, Title, Content */}
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center bg-gray-50/50 p-4 rounded-2xl border border-gray-100 mb-2">
                                                <h2 className="text-lg font-black uppercase tracking-tight text-gray-700">
                                                    {editingAnnouncementId ? "Edytuj ogłoszenie" : "Nowe ogłoszenie"}
                                                </h2>
                                                {editingAnnouncementId && (
                                                    <button
                                                        onClick={() => {
                                                            setEditingAnnouncementId(null);
                                                            setNewAnnouncement({ title: "", content: "", typPrzypisania: "WSZYSCY", expiresAt: null });
                                                            setShowAddForm(false);
                                                        }}
                                                        className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors"
                                                    >
                                                        Anuluj edycję
                                                    </button>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Tytuł ogłoszenia *</label>
                                                <input
                                                    type="text"
                                                    placeholder="np. Ważna informacja..."
                                                    className="w-full lux-input font-medium"
                                                    value={newAnnouncement.title}
                                                    onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Treść ogłoszenia *</label>
                                                <textarea
                                                    placeholder="Wpisz treść..."
                                                    className="w-full lux-textarea font-medium h-32 resize-none"
                                                    value={newAnnouncement.content}
                                                    onChange={(e) => setNewAnnouncement(prev => ({ ...prev, content: e.target.value }))}
                                                />
                                            </div>
                                        </div>

                                        {/* Right Column: Expiry, Audience, Assignments */}
                                        <div className="space-y-6">
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Wygasanie</label>
                                                    <label className="flex items-center gap-2 cursor-pointer group">
                                                        <div className={cn(
                                                            "w-10 h-5 rounded-full relative transition-colors duration-300",
                                                            isPermanent ? "bg-primary" : "bg-gray-200"
                                                        )}>
                                                            <input
                                                                type="checkbox"
                                                                className="sr-only"
                                                                checked={isPermanent}
                                                                onChange={(e) => setIsPermanent(e.target.checked)}
                                                            />
                                                            <div className={cn(
                                                                "absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-300",
                                                                isPermanent && "translate-x-5"
                                                            )} />
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-primary transition-colors">Bezterminowo</span>
                                                    </label>
                                                </div>

                                                <AnimatePresence>
                                                    {!isPermanent && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.95 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.95 }}
                                                            className="relative"
                                                        >
                                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={18} />
                                                            <input
                                                                type="date"
                                                                className="w-full lux-input pl-12 font-bold"
                                                                value={newAnnouncement.expiresAt || ""}
                                                                onChange={(e) => setNewAnnouncement(prev => ({ ...prev, expiresAt: e.target.value }))}
                                                                min={new Date().toISOString().split('T')[0]}
                                                            />
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Odbiorcy</label>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setNewAnnouncement(prev => ({ ...prev, typPrzypisania: "WSZYSCY" }))}
                                                        className={cn(
                                                            "flex-1 py-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2",
                                                            newAnnouncement.typPrzypisania === "WSZYSCY" ? "bg-primary text-white border-primary shadow-md" : "bg-white text-muted-foreground border-gray-100 hover:bg-gray-50"
                                                        )}
                                                    >
                                                        <Users size={16} />
                                                        {selectedTeamId === -1 ? "Wszyscy (wszystkie zespoły)" : "Cały zespół"}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (selectedTeamId === -1) {
                                                                alert("Wybór konkretnych osób dostępny tylko dla pojedynczego zespołu.");
                                                                return;
                                                            }
                                                            setNewAnnouncement(prev => ({ ...prev, typPrzypisania: "OSOBY" }));
                                                        }}
                                                        className={cn(
                                                            "flex-1 py-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2",
                                                            newAnnouncement.typPrzypisania === "OSOBY" ? "bg-primary text-white border-primary shadow-md" : "bg-white text-muted-foreground border-gray-100 hover:bg-gray-50",
                                                            selectedTeamId === -1 && "opacity-50 cursor-not-allowed"
                                                        )}
                                                    >
                                                        <User size={16} />
                                                        Wybrane osoby
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Search and User List */}
                                            {newAnnouncement.typPrzypisania === "OSOBY" && (
                                                <div className="space-y-3 animate-slide-in">
                                                    <div className="flex justify-between items-end">
                                                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Wybierz osoby ({assignedUserIds.length})</label>
                                                        <div className="flex gap-2 text-[10px] font-bold">
                                                            <button
                                                                onClick={() => setAssignedUserIds(teamMembers.map(u => u.id))}
                                                                className="text-primary hover:underline"
                                                            >
                                                                Zaznacz wszystkich
                                                            </button>
                                                            <span className="text-gray-300">|</span>
                                                            <button
                                                                onClick={() => setAssignedUserIds([])}
                                                                className="text-muted-foreground hover:underline"
                                                            >
                                                                Odznacz
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <input
                                                        type="text"
                                                        placeholder="Szukaj osoby..."
                                                        className="lux-input py-2 text-sm"
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                    />

                                                    <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-4 max-h-[200px] overflow-y-auto space-y-3 shadow-inner custom-scrollbar">
                                                        {teamMembers
                                                            .filter(u => u.imieNazwisko.toLowerCase().includes(searchTerm.toLowerCase()))
                                                            .map(user => (
                                                                <label key={user.id} className="flex items-center gap-3 cursor-pointer group hover:bg-white p-2 rounded-lg transition-colors">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="rounded-lg border-gray-300 text-primary focus:ring-primary w-5 h-5 transition-all"
                                                                        checked={assignedUserIds.includes(user.id)}
                                                                        onChange={(e) => {
                                                                            if (e.target.checked) setAssignedUserIds(prev => [...prev, user.id]);
                                                                            else setAssignedUserIds(prev => prev.filter(id => id !== user.id));
                                                                        }}
                                                                    />
                                                                    <div className="flex flex-col">
                                                                        <span className="text-sm font-bold text-gray-700 group-hover:text-primary transition-colors">{user.imieNazwisko}</span>
                                                                        <span className="text-[10px] text-muted-foreground">{user.rola}</span>
                                                                    </div>
                                                                </label>
                                                            ))}
                                                        {teamMembers.filter(u => u.imieNazwisko.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                                            <p className="text-xs text-muted-foreground italic text-center py-4">Brak wyników wyszukiwania</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        className={cn(
                                            "w-full lux-btn flex items-center justify-center gap-2 py-4 mt-8",
                                            editingAnnouncementId ? "bg-orange-600 hover:bg-orange-700 ring-orange-100" : ""
                                        )}
                                        onClick={editingAnnouncementId ? handleEditAnnouncement : handleAddAnnouncement}
                                    >
                                        {editingAnnouncementId ? <CheckCircle size={20} /> : <Plus size={20} />}
                                        {editingAnnouncementId ? "Zapisz zmiany" : "Opublikuj ogłoszenie"}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Announcements List */}
                <div className="lux-card p-8">
                    <h2 className="text-2xl font-bold mb-8 pb-4 border-b-4 border-primary inline-block">Tablica ogłoszeń</h2>

                    <div className="space-y-6">
                        {displayedAnnouncements.length > 0 ? (
                            displayedAnnouncements.map((o: any) => (
                                <motion.div
                                    key={o.id}
                                    layout
                                    className="lux-card p-8 border-l-4 border-primary relative group hover:scale-[1.01] transition-transform"
                                >
                                    <MapPin className="absolute top-6 right-6 opacity-30 text-primary/10" size={32} />

                                    <div className="space-y-4">
                                        <h3 className="text-xl font-bold pr-10 text-foreground">{o.tytul}</h3>

                                        <div className="flex flex-wrap gap-4 text-xs font-bold text-muted-foreground">
                                            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-foreground bg-gray-100">
                                                <User size={14} /> {o.utworzonePrzez}
                                            </span>
                                            <span className="flex items-center gap-1.5 bg-black/5 px-3 py-1.5 rounded-full">
                                                <Calendar size={14} /> {new Date(o.dataUtworzenia).toLocaleString('pl-PL')}
                                            </span>
                                        </div>

                                        <div className="text-foreground leading-relaxed whitespace-pre-wrap font-medium">
                                            {o.tresc}
                                        </div>

                                        {isAuthorizedToManage && (
                                            <div className="flex justify-end pt-4 border-t border-black/5 gap-3">
                                                {o.expiresAt && (
                                                    <span className="mr-auto flex items-center gap-1.5 text-[10px] font-black uppercase text-orange-500 bg-orange-50 px-3 py-1 rounded-lg">
                                                        <Timer size={12} /> Wygasa: {new Date(o.expiresAt).toLocaleDateString()}
                                                    </span>
                                                )}
                                                {!o.expiresAt && (
                                                    <span className="mr-auto flex items-center gap-1.5 text-[10px] font-black uppercase text-green-500 bg-green-50 px-3 py-1 rounded-lg">
                                                        <CheckCircle size={12} /> Bezterminowo
                                                    </span>
                                                )}
                                                <button
                                                    className="lux-btn-outline text-xs flex items-center gap-2 bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100"
                                                    onClick={() => handleStartEdit(o)}
                                                >
                                                    <Edit2 size={14} /> Edytuj
                                                </button>
                                                <button
                                                    className="lux-btn-outline text-xs flex items-center gap-2"
                                                    onClick={() => handleDeleteAnnouncement(o.id)}
                                                >
                                                    <Trash2 size={14} /> Usuń
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="text-center py-20 opacity-30 space-y-4">
                                <div className="text-5xl text-muted-foreground"> - </div>
                                <p className="font-bold text-xl uppercase tracking-widest">Brak ogłoszeń</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
