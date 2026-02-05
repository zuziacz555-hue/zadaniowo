"use client";

import DashboardClient from "@/components/dashboard/DashboardClient";
import { getUserTeams } from "@/lib/actions/teams";
import { useEffect, useState } from "react";

export default function DashboardPage() {
    const [userTeams, setUserTeams] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            const user = JSON.parse(storedUser);
            getUserTeams(user.id).then(res => {
                if (res.success) {
                    setUserTeams(res.data);
                }
                setIsLoading(false);
            });
        } else {
            setIsLoading(false);
        }
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return <DashboardClient userTeams={userTeams} />;
}
