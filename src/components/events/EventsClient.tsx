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
    Infinity as InfinityIcon
} from "lucide-react";
import { createEvent, deleteEvent, registerForEvent, unregisterFromEvent } from "@/lib/actions/events";
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
    const [newEvent, setNewEvent] = useState({ name: "", datetime: "", limit: "0" });

    const handleToggleRegistration = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleAddEvent = async () => {
        if (!newEvent.name.trim() || !newEvent.datetime) return;
        const limitNumber = Number(newEvent.limit);

        const res = await createEvent({
            nazwa: newEvent.name.trim(),
            data: newEvent.datetime,
            limitOsob: limitNumber <= 0 ? undefined : limitNumber
        });

        if (res.success) {
            setNewEvent({ name: "", datetime: "", limit: "0" });
            router.refresh(); // Keep for server components if any
            onRefresh?.();
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

    return (
        <DashboardLayout>
            <div className="space-y-8 animate-slide-in">
                {/* Header */}
                <div className="lux-card p-10 text-center">
                    <h1 className="text-4xl font-bold text-foreground mb-2">Wydarzenia</h1>
                    <p className="text-muted-foreground">Zarządzaj wydarzeniami i zapisami uczestników</p>
                </div>

                {/* Add Event (Admin Only) */}
                {isAdmin && (
                    <div className="lux-card p-8">
                        <h3 className="text-xl font-bold mb-6 text-primary flex items-center gap-2">
                            <Plus size={20} /> Dodaj nowe wydarzenie
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-muted-foreground">Nazwa wydarzenia</label>
                                <input
                                    type="text"
                                    placeholder="np. Warsztaty..."
                                    className="lux-input"
                                    value={newEvent.name}
                                    onChange={(e) => setNewEvent(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-muted-foreground">Data i godzina</label>
                                <input
                                    type="datetime-local"
                                    className="lux-input"
                                    value={newEvent.datetime}
                                    onChange={(e) => setNewEvent(prev => ({ ...prev, datetime: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-muted-foreground">Limit miejsc (0 = brak)</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    className="lux-input"
                                    value={newEvent.limit}
                                    onChange={(e) => setNewEvent(prev => ({ ...prev, limit: e.target.value }))}
                                />
                            </div>
                        </div>
                        <button className="w-full mt-6 lux-btn w-full" onClick={handleAddEvent}>
                            Dodaj wydarzenie
                        </button>
                    </div>
                )}

                {/* Events Table Container */}
                <div className="lux-card p-8 overflow-hidden">
                    <h2 className="text-2xl font-bold mb-6 pb-4 border-b border-gray-100 inline-block">Lista wydarzeń</h2>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="gradient-bg text-white">
                                    <th className="px-6 py-4 text-left font-bold rounded-l-xl">Wydarzenie</th>
                                    <th className="px-6 py-4 text-left font-bold">Data i godzina</th>
                                    <th className="px-6 py-4 text-left font-bold">Miejsca</th>
                                    <th className="px-6 py-4 text-left font-bold">Uczestnicy</th>
                                    <th className="px-6 py-4 text-center font-bold rounded-r-xl">
                                        {isAdmin ? "Akcje" : "Zapis"}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {initialEvents.map((event) => {
                                    const eventDate = event.data ? new Date(event.data) : null;
                                    const isPast = eventDate ? eventDate < new Date() : false;

                                    const userRegistration = event.participants.find((p: any) => p.userId === userId);
                                    const registered = !!userRegistration;

                                    const count = event.participants.length;
                                    const limit = event.limitOsob;
                                    const isFull = limit !== null && count >= limit;

                                    return (
                                        <tr key={event.id} className={cn(
                                            "border-b border-gray-100 transition-colors group hover:bg-gray-50/50",
                                            isPast && "opacity-60"
                                        )}>
                                            <td className="px-6 py-6">
                                                <div className="font-bold text-lg">{event.nazwa}</div>
                                                {isPast && <span className="text-xs text-muted-foreground font-bold uppercase">(Zakończone)</span>}
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="flex flex-col gap-2">
                                                    <span className={cn(
                                                        "inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold w-fit",
                                                        isPast ? "bg-gray-100 text-muted-foreground" : "bg-orange-50 text-orange-600"
                                                    )}>
                                                        <Calendar size={12} /> {eventDate ? eventDate.toLocaleDateString() : "Bez daty"}
                                                    </span>
                                                    <span className={cn(
                                                        "inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold w-fit",
                                                        isPast ? "bg-gray-100 text-muted-foreground" : "bg-orange-50 text-orange-600"
                                                    )}>
                                                        <Clock size={12} /> {eventDate ? eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                {limit === null ? (
                                                    <span className="inline-flex items-center gap-1 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-sm font-bold">
                                                        <InfinityIcon size={14} /> Bez limitu
                                                    </span>
                                                ) : (
                                                    <span className={cn(
                                                        "inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-bold",
                                                        isFull ? "bg-red-50 text-red-600" :
                                                            (count / limit >= 0.8) ? "bg-orange-50 text-orange-600" : "bg-green-50 text-green-600"
                                                    )}>
                                                        {count} / {limit} {isFull && "(PEŁNE)"}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="flex flex-wrap gap-2 max-w-[300px]">
                                                    {event.participants.length > 0 ? (
                                                        event.participants.map((p: any) => (
                                                            <span key={p.id} className={cn(
                                                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                                                p.userId === userId
                                                                    ? "bg-primary/10 text-primary border border-primary/20"
                                                                    : "bg-gray-100 text-muted-foreground border border-gray-200"
                                                            )}>
                                                                {p.imieNazwisko} {p.userId === userId && "(Ty)"}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-muted-foreground italic text-sm">Brak zapisów</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 text-center">
                                                {isAdmin ? (
                                                    <div className="flex justify-center gap-2">
                                                        {registered && userRegistration ? (
                                                            <button className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-600 hover:text-white transition-all" onClick={() => handleUnregister(userRegistration.id)}>
                                                                <X size={16} />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                className="bg-green-50 text-green-600 p-2 rounded-lg hover:bg-green-600 hover:text-white transition-all disabled:opacity-50"
                                                                onClick={() => registerForEvent(event.id, currentUser, userId).then(() => { router.refresh(); onRefresh?.(); })}
                                                                disabled={isFull || isPast}
                                                            >
                                                                <Plus size={16} />
                                                            </button>
                                                        )}
                                                        <button className="lux-btn-outline p-2" onClick={() => handleDeleteEvent(event.id)}>
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    !isPast && (
                                                        registered && userRegistration ? (
                                                            <button className="lux-btn text-xs px-5 py-2 flex items-center gap-2 mx-auto" onClick={() => handleUnregister(userRegistration.id)}>
                                                                <X size={14} /> Wypisz
                                                            </button>
                                                        ) : (
                                                            <input
                                                                type="checkbox"
                                                                disabled={isFull}
                                                                checked={selectedIds.includes(event.id)}
                                                                onChange={() => handleToggleRegistration(event.id)}
                                                                className="w-6 h-6 rounded-lg text-primary focus:ring-primary accent-primary cursor-pointer disabled:opacity-50"
                                                            />
                                                        )
                                                    )
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {!isAdmin && entriesExistToSubmit(initialEvents, currentUser) && (
                        <div className="mt-10 text-center">
                            <button
                                className="lux-btn"
                                onClick={handleSubmitRegistrations}
                            >
                                Zapisz się na zaznaczone wydarzenia
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
