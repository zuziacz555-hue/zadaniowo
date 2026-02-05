"use client";

import TasksClient from "@/components/tasks/TasksClient";
import { getSystemSettings } from "@/lib/actions/settings";
import { getTasks } from "@/lib/actions/tasks";
import { getUserTeams } from "@/lib/actions/teams";
import { useEffect, useState } from "react";

export default function TasksPage() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [user, setUser] = useState<any>(null);
    const [settings, setSettings] = useState<any>(null);
    const [activeTeamId, setActiveTeamId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = async () => {
        try {
            const storedUser = localStorage.getItem("user");
            const storedTeamName = localStorage.getItem("activeTeam");

            // Fetch settings
            const settingsRes = await getSystemSettings();
            if (settingsRes.success) {
                setSettings(settingsRes.data);
            }

            if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);

                // Fetch teams to find the active team ID
                const teamsRes = await getUserTeams(parsedUser.id);
                let teamId: number | null = null;
                let activeRole: string | null = null;

                if (teamsRes.success && teamsRes.data && teamsRes.data.length > 0) {
                    let selectedTeam = null;

                    // 1. Try strict ID match from Dashboard (Authoritative)
                    const storedTeamId = localStorage.getItem("activeTeamId");

                    if (storedTeamId) {
                        selectedTeam = teamsRes.data.find((ut: any) => ut.team.id === Number(storedTeamId));
                    }

                    // 2. Fallback to name match if ID failed
                    if (!selectedTeam && storedTeamName) {
                        selectedTeam = teamsRes.data.find((ut: any) => ut.team.nazwa === storedTeamName);
                    }

                    // 3. Smart fallback: Prefer coordinator teams, then first team
                    if (!selectedTeam) {
                        const coordTeam = teamsRes.data.find((ut: any) =>
                            ut.rola.toUpperCase() === "KOORDYNATORKA"
                        );
                        selectedTeam = coordTeam || teamsRes.data[0];

                        // Auto-correct localStorage
                        localStorage.setItem("activeTeam", selectedTeam.team.nazwa);
                        localStorage.setItem("activeTeamId", selectedTeam.team.id.toString());
                    }

                    // Extract teamId and role
                    teamId = selectedTeam.team.id;
                    activeRole = selectedTeam.rola.toUpperCase();

                    localStorage.setItem("activeRole", activeRole);
                    setActiveTeamId(teamId);
                }

                console.log("Fetching tasks for:", { teamId, userId: parsedUser.id, role: activeRole });

                const tasksRes = await getTasks({
                    teamId: teamId || undefined, // undefined to allow global/personal search if no team
                    userId: parsedUser.id,
                    role: activeRole || parsedUser.role
                });

                if (tasksRes.success && tasksRes.data) {
                    console.log("Tasks loaded:", tasksRes.data.length);
                    setTasks(tasksRes.data);
                } else {
                    console.error("Failed to load tasks:", tasksRes.error);
                }
            }
        } catch (err) {
            console.error("Critical error in TasksPage loadData:", err);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

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

    return (
        <TasksClient
            initialTasks={tasks}
            userId={user.id}
            userRole={localStorage.getItem("activeRole") || user.role}
            userName={user.imieNazwisko || user.name}
            teamId={activeTeamId}
            settings={settings}
            onRefresh={loadData}
        />
    );
}
