"use client";

import SubmissionsClient from "@/components/submissions/SubmissionsClient";
import { getTasks } from "@/lib/actions/tasks";
import { getTeams } from "@/lib/actions/teams"; // Import added
import { useEffect, useState } from "react";

export default function SubmissionsPage() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]); // Added teams state
    const [user, setUser] = useState<any>(null);
    const [activeRole, setActiveRole] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);

    const loadData = async () => {
        const storedUser = localStorage.getItem("user");
        const storedRole = localStorage.getItem("activeRole");
        const storedTeamId = localStorage.getItem("activeTeamId");

        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            const role = storedRole?.toUpperCase() || parsedUser.role;
            setActiveRole(role);

            const teamId = storedTeamId ? Number(storedTeamId) : undefined;
            const tasksRes = await getTasks({
                teamId: teamId,
                role: role,
                userId: parsedUser.id
            });

            // Fetch teams for Admin view
            const teamsRes = await getTeams();
            if (teamsRes.success) setTeams(teamsRes.data || []);

            if (tasksRes.success) {
                const allTasks = tasksRes.data || [];
                // Filter tasks that have at least one execution or submission
                const tasksWithSubmissions = allTasks.filter((t: any) =>
                    (t.executions && t.executions.length > 0) || (t.submissions && t.submissions.length > 0)
                );
                setTasks(tasksWithSubmissions);
            }
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

    const isAdmin = user.role?.toUpperCase() === "ADMINISTRATOR";

    return (
        <SubmissionsClient
            initialTasks={tasks}
            teams={teams}
            isAdmin={isAdmin}
            onRefresh={loadData}
        />
    );
}
