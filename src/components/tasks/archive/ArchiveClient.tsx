"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import ArchiveView from "./ArchiveView";
import { useRouter } from "next/navigation";

interface ArchiveClientProps {
    user: any;
}

export default function ArchiveClient({ user }: ArchiveClientProps) {
    const router = useRouter();
    const userRole = (user.role || user.rola || "UCZESTNICZKA").toUpperCase();

    return (
        <DashboardLayout>
            <div className="p-4 md:p-10 max-w-7xl mx-auto">
                <ArchiveView
                    userId={user.id}
                    role={userRole}
                    onBack={() => router.push("/dashboard")}
                />
            </div>
        </DashboardLayout>
    );
}
