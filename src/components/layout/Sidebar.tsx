"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    ClipboardList,
    Calendar,
    Users,
    Megaphone,
    LogOut,
    Settings,
    Crown,
    MessageSquareText,
    Sparkles,
    UserCog,
    Menu,
    X
} from "lucide-react";
import { useState, useEffect } from "react";

const sidebarItems = [
    { title: "Pulpit", href: "/dashboard", icon: LayoutDashboard },
    { title: "Zadania", href: "/tasks", icon: ClipboardList },
    { title: "Wydarzenia", href: "/events", icon: Calendar },
    { title: "Spotkania", href: "/meetings", icon: Users },
    { title: "Ogłoszenia", href: "/announcements", icon: Megaphone },
];

const coordItems = [
    { title: "Mój Zespół", href: "/admin-teams", icon: Users, excludeAdmin: true },
    { title: "Sprawozdania", href: "/reports", icon: MessageSquareText },
    { title: "Aplikacje", href: "/applications", icon: Sparkles, requiresApplications: true },
    { title: "Ustawienia", href: "/admin-settings", icon: Settings },
];

const adminItems = [
    { title: "Wszystkie Zespoły", href: "/admin-teams", icon: Crown },
    { title: "Użytkownicy", href: "/admin-users", icon: UserCog },
    { title: "Ustawienia", href: "/admin-settings", icon: Settings },
];

interface SidebarProps {
    userName?: string;
    userRole?: string;
    activeTeamName?: string;
}

export default function Sidebar({ userName, userRole, activeTeamName }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [displayUser, setDisplayUser] = useState(userName || "");
    const [displayRole, setDisplayRole] = useState(userRole || "");
    const [displayTeam, setDisplayTeam] = useState(activeTeamName || "");
    const [isAdmin, setIsAdmin] = useState(false);
    const [isCoord, setIsCoord] = useState(false);

    // Sync state effects similar to Navbar
    useEffect(() => {
        const updateSidebarInfo = () => {
            const storedUser = localStorage.getItem("user");
            const storedTeam = localStorage.getItem("activeTeam");
            const storedRole = localStorage.getItem("activeRole");

            if (storedUser) {
                const parsed = JSON.parse(storedUser);
                setDisplayUser(parsed.imieNazwisko || parsed.name || "");

                const role = (parsed.role || storedRole || "").toUpperCase();
                const team = storedTeam || "";

                setDisplayRole(role);
                setDisplayTeam(team);

                setIsAdmin(role === "ADMINISTRATOR" || role === "ADMIN");
                setIsCoord(role === "KOORDYNATORKA");
            }
        };

        updateSidebarInfo();
        window.addEventListener('teamChanged', updateSidebarInfo);
        return () => window.removeEventListener('teamChanged', updateSidebarInfo);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("user");
        localStorage.removeItem("activeTeam");
        localStorage.removeItem("activeTeamId");
        localStorage.removeItem("activeRole");

        // Reset theme
        document.documentElement.style.setProperty('--primary-h', '260');
        document.documentElement.style.setProperty('--primary-s', '100%');
        document.documentElement.style.setProperty('--primary-l', '50%');

        router.push("/");
    };

    return (
        <>
            {/* Mobile Toggle */}
            <button
                onClick={() => setIsMobileOpen(true)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-gray-100"
            >
                <Menu size={24} />
            </button>

            {/* Backdrop */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <aside className={cn(
                "fixed lg:sticky top-0 left-0 h-screen w-[280px] glass-sidebar z-50 flex flex-col transition-transform duration-300 lg:translate-x-0",
                isMobileOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Header */}
                <div className="p-8 flex items-center justify-between">
                    <Link href="/dashboard" className="flex items-center gap-3 group">
                        <img src="/app-logo.jpg" alt="Logo" className="w-10 h-10 rounded-xl shadow-md group-hover:rotate-3 transition-transform" />
                        <span className="text-xl font-bold tracking-tight text-foreground">Zadaniowo</span>
                    </Link>
                    <button onClick={() => setIsMobileOpen(false)} className="lg:hidden p-1 opacity-50 hover:opacity-100">
                        <X size={20} />
                    </button>
                </div>

                {/* Content Scroll */}
                <div className="flex-1 overflow-y-auto py-4 px-6 space-y-8 custom-scrollbar">

                    {/* Main Menu */}
                    <div className="space-y-2">
                        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-4 mb-2">Menu</h3>
                        {sidebarItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsMobileOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm",
                                        isActive
                                            ? "bg-primary text-white shadow-btn"
                                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                                    )}
                                >
                                    <item.icon size={20} />
                                    {item.title}
                                </Link>
                            )
                        })}
                    </div>

                    {/* Role Specific Menu */}
                    {(isCoord || isAdmin) && (
                        <div className="space-y-2">
                            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-4 mb-2">
                                {isAdmin ? "Administracja" : "Zarządzanie"}
                            </h3>
                            {(isAdmin ? adminItems : coordItems).map((item) => {
                                const isActive = pathname === item.href;
                                if ((item as any).excludeAdmin && isAdmin) return null;
                                // Note: skipping detailed 'requiresApplications' check for simplicity in sidebar, 
                                // dashboard handles logical access control.

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setIsMobileOpen(false)}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm",
                                            isActive
                                                ? "bg-purple-100 text-purple-700"
                                                : "text-gray-500 hover:bg-purple-50 hover:text-purple-600"
                                        )}
                                    >
                                        <item.icon size={20} />
                                        {item.title}
                                    </Link>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Footer / User Profile */}
                <div className="p-6 border-t border-white/40 bg-white/30 backdrop-blur-md">
                    <Link href="/profile" className="flex items-center gap-3 mb-4 group cursor-pointer">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-400 flex items-center justify-center text-white font-bold shadow-sm group-hover:scale-105 transition-transform overflow-hidden relative">
                            {/* Hover Shine */}
                            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                            {displayUser.charAt(0)}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold truncate text-foreground group-hover:text-primary transition-colors">{displayUser}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                                {isAdmin ? "Administrator" : displayRole}
                            </p>
                            {!isAdmin && displayTeam && (
                                <p className="text-[10px] font-medium text-primary truncate">{displayTeam}</p>
                            )}
                        </div>
                        <Settings size={14} className="ml-auto text-gray-400 opacity-0 group-hover:opacity-100 transition-all" />
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-white border border-gray-200 text-xs font-bold uppercase tracking-widest text-gray-500 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all"
                    >
                        <LogOut size={14} /> Wyloguj
                    </button>
                </div>
            </aside>
        </>
    );
}
