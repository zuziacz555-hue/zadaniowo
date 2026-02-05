"use client";

import TeamsClient from "@/components/teams/TeamsClient";
import { getTeams } from "@/lib/actions/teams";
import { useEffect, useState } from "react";

export default function AdminTeamsPage() {
    const [teams, setTeams] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [activeRole, setActiveRole] = useState<string>("");
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    useEffect(() => {
        const loadTeams = async () => {
            const storedUser = localStorage.getItem("user");
            const storedRole = localStorage.getItem("activeRole");
            const storedTeamId = localStorage.getItem("activeTeamId");

            if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                const role = storedRole?.toUpperCase() || parsedUser.role;
                setActiveRole(role);

                const res = await getTeams();
                if (res.success) {
                    let allTeams = res.data || [];

                    // If not Admin, filter to only show active team
                    const isAdmin = role === "ADMINISTRATOR" || parsedUser.role === "ADMINISTRATOR";
                    if (!isAdmin && storedTeamId) {
                        allTeams = allTeams.filter(t => t.id === Number(storedTeamId));
                    }

                    setTeams(allTeams);
                }
            }
            setIsLoading(false);
        };
        loadTeams();
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
    const isCoord = activeRole === "KOORDYNATORKA" || isAdmin;

    return <TeamsClient
        initialTeams={teams}
        isAdmin={isAdmin}
        isCoord={isCoord}
        activeTeamId={localStorage.getItem("activeTeamId") ? Number(localStorage.getItem("activeTeamId")) : null}
        onRefresh={handleRefresh}
        currentUserId={user?.id}
    />;
}
