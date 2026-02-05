"use client";

import EventsClient from "@/components/events/EventsClient";
import { getEvents } from "@/lib/actions/events";
import { useEffect, useState } from "react";

export default function EventsPage() {
    const [events, setEvents] = useState<any[]>([]);
    const [user, setUser] = useState<any>(null);
    const [activeRole, setActiveRole] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    useEffect(() => {
        const loadData = async () => {
            const storedUser = localStorage.getItem("user");
            const storedRole = localStorage.getItem("activeRole");
            const storedTeamId = localStorage.getItem("activeTeamId");

            if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                setActiveRole(storedRole?.toUpperCase() || parsedUser.role);

                const res = await getEvents(storedTeamId ? Number(storedTeamId) : undefined);
                if (res.success) {
                    setEvents(res.data || []);
                }
            }
            setIsLoading(false);
        };
        loadData();
    }, [refreshTrigger]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <h1 className="text-2xl font-bold">Wymagane logowanie</h1>
                <a href="/" className="lux-btn">Wróć do logowania</a>
            </div>
        );
    }

    const isAdmin = activeRole === "ADMINISTRATOR" || user.role === "ADMINISTRATOR";

    return (
        <EventsClient
            initialEvents={events}
            isAdmin={isAdmin}
            userId={user.id}
            currentUser={user.name}
            onRefresh={handleRefresh}
        />
    );
}
