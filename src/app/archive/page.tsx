"use client";

import ArchiveClient from "@/components/tasks/archive/ArchiveClient";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ArchivePage() {
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            // Check permissions
            const storedRole = localStorage.getItem("activeRole");
            let role = (storedRole || parsedUser.role || parsedUser.rola || "").toUpperCase();

            const isSystem = (parsedUser.name || "").toLowerCase() === "system" || (parsedUser.imieNazwisko || "").toLowerCase() === "system";
            if (role !== "ADMINISTRATOR" && role !== "ADMIN" && role !== "KOORDYNATORKA" && role !== "KOORDYNATOR" && !isSystem) {
                router.push("/dashboard");
                return;
            }
            if (isSystem) role = "ADMINISTRATOR";
            setUser({ ...parsedUser, role: role }); // Update role to activeRole for children
        } else {
            router.push("/login");
        }
        setIsLoading(false);
    }, [router]);

    if (isLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return <ArchiveClient user={user} />;
}
