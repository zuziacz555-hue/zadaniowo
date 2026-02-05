"use client";

import Link from "next/link";
import Navbar from "./Navbar";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getUserById } from "@/lib/actions/users";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isDashboard = pathname === "/dashboard";
    const [user, setUser] = useState<{ id: number; name: string; role: string; teams?: string[] } | null>(null);
    const [activeTeam, setActiveTeam] = useState<string>("Ładowanie...");
    const [activeRole, setActiveRole] = useState<string>("");

    const refreshActiveTeam = () => {
        const storedTeam = localStorage.getItem("activeTeam");
        const storedRole = localStorage.getItem("activeRole");
        const storedUser = localStorage.getItem("user");

        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                // Standardize role property
                const userRole = (parsed.rola || parsed.role || "").toUpperCase();
                const normalizedUser = {
                    ...parsed,
                    role: userRole,
                    name: parsed.imieNazwisko || parsed.name || "Użytkownik"
                };

                setUser(normalizedUser);

                // Priority: localStorage activeTeam -> user first team -> Fallback
                const team = storedTeam || parsed.teams?.[0] || "Brak zespołu";
                setActiveTeam(team);

                // Role logic: Administrator stays Administrator, others use team role
                if (userRole === "ADMINISTRATOR" || userRole === "ADMIN") {
                    setActiveRole("ADMINISTRATOR");
                } else {
                    setActiveRole(storedRole?.toUpperCase() || userRole || "UCZESTNICZKA");
                }
            } catch (e) {
                console.error("Auth sync error", e);
            }
        }
    };

    useEffect(() => {
        refreshActiveTeam();

        // Listen for internal team changes (from DashboardClient)
        window.addEventListener('teamChanged', refreshActiveTeam);
        // Listen for cross-tab storage changes
        window.addEventListener('storage', (e) => {
            if (e.key === 'activeTeam' || e.key === 'user' || e.key === 'activeRole') {
                refreshActiveTeam();
            }
        });

        return () => {
            window.removeEventListener('teamChanged', refreshActiveTeam);
            window.removeEventListener('storage', refreshActiveTeam);
        };
    }, []);

    // Also keep DB in sync in background
    useEffect(() => {
        if (user?.id) {
            getUserById(user.id).then(res => {
                if (res.success && res.data) {
                    const dbUser = res.data;
                    const teams = dbUser.zespoly.map((ut: any) => ut.team.nazwa);

                    // Update user state and storage if changed
                    const updatedUser = {
                        id: dbUser.id,
                        name: dbUser.imieNazwisko,
                        role: dbUser.rola,
                        teams: teams
                    };

                    setUser(updatedUser);
                    localStorage.setItem("user", JSON.stringify(updatedUser));

                    // If no active team set, set the first one from DB
                    if (!localStorage.getItem("activeTeam") && teams.length > 0) {
                        const firstTeamName = teams[0];
                        const firstTeamRole = dbUser.zespoly[0].rola;

                        localStorage.setItem("activeTeam", firstTeamName);
                        localStorage.setItem("activeRole", firstTeamRole);

                        setActiveTeam(firstTeamName);
                        setActiveRole(firstTeamRole.toUpperCase());
                    }
                }
            });
        }
    }, [user?.id]);

    const userName = user?.name || "Gość";

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar
                userName={userName}
                activeTeamName={activeTeam}
                activeRole={activeRole}
                isAdmin={activeRole === "ADMINISTRATOR"}
            />

            <main className="flex-1 w-full max-w-[1200px] mx-auto px-6 py-10">
                {!isDashboard && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="mb-6"
                    >
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors group"
                        >
                            <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                                <ArrowLeft size={16} />
                            </div>
                            Wróć do pulpitu
                        </Link>
                    </motion.div>
                )}
                <AnimatePresence mode="wait">
                    <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 18 }}
                        transition={{ duration: 0.35 }}
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
}
