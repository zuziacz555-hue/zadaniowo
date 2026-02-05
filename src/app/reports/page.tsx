"use client";

import ReportsClient from "@/components/reports/ReportsClient";
import { getReports } from "@/lib/actions/reports";
import { getMeetings } from "@/lib/actions/meetings";
import { getTeams } from "@/lib/actions/teams";
import { useEffect, useState } from "react";

export default function MeetingReportsPage() {
    const [reports, setReports] = useState<any[]>([]);
    const [meetingsWithoutReports, setMeetingsWithoutReports] = useState<any[]>([]);
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
                setActiveRole(storedRole?.toUpperCase() || parsedUser.role);

                const teamId = storedTeamId ? Number(storedTeamId) : undefined;
                const reportsRes = await getReports(teamId);
                const meetingsRes = await getMeetings(teamId);
                const teamsRes = await getTeams();

                if (reportsRes.success) setReports(reportsRes.data || []);
                if (meetingsRes.success && reportsRes.success) {
                    const meetings = meetingsRes.data || [];
                    const reportsData = reportsRes.data || [];
                    setMeetingsWithoutReports(meetings.filter((m: any) => !reportsData.some((r: any) => r.meetingId === m.id)));
                }
                if (teamsRes.success) setTeams(teamsRes.data || []);
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
    const isCoord = activeRole === "KOORDYNATORKA" || isAdmin;

    return (
        <ReportsClient
            reports={reports}
            meetingsWithoutReports={meetingsWithoutReports}
            teams={teams}
            isAdmin={isAdmin}
            isCoord={isCoord}
            currentUser={user.name}
            onRefresh={handleRefresh}
        />
    );
}
