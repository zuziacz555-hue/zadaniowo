"use client";

import { useEffect } from "react";
import { getTeams } from "@/lib/actions/teams";
import { usePathname } from "next/navigation";

export default function ThemeController() {
    const pathname = usePathname();

    useEffect(() => {
        const applyTheme = async () => {
            // function to hex to hsl
            const hexToHSL = (hex: string) => {
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                if (!result) return null;

                let r = parseInt(result[1], 16);
                let g = parseInt(result[2], 16);
                let b = parseInt(result[3], 16);

                r /= 255;
                g /= 255;
                b /= 255;

                const max = Math.max(r, g, b), min = Math.min(r, g, b);
                let h = 0, s = 0, l = (max + min) / 2;

                if (max !== min) {
                    const d = max - min;
                    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                    switch (max) {
                        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                        case g: h = (b - r) / d + 2; break;
                        case b: h = (r - g) / d + 4; break;
                    }
                    h /= 6;
                }

                return {
                    h: Math.round(h * 360),
                    s: Math.round(s * 100) + '%',
                    l: Math.round(l * 100) + '%'
                };
            };

            const storedTeamId = localStorage.getItem("activeTeamId");
            const storedRole = localStorage.getItem("activeRole");
            const storedUser = JSON.parse(localStorage.getItem("user") || "{}");

            const isRealAdmin = storedUser.rola === "ADMINISTRATOR" || storedUser.role === "ADMINISTRATOR" || storedUser.role === "admin";

            // Only apply theme if user is NOT admin (Admins see default purple)
            if (!isRealAdmin && storedTeamId) {
                const res = await getTeams(); // efficiently cached by Next.js
                if (res.success && res.data) {
                    const team = res.data.find((t: any) => t.id === Number(storedTeamId)) as any;
                    if (team && team.kolor) {
                        const hsl = hexToHSL(team.kolor);
                        if (hsl) {
                            document.documentElement.style.setProperty('--primary-h', hsl.h.toString());
                            document.documentElement.style.setProperty('--primary-s', hsl.s);
                            document.documentElement.style.setProperty('--primary-l', hsl.l);
                            return;
                        }
                    }
                }
            }

            // Reset to default if no team or admin mode
            // Default "Unionki Purple" #5400FF -> HSL(260, 100%, 50%)
            document.documentElement.style.setProperty('--primary-h', '260');
            document.documentElement.style.setProperty('--primary-s', '100%');
            document.documentElement.style.setProperty('--primary-l', '50%');
        };

        applyTheme();

        // Listen for team changes
        window.addEventListener("teamChanged", applyTheme);
        return () => window.removeEventListener("teamChanged", applyTheme);
    }, [pathname]); // Re-run on path change

    return null; // Logic only component
}
