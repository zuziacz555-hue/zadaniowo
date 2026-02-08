"use client";

import AnnouncementsClient from "@/components/announcements/AnnouncementsClient";
import { getAnnouncements } from "@/lib/actions/announcements";
import { getTeams } from "@/lib/actions/teams";
import { getTasks } from "@/lib/actions/tasks";
import { useEffect, useState } from "react";

export default function AnnouncementsPage() {
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
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

                const teamId = storedTeamId ? Number(storedTeamId) : undefined;
                const annRes = await getAnnouncements(teamId, parsedUser.id);
                const teamsRes = await getTeams();
                // Fetch tasks for overdue check
                const tasksRes = await getTasks({ userId: parsedUser.id, role: parsedUser.role });

                if (annRes.success) setAnnouncements(annRes.data || []);
                if (teamsRes.success) setTeams(teamsRes.data || []);
                if (tasksRes.success) setTasks(tasksRes.data || []);
            }
            setIsLoading(false);
        };
        loadData();
    }, [refreshTrigger]);

    // ... (rendering)

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

    const isSystem = (user.name || "").toLowerCase() === "system" || (user.imieNazwisko || "").toLowerCase() === "system" || activeRole === "SYSTEM";
    const isAdmin = activeRole === "ADMINISTRATOR" || user.role === "ADMINISTRATOR" || isSystem;
    const isDirector = activeRole === "DYREKTORKA" || user.role === "DYREKTORKA";
    const isCoord = activeRole === "KOORDYNATORKA" || isAdmin;

    return (
        <AnnouncementsClient
            initialAnnouncements={announcements}
            teams={teams}
            userTasks={tasks}
            isAdmin={isAdmin}
            isDirector={isDirector}
            isCoord={isCoord}
            currentUserName={user.name}
            currentUserId={user.id}
            activeTeamId={localStorage.getItem("activeTeamId") ? Number(localStorage.getItem("activeTeamId")) : null}
            userRole={activeRole || user.role}
            onRefresh={handleRefresh}
        />
    );
}
