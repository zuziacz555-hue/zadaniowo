"use client";

import { useState, useEffect } from "react";
import { User, Lock, Save, ArrowLeft, ShieldCheck, Sparkles, KeyRound } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { updateUser } from "@/lib/actions/users";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { loginContainerVariant, loginItemVariant } from "@/lib/animations";

export default function ProfileClient() {
    const [user, setUser] = useState<{ id: number; imieNazwisko: string; role: string } | null>(null);
    const [formData, setFormData] = useState({
        imieNazwisko: "",
        newPassword: "",
        confirmPassword: ""
    });
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const router = useRouter();

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            const parsed = JSON.parse(storedUser);
            setUser({
                id: parsed.id,
                imieNazwisko: parsed.imieNazwisko || parsed.name,
                role: parsed.role || parsed.rola
            });
            setFormData(prev => ({ ...prev, imieNazwisko: parsed.imieNazwisko || parsed.name }));
        } else {
            router.push("/");
        }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setIsLoading(true);

        if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
            setMessage({ type: 'error', text: "Hasła nie są identyczne." });
            setIsLoading(false);
            return;
        }

        if (!user) return;

        const updateData: any = {
            imieNazwisko: formData.imieNazwisko
        };

        if (formData.newPassword) {
            updateData.haslo = formData.newPassword;
        }

        const res = await updateUser(user.id, updateData, user.id);

        if (res.success) {
            setMessage({ type: 'success', text: "Profil został zaktualizowany." });
            // Update local storage
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
                const parsed = JSON.parse(storedUser);
                const updated = { ...parsed, imieNazwisko: formData.imieNazwisko };
                localStorage.setItem("user", JSON.stringify(updated));
                // Trigger event to update Sidebar
                window.dispatchEvent(new Event('teamChanged'));
            }
            if (formData.newPassword) {
                setFormData(prev => ({ ...prev, newPassword: "", confirmPassword: "" }));
            }
        } else {
            setMessage({ type: 'error', text: res.error || "Wystąpił błąd podczas aktualizacji." });
        }
        setIsLoading(false);
    };

    if (!user) return null; // or loading spinner

    return (
        <div className="min-h-screen bg-gray-50/50 p-6 lg:p-10">
            <div className="max-w-2xl mx-auto space-y-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4 mb-8"
                >
                    <Link href="/dashboard" className="p-2 rounded-xl bg-white shadow-sm hover:shadow-md transition-all text-muted-foreground hover:text-primary">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Twój Profil</h1>
                        <p className="text-muted-foreground">Zarządzaj swoimi danymi osobowymi i bezpieczeństwem.</p>
                    </div>
                </motion.div>

                {/* Main Card */}
                <motion.div
                    initial="hidden"
                    animate="show"
                    variants={loginContainerVariant}
                    className="lux-card bg-white p-6 md:p-10 shadow-sm border border-gray-100 rounded-[24px]"
                >
                    {/* Decorative Background Removed */}


                    <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 mb-8 md:mb-10 relative z-10 text-center md:text-left">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-2xl md:text-3xl font-bold shadow-lg ring-4 ring-white">
                            {user.imieNazwisko.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-bold text-gray-900">{user.imieNazwisko}</h2>
                            <div className="flex items-center justify-center md:justify-start gap-2 mt-1">
                                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                                    <ShieldCheck size={12} />
                                    {user.role}
                                </span>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b pb-2">
                                <Sparkles size={18} className="text-primary" />
                                Dane podstawowe
                            </h3>

                            <motion.div variants={loginItemVariant} className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">
                                    Imię i Nazwisko
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors pointer-events-none">
                                        <User size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={formData.imieNazwisko}
                                        onChange={(e) => setFormData({ ...formData, imieNazwisko: e.target.value })}
                                        className="lux-input pl-11"
                                        placeholder="Twoje imię i nazwisko"
                                    />
                                </div>
                            </motion.div>
                        </div>

                        <div className="space-y-6 pt-2">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b pb-2">
                                <KeyRound size={18} className="text-primary" />
                                Bezpieczeństwo
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <motion.div variants={loginItemVariant} className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">
                                        Nowe Hasło
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors pointer-events-none">
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            type="password"
                                            value={formData.newPassword}
                                            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                            className="lux-input pl-11"
                                            placeholder="Opcjonalne"
                                        />
                                    </div>
                                </motion.div>

                                <motion.div variants={loginItemVariant} className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">
                                        Potwierdź Hasło
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors pointer-events-none">
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            type="password"
                                            value={formData.confirmPassword}
                                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                            className="lux-input pl-11"
                                            placeholder="Powtórz nowe hasło"
                                        />
                                    </div>
                                </motion.div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                            {message && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={cn(
                                        "text-sm font-bold flex items-center gap-2 px-4 py-2 rounded-lg",
                                        message.type === 'success' ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                                    )}
                                >
                                    <span className={cn("w-2 h-2 rounded-full", message.type === 'success' ? "bg-green-500" : "bg-red-500")} />
                                    {message.text}
                                </motion.div>
                            )}

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                disabled={isLoading}
                                className="lux-btn px-8 py-3 flex items-center gap-2 ml-auto shadow-lg shadow-primary/20"
                            >
                                {isLoading ? "Zapisywanie..." : (
                                    <>
                                        <Save size={18} /> Zapisz Zmiany
                                    </>
                                )}
                            </motion.button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </div>
    );
}
