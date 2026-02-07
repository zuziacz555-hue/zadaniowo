"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
    Trash2,
    X,
    Calendar,
    Clock,
    Plus,
    Infinity as InfinityIcon,
    Edit2
} from "lucide-react";
import { createEvent, deleteEvent, registerForEvent, unregisterFromEvent, updateEvent } from "@/lib/actions/events";
import { useRouter } from "next/navigation";

export default function EventsClient({
    initialEvents,
    isAdmin,
    userId,
    currentUser,
    onRefresh
}: {
    initialEvents: any[],
    isAdmin: boolean,
    userId: number,
    currentUser: string,
    onRefresh?: () => void
}) {
    const router = useRouter();
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [newEvent, setNewEvent] = useState({ name: "", datetime: "", limit: "0", signupDeadline: "" });

    // Edit State
    const [showEditEvent, setShowEditEvent] = useState(false);
    const [editEventData, setEditEventData] = useState({
        id: 0,
        name: "",
        datetime: "",
        limit: "0",
        signupDeadline: ""
    });

    const handleEditEvent = (event: any) => {
        console.log("Editing event:", event);
        setEditEventData({
            id: event.id,
            name: event.nazwa,
            datetime: event.data ? new Date(event.data).toISOString().slice(0, 16) : "",
            limit: event.limitOsob ? String(event.limitOsob) : "0",
            signupDeadline: event.signupDeadline ? new Date(event.signupDeadline).toISOString().slice(0, 16) : ""
        });
        setShowEditEvent(true);
    };

    const handleSaveEditEvent = async () => {
        console.log("Saving edit...", editEventData);
        if (!editEventData.name || !editEventData.datetime) {
            alert("Nazwa i data są wymagane!");
            return;
        }

        const limitNumber = Number(editEventData.limit);
        const res = await updateEvent(editEventData.id, {
            nazwa: editEventData.name,
            data: editEventData.datetime || undefined,
            limitOsob: limitNumber <= 0 ? undefined : limitNumber,
            signupDeadline: editEventData.signupDeadline
        });

        console.log("Update result:", res);
        if (res.success) {
            setShowEditEvent(false);
            router.refresh();
            onRefresh?.();
        } else {
            alert("Błąd podczas zapisywania zmian.");
        }
    };

    const handleToggleRegistration = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleAddEvent = async () => {
        console.log("Adding event...", newEvent);
        if (!newEvent.name.trim() || !newEvent.datetime) {
            alert("Wypełnij nazwę i datę wydarzenia!");
            return;
        }

        const limitNumber = Number(newEvent.limit);

        const res = await createEvent({
            nazwa: newEvent.name.trim(),
            data: newEvent.datetime,
            limitOsob: limitNumber <= 0 ? undefined : limitNumber,
            signupDeadline: newEvent.signupDeadline || undefined
        });

        console.log("Create result:", res);
        if (res.success) {
            setNewEvent({ name: "", datetime: "", limit: "0", signupDeadline: "" });
            router.refresh();
            onRefresh?.();
        } else {
            alert("Błąd podczas dodawania wydarzenia.");
        }
    };

    const handleDeleteEvent = async (id: number) => {
        if (!confirm("Czy na pewno chcesz usunąć to wydarzenie?")) return;
        const res = await deleteEvent(id);
        if (res.success) {
            router.refresh();
            onRefresh?.();
        }
    };

    const handleSubmitRegistrations = async () => {
        if (selectedIds.length === 0) return;

        await Promise.all(selectedIds.map(id => registerForEvent(id, currentUser, userId)));

        setSelectedIds([]);
        router.refresh();
        onRefresh?.();
    };

    const handleUnregister = async (registrationId: number) => {
        const res = await unregisterFromEvent(registrationId);
        if (res.success) {
            router.refresh();
            onRefresh?.();
        }
    };

    const entriesExistToSubmit = (evts: any[], user: string) => {
        const now = new Date();
        return evts.some(e => new Date(e.data) > now && !e.participants.some((p: any) => p.imieNazwisko === user));
    };

    const [showAddEvent, setShowAddEvent] = useState(false);

    return (
        <DashboardLayout>
            <div className="space-y-10 animate-slide-in pb-20">
                {/* Header Section */}
                <div className="glass-panel p-10 rounded-[32px] flex flex-wrap justify-between items-center gap-8 relative overflow-hidden">
                    {/* Background Glow */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-orange-500/10 rounded-full blur-[80px]" />

                    <div className="relative z-10 space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-600">
                                <Calendar size={24} />
                            </div>
                            <h1 className="text-4xl font-black tracking-tight text-foreground">Wydarzenia</h1>
                        </div>
                        <p className="text-muted-foreground font-medium">Bierz udział w warsztatach, spotkaniach i wspólnych inicjatywach</p>
                    </div>

                    <div className="relative z-10 flex flex-wrap gap-4 items-center">
                        {isAdmin && (
                            <button
                                onClick={() => setShowAddEvent(true)}
                                className="lux-btn flex items-center gap-2 group bg-orange-600 hover:bg-orange-700 shadow-orange-200"
                            >
                                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform">
                                    <Plus size={14} />
                                </div>
                                Nowe wydarzenie
                            </button>
                        )}
                        {!isAdmin && entriesExistToSubmit(initialEvents, currentUser) && selectedIds.length > 0 && (
                            <button
                                className="lux-btn bg-primary shadow-primary/20"
                                onClick={handleSubmitRegistrations}
                            >
                                Zapisz się ({selectedIds.length})
                            </button>
                        )}
                    </div>
                </div>

                {/* Events Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {initialEvents.map((event) => {
                        const eventDate = event.data ? new Date(event.data) : null;
                        const isPast = eventDate ? eventDate < new Date() : false;
                        const userRegistration = event.participants.find((p: any) => p.userId === userId);
                        const registered = !!userRegistration;
                        const count = event.participants.length;
                        const limit = event.limitOsob;
                        const isFull = limit !== null && count >= limit;
                        const isDeadlinePassed = event.signupDeadline ? new Date() > new Date(event.signupDeadline) : false;

                        return (
                            <motion.div
                                key={event.id}
                                whileHover={{ y: -8 }}
                                className={cn(
                                    "glass-panel rounded-[40px] overflow-hidden flex flex-col transition-all duration-500 group relative",
                                    isPast && "opacity-60 grayscale-[0.3]"
                                )}
                            >
                                {/* Event Header Background / Accent */}
                                <div className="h-32 relative overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100/50">
                                    <div className="absolute top-6 right-6 z-10">
                                        {limit === null ? (
                                            <div className="px-4 py-1.5 bg-blue-500/10 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20 backdrop-blur-md">
                                                Bez limitu
                                            </div>
                                        ) : (
                                            <div className={cn(
                                                "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border backdrop-blur-md",
                                                isFull ? "bg-red-500/10 text-red-600 border-red-500/20" : "bg-green-500/10 text-green-600 border-green-500/20"
                                            )}>
                                                {count} / {limit} Miejsc
                                            </div>
                                        )}
                                    </div>

                                    {/* Date Badge */}
                                    <div className="absolute top-6 left-6 z-10">
                                        <div className="flex flex-col items-center bg-white/80 p-3 rounded-[24px] shadow-sm border border-white backdrop-blur-xl min-w-[60px]">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                                                {eventDate?.toLocaleDateString('pl-PL', { month: 'short' })}
                                            </span>
                                            <span className="text-2xl font-black text-foreground leading-tight">
                                                {eventDate?.getDate()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Abstract Pattern */}
                                    <div className="absolute inset-0 opacity-10 flex items-center justify-center scale-150 rotate-12">
                                        <Calendar size={120} className="text-orange-500" />
                                    </div>
                                </div>

                                <div className="p-8 space-y-6 flex-1 flex flex-col">
                                    <div className="space-y-3 flex-1">
                                        <h3 className="text-2xl font-black tracking-tight text-foreground group-hover:text-orange-600 transition-colors">
                                            {event.nazwa}
                                        </h3>

                                        <div className="flex flex-wrap gap-4">
                                            <div className="flex items-center gap-2 text-muted-foreground font-bold text-xs bg-white/40 px-3 py-1.5 rounded-xl border border-white/60">
                                                <Clock size={14} className="text-orange-500" />
                                                {eventDate?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            {event.signupDeadline && (
                                                <div className={cn(
                                                    "flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-xl border",
                                                    isDeadlinePassed ? "bg-red-50/50 text-red-600 border-red-100" : "bg-green-50/50 text-green-600 border-green-100"
                                                )}>
                                                    Zapisy do: {new Date(event.signupDeadline).toLocaleDateString()}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Participants Thumbnails / List */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Uczestnicy</span>
                                            <span className="text-[10px] font-bold bg-white/60 px-2 py-0.5 rounded-lg border border-white/60">{count} osób</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {event.participants.length > 0 ? (
                                                event.participants.slice(0, 5).map((p: any) => (
                                                    <div key={p.id} className={cn(
                                                        "px-3 py-1.5 rounded-xl text-[10px] font-bold shadow-sm border transition-all",
                                                        p.userId === userId ? "bg-orange-600 text-white border-orange-600" : "bg-white/60 text-muted-foreground border-white/80"
                                                    )}>
                                                        {p.imieNazwisko.split(' ')[0]}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-muted-foreground italic text-[10px]">Brak zapisanych osób</div>
                                            )}
                                            {event.participants.length > 5 && (
                                                <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-[10px] font-black text-orange-600 border border-orange-200">
                                                    +{event.participants.length - 5}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <div className="pt-4 mt-auto">
                                        {isAdmin ? (
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => handleEditEvent(event)}
                                                    className="w-full py-4 bg-white/60 hover:bg-white text-foreground rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-white/80 shadow-sm flex items-center justify-center gap-2"
                                                >
                                                    <Edit2 size={14} /> Edytuj
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteEvent(event.id)}
                                                    className="w-full py-4 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-red-100 shadow-sm flex items-center justify-center gap-2"
                                                >
                                                    <Trash2 size={14} /> Usuń
                                                </button>
                                            </div>
                                        ) : (
                                            !isPast && (
                                                registered && userRegistration ? (
                                                    <button
                                                        onClick={() => handleUnregister(userRegistration.id)}
                                                        className="w-full py-4 bg-white/60 hover:bg-red-50 hover:text-red-500 text-foreground rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-white/80 shadow-sm flex items-center justify-center gap-2 group/btn"
                                                    >
                                                        <X size={14} className="group-hover/btn:rotate-90 transition-transform" /> Jesteś zapisana
                                                    </button>
                                                ) : (
                                                    <label className={cn(
                                                        "w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border shadow-sm flex items-center justify-center gap-3 cursor-pointer select-none",
                                                        isFull || isDeadlinePassed
                                                            ? "bg-gray-100 text-muted-foreground opacity-60 cursor-not-allowed border-gray-200"
                                                            : selectedIds.includes(event.id)
                                                                ? "bg-orange-600 text-white border-orange-600 shadow-orange-200 scale-95"
                                                                : "bg-orange-50/50 hover:bg-orange-600 hover:text-white text-orange-600 border-orange-100"
                                                    )}>
                                                        <input
                                                            type="checkbox"
                                                            className="hidden"
                                                            disabled={isFull || isDeadlinePassed}
                                                            checked={selectedIds.includes(event.id)}
                                                            onChange={() => handleToggleRegistration(event.id)}
                                                        />
                                                        {selectedIds.includes(event.id) ? "Wybrano do zapisu" : (isFull ? "Brak wolnych miejsc" : (isDeadlinePassed ? "Zapisy zamknięte" : "Zapisz się"))}
                                                    </label>
                                                )
                                            )
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Add Event Modal */}
            <AnimatePresence>
                {showAddEvent && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowAddEvent(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-[20px]"
                        />
                        <motion.div
                            initial={{ scale: 0.95, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 20, opacity: 0 }}
                            className="relative glass-panel w-full max-w-[550px] rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.4)] overflow-hidden border-white/40"
                        >
                            <div className="p-10 space-y-8 relative overflow-hidden">
                                <div className="absolute -top-12 -left-12 w-48 h-48 bg-orange-500/10 rounded-full blur-[60px]" />

                                <div className="relative z-10 flex justify-between items-start">
                                    <div className="space-y-1">
                                        <span className="px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-orange-600 shadow-sm">
                                            Wydarzenie
                                        </span>
                                        <h3 className="text-3xl font-black tracking-tight text-foreground">Nowe wydarzenie</h3>
                                    </div>
                                    <button
                                        onClick={() => setShowAddEvent(false)}
                                        className="w-10 h-10 flex items-center justify-center bg-white/40 hover:bg-white/60 rounded-full transition-all border border-white/40 shadow-sm"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="relative z-10 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Nazwa wydarzenia</label>
                                        <input
                                            type="text"
                                            className="lux-input bg-white/60 focus:bg-white shadow-sm"
                                            placeholder="np. Warsztaty dekorowania..."
                                            value={newEvent.name}
                                            onChange={(e) => setNewEvent(prev => ({ ...prev, name: e.target.value }))}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Termin</label>
                                            <input
                                                type="datetime-local"
                                                className="lux-input bg-white/60 focus:bg-white shadow-sm"
                                                value={newEvent.datetime}
                                                onChange={(e) => setNewEvent(prev => ({ ...prev, datetime: e.target.value }))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Limit miejsc</label>
                                            <input
                                                type="number"
                                                className="lux-input bg-white/60 focus:bg-white shadow-sm"
                                                placeholder="0 = bez limitu"
                                                value={newEvent.limit}
                                                onChange={(e) => setNewEvent(prev => ({ ...prev, limit: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Koniec zapisów (opcjonalnie)</label>
                                        <input
                                            type="datetime-local"
                                            className="lux-input bg-white/60 focus:bg-white shadow-sm"
                                            value={newEvent.signupDeadline}
                                            onChange={(e) => setNewEvent(prev => ({ ...prev, signupDeadline: e.target.value }))}
                                        />
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4">
                                        <button className="flex-1 px-6 py-4 rounded-2xl font-bold bg-white/40 border border-white/60 hover:bg-white transition-all shadow-sm" onClick={() => setShowAddEvent(false)}>
                                            Anuluj
                                        </button>
                                        <button className="flex-[2] lux-btn py-4 bg-orange-600 hover:bg-orange-700 shadow-orange-200" onClick={handleAddEvent}>
                                            Utwórz wydarzenie
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showEditEvent && (
                    <EditEventModal
                        show={showEditEvent}
                        onClose={() => setShowEditEvent(false)}
                        onSave={handleSaveEditEvent}
                        data={editEventData}
                        setData={setEditEventData}
                    />
                )}
            </AnimatePresence>
        </DashboardLayout>
    );
}

function EditEventModal({ show, onClose, onSave, data, setData }: any) {
    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-[20px]"
                onClick={onClose}
            />
            <motion.div
                initial={{ scale: 0.95, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 20, opacity: 0 }}
                className="relative glass-panel w-full max-w-[550px] rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.4)] overflow-hidden border-white/40"
            >
                <div className="p-10 space-y-8 relative overflow-hidden">
                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-orange-500/10 rounded-full blur-[60px]" />

                    <div className="relative z-10 flex justify-between items-start">
                        <div className="space-y-1">
                            <span className="px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-orange-600 shadow-sm">
                                Edycja
                            </span>
                            <h3 className="text-3xl font-black tracking-tight text-foreground">Edytuj wydarzenie</h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 flex items-center justify-center bg-white/40 hover:bg-white/60 rounded-full transition-all border border-white/40 shadow-sm"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="relative z-10 space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Nazwa wydarzenia</label>
                            <input
                                type="text"
                                className="lux-input bg-white/60 focus:bg-white shadow-sm"
                                value={data.name}
                                onChange={(e) => setData((prev: any) => ({ ...prev, name: e.target.value }))}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Termin</label>
                                <input
                                    type="datetime-local"
                                    className="lux-input bg-white/60 focus:bg-white shadow-sm"
                                    value={data.datetime}
                                    onChange={(e) => setData((prev: any) => ({ ...prev, datetime: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Limit miejsc</label>
                                <input
                                    type="number"
                                    className="lux-input bg-white/60 focus:bg-white shadow-sm"
                                    value={data.limit}
                                    onChange={(e) => setData((prev: any) => ({ ...prev, limit: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Koniec zapisów</label>
                            <input
                                type="datetime-local"
                                className="lux-input bg-white/60 focus:bg-white shadow-sm"
                                value={data.signupDeadline}
                                onChange={(e) => setData((prev: any) => ({ ...prev, signupDeadline: e.target.value }))}
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button className="flex-1 px-6 py-4 rounded-2xl font-bold bg-white/40 border border-white/60 hover:bg-white transition-all shadow-sm" onClick={onClose}>
                                Anuluj
                            </button>
                            <button className="flex-[2] lux-btn py-4 bg-orange-600 hover:bg-orange-700 shadow-orange-200" onClick={onSave}>
                                Zapisz zmiany
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
