"use client";

import MeetingsClient from "@/components/meetings/MeetingsClient";
import { getMeetings } from "@/lib/actions/meetings";
import { getTeams } from "@/lib/actions/teams";
import { useEffect, useState } from "react";

export default function MeetingsPage() {
    const [meetings, setMeetings] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
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

                // Normalize role similar to DashboardLayout
                const userRole = (parsedUser.rola || parsedUser.role || "").toUpperCase();
                setActiveRole(storedRole?.toUpperCase() || userRole);

                const teamId = storedTeamId ? Number(storedTeamId) : undefined;
                const meetingsRes = await getMeetings(teamId);
                const teamsRes = await getTeams();

                if (meetingsRes.success) setMeetings(meetingsRes.data || []);
                if (teamsRes.success) setTeams(teamsRes.data || []);
            }
            setIsLoading(false);
        };
        loadData();
    }, [refreshTrigger]); // Re-run when refreshTrigger changes

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

    const normalizedUserRole = (user.rola || user.role || "").toUpperCase();
    const isSystem = (user.name || "").toLowerCase() === "system" || (user.imieNazwisko || "").toLowerCase() === "system" || activeRole === "SYSTEM";
    const isAdmin = activeRole === "ADMINISTRATOR" || normalizedUserRole === "ADMINISTRATOR" || isSystem;
    const isDirector = activeRole === "DYREKTORKA" || normalizedUserRole === "DYREKTORKA";
    const isCoord = activeRole === "KOORDYNATORKA" || isAdmin;

    return (
        <MeetingsClient
            initialMeetings={meetings}
            teams={teams}
            isAdmin={isAdmin}
            isDirector={isDirector}
            isCoord={isCoord}
            currentUser={user.name}
            currentUserId={user.id}
            activeTeamId={localStorage.getItem("activeTeamId") ? Number(localStorage.getItem("activeTeamId")) : null}
            onRefresh={handleRefresh}
        />
    );
}
