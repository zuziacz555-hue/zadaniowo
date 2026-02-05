"use client";

import SettingsClient from "@/components/settings/SettingsClient";
import { getSystemSettings, SystemSettingsData } from "@/lib/actions/settings";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
    const router = useRouter();
    const [settings, setSettings] = useState<SystemSettingsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");

        if (!storedUser) {
            router.push("/");
            return;
        }

        const user = JSON.parse(storedUser);

        // Admin only page
        if (user.role !== "ADMINISTRATOR" && user.role !== "admin") {
            router.push("/dashboard");
            return;
        }

        // Fetch settings
        getSystemSettings().then(res => {
            if (res.success && res.data) {
                setSettings(res.data);
            } else {
                setSettings({
                    id: 0,
                    alertsTerminy: true,
                    alertsPoprawki: true,
                    alertsRaporty: true
                });
            }
            setIsLoading(false);
        });
    }, [router]);

    if (isLoading || !settings) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return <SettingsClient initialSettings={settings} />;
}
