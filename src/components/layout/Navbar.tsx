"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { slideFromLeft, slideUp } from "@/lib/animations";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface NavbarProps {
    // Props might still be passed from server layouts, but we prioritize client-side state for dynamic updates
    userName?: string;
    activeTeamName?: string;
    activeRole?: string;
    isAdmin?: boolean;
}

export default function Navbar({ userName: initialUserName, activeTeamName, activeRole, isAdmin }: NavbarProps) {
    const router = useRouter();
    const [displayUser, setDisplayUser] = useState(initialUserName || "");
    const [displayRoleInfo, setDisplayRoleInfo] = useState("");

    const updateHeaderInfo = () => {
        if (typeof window === "undefined") return;

        const storedUser = localStorage.getItem("user");
        const storedTeam = localStorage.getItem("activeTeam");
        const storedRole = localStorage.getItem("activeRole");

        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setDisplayUser(parsedUser.imieNazwisko || parsedUser.name || "");

            // ROLE LOGIC
            // 1. If Administrator -> "Administrator"
            if (parsedUser.role === "ADMINISTRATOR" || storedRole === "ADMINISTRATOR") {
                setDisplayRoleInfo("Rola: Administrator");
            }
            // 2. If Regular User -> "Rola: [Team Name] ([Role])"
            else if (storedTeam) {
                const roleName = storedRole ? storedRole.charAt(0).toUpperCase() + storedRole.slice(1).toLowerCase() : "Uczestniczka";
                setDisplayRoleInfo(`Rola: ${storedTeam} (${roleName})`);
            }
            // 3. Fallback
            else {
                setDisplayRoleInfo("");
            }
        }
    };

    useEffect(() => {
        updateHeaderInfo();
        window.addEventListener('teamChanged', updateHeaderInfo);
        return () => window.removeEventListener('teamChanged', updateHeaderInfo);
    }, []);

    const handleLogout = () => {
        if (typeof window !== "undefined") {
            localStorage.removeItem("user");
            localStorage.removeItem("activeTeam");
            localStorage.removeItem("activeTeamId");
            localStorage.removeItem("activeRole");

            // Immediate visual reset
            document.documentElement.style.setProperty('--primary-h', '260');
            document.documentElement.style.setProperty('--primary-s', '100%');
            document.documentElement.style.setProperty('--primary-l', '50%');
        }
        router.push("/");
    };

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="bg-white/80 backdrop-blur-xl border-b border-white/70 sticky top-0 z-[100] h-20 shadow-navbar"
        >
            <div className="max-w-7xl mx-auto h-full px-8 flex items-center justify-between">
                <Link
                    href="/dashboard"
                    className="flex items-center gap-4 group no-underline"
                >
                    <motion.div
                        initial="hidden"
                        animate="show"
                        variants={slideFromLeft}
                    >
                        <img src="/app-logo.jpg" alt="Zadaniowo Logo" className="w-12 h-12 rounded-2xl shadow-[0_10px_20px_rgba(84,0,255,0.15)] group-hover:rotate-3 transition-all object-cover" />
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex flex-col"
                    >
                        <span className="text-xl font-bold tracking-tight text-foreground leading-tight">
                            Zadaniowo
                        </span>
                    </motion.div>
                </Link>

                <div className="flex items-center gap-8">
                    <motion.div
                        initial="hidden"
                        animate="show"
                        variants={slideUp}
                        className="hidden lg:flex flex-col items-end pr-8 border-r border-gray-100 h-10 justify-center"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-foreground">Witaj {displayUser}</span>
                        </div>
                        {displayRoleInfo && (
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-1">
                                {displayRoleInfo}
                            </span>
                        )}
                    </motion.div>

                    <button
                        onClick={handleLogout}
                        className="lux-btn flex items-center gap-2 text-xs uppercase tracking-widest group font-bold"
                    >
                        <LogOut size={16} className="transition-transform group-hover:-translate-x-1" />
                        Wyloguj się
                    </button>
                </div>
            </div>
        </motion.nav>
    );
}
