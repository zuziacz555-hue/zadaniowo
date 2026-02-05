"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
    Trash2,
    UserPlus,
    UserMinus,
    Plus,
    Minimize2,
    Maximize2
} from "lucide-react";
import { createUser, deleteUser, updateUser } from "@/lib/actions/users";
import { addUserToTeam, removeUserFromTeam } from "@/lib/actions/teams";
import { useRouter } from "next/navigation";

export default function UsersClient({ initialUsers, initialTeams }: { initialUsers: any[], initialTeams: any[] }) {
    const router = useRouter();
    const [showAddForm, setShowAddForm] = useState(false);
    const [newUser, setNewUser] = useState({ name: "", password: "", role: "UCZESTNICZKA" });
    const [assignments, setAssignments] = useState<Record<number, { teamId: string; role: string }>>({});

    const users = initialUsers;
    const teams = initialTeams;

    // Get current user info from localStorage
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem("user") : null;
    const currentUser = storedUser ? JSON.parse(storedUser) : null;
    const currentUserId = currentUser?.id;
    const isMainAdmin = currentUser?.name === "Bóg";

    const getRoleBadgeClass = (rola: string) => {
        switch (rola) {
            case "ADMINISTRATOR": return "bg-blue-50 text-blue-700 border border-blue-100";
            case "KOORDYNATORKA": return "bg-purple-50 text-purple-700 border border-purple-100";
            default: return "bg-gray-50 text-gray-600 border border-gray-100";
        }
    };

    const handleAddUser = async () => {
        if (!newUser.name.trim() || !newUser.password.trim()) return;
        const res = await createUser({
            imieNazwisko: newUser.name.trim(),
            haslo: newUser.password.trim(),
            rola: newUser.role
        });
        if (res.success) {
            setNewUser({ name: "", password: "", role: "UCZESTNICZKA" });
            setShowAddForm(false);
            router.refresh();
        } else {
            alert(res.error || "Wystąpił błąd przy tworzeniu użytkownika.");
        }
    };

    const handleDeleteUser = async (id: number) => {
        if (!currentUserId) {
            alert("Błąd autoryzacji. Spróbuj zalogować się ponownie.");
            return;
        }
        if (!confirm("Czy na pewno chcesz usunąć tego użytkownika?")) return;
        const res = await deleteUser(id, currentUserId);
        if (res.success) {
            router.refresh();
        } else {
            alert(res.error || "Nie udało się usunąć użytkownika.");
        }
    };

    const handleRemoveTeam = async (userId: number, teamId: number) => {
        if (!confirm("Czy na pewno chcesz usunąć ten zespół dla użytkownika?")) return;
        const res = await removeUserFromTeam(userId, teamId);
        if (res.success) {
            router.refresh();
        }
    };

    const handleAssignTeam = async (userId: number) => {
        const selected = assignments[userId];
        if (!selected?.teamId) return;

        const res = await addUserToTeam(userId, Number(selected.teamId), selected.role);
        if (res.success) {
            setAssignments(prev => ({ ...prev, [userId]: { teamId: "", role: "uczestniczka" } }));
            router.refresh();
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-8 animate-slide-in">
                {/* Header */}
                <div className="lux-card-strong p-10 flex justify-between items-center group">
                    <div>
                        <h1 className="text-4xl font-bold gradient-text mb-2">Użytkownicy</h1>
                        <p className="text-muted-foreground">Uporządkowane role i delikatna kontrola dostępu w jednym miejscu.</p>
                    </div>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="lux-btn flex items-center gap-2"
                    >
                        {showAddForm ? <Minimize2 size={20} /> : <UserPlus size={20} />}
                        {showAddForm ? "Zamknij formularz" : "Dodaj użytkownika"}
                    </button>
                </div>

                {/* Add User Form */}
                <AnimatePresence>
                    {showAddForm && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="lux-card p-8 mb-8 border border-primary/10">
                                <h3 className="text-xl font-bold mb-6 text-primary flex items-center gap-2">
                                    <UserPlus size={22} className="text-primary" /> Nowy użytkownik
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Imię i nazwisko</label>
                                        <input
                                            type="text"
                                            placeholder="np. Anna Kowalska"
                                            className="lux-input"
                                            value={newUser.name}
                                            onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Hasło</label>
                                        <input
                                            type="password"
                                            placeholder="********"
                                            className="lux-input"
                                            value={newUser.password}
                                            onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Rola systemowa</label>
                                        <select
                                            className="lux-select font-semibold"
                                            value={newUser.role}
                                            onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                                        >
                                            <option value="UCZESTNICZKA">uczestniczka</option>
                                            <option value="ADMINISTRATOR">administrator</option>
                                        </select>
                                    </div>
                                </div>
                                <button className="lux-btn w-full mt-6" onClick={handleAddUser}>
                                    Dodaj użytkownika
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Users Table */}
                <div className="lux-card p-8 overflow-hidden">
                    <h2 className="text-2xl font-bold mb-8 pb-4 border-b-4 border-primary inline-block">Lista użytkowników</h2>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="gradient-bg text-white">
                                    <th className="px-6 py-4 text-left font-bold rounded-l-xl">Użytkownik</th>
                                    <th className="px-6 py-4 text-left font-bold">Zespoły i role</th>
                                    <th className="px-6 py-4 text-left font-bold rounded-r-xl">Zarządzanie zespołami</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className="border-b border-gray-100 hover:bg-white/60 transition-colors group">
                                        <td className="px-6 py-8 align-top min-w-[250px]">
                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-lg font-bold text-foreground">{user.imieNazwisko}</p>
                                                    <span className={cn(
                                                        "px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider block w-fit mt-1",
                                                        getRoleBadgeClass(user.rola)
                                                    )}>
                                                        {user.rola}
                                                    </span>
                                                </div>

                                                {((user.rola !== "ADMINISTRATOR" || isMainAdmin) && user.imieNazwisko !== "Bóg") ? (
                                                    <button
                                                        className="w-full py-3 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all lux-btn-outline hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                                        onClick={() => handleDeleteUser(user.id)}
                                                    >
                                                        Usuń użytkownika
                                                    </button>
                                                ) : (
                                                    <div className="w-full py-3 rounded-xl font-bold text-[11px] uppercase tracking-widest bg-gray-100/50 text-gray-400 border border-gray-100 flex items-center justify-center cursor-not-allowed">
                                                        {user.imieNazwisko === "Bóg" ? "Bóg" : "Brak uprawnień"}
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        <td className="px-6 py-8 align-top">
                                            <div className="space-y-4">
                                                {user.zespoly && user.zespoly.length > 0 ? (
                                                    user.zespoly.map((ut: any) => (
                                                        <div key={ut.id} className="bg-gray-50 p-4 rounded-xl border-l-4 border-primary relative group/team">
                                                            <p className="font-bold text-sm text-foreground mb-3">{ut.team.nazwa}</p>
                                                            <div className="flex gap-2 items-center">
                                                                <span className="text-xs font-semibold px-2 py-1 bg-white border border-gray-200 rounded">
                                                                    {ut.rola}
                                                                </span>
                                                                <button
                                                                    className="p-1 px-3 bg-red-50 text-red-600 rounded text-[10px] font-bold hover:bg-red-600 hover:text-white transition-all ml-auto"
                                                                    onClick={() => handleRemoveTeam(user.id, ut.teamId)}
                                                                >
                                                                    Usuń
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-muted-foreground italic text-sm">Brak przypisanych zespołów</p>
                                                )}
                                            </div>
                                        </td>

                                        <td className="px-6 py-8 align-top min-w-[300px]">
                                            <div className="bg-white/80 p-6 rounded-2xl border border-gray-100 space-y-4 shadow-inner">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Zespół</label>
                                                    <select
                                                        className="w-full lux-select text-sm font-semibold"
                                                        value={assignments[user.id]?.teamId || ""}
                                                        onChange={(e) => setAssignments(prev => ({
                                                            ...prev,
                                                            [user.id]: { teamId: e.target.value, role: prev[user.id]?.role || "uczestniczka" }
                                                        }))}
                                                    >
                                                        <option value="">-- Wybierz zespół --</option>
                                                        {teams.map(t => <option key={t.id} value={t.id}>{t.nazwa}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Rola w zespole</label>
                                                    <select
                                                        className="w-full lux-select text-sm font-semibold"
                                                        value={assignments[user.id]?.role || "uczestniczka"}
                                                        onChange={(e) => setAssignments(prev => ({
                                                            ...prev,
                                                            [user.id]: { teamId: prev[user.id]?.teamId || "", role: e.target.value }
                                                        }))}
                                                    >
                                                        <option value="uczestniczka">uczestniczka</option>
                                                        <option value="koordynatorka">koordynatorka</option>
                                                    </select>
                                                </div>
                                                <button
                                                    className="w-full lux-btn text-xs flex items-center justify-center gap-2"
                                                    onClick={() => handleAssignTeam(user.id)}
                                                >
                                                    <Plus size={16} /> Dodaj do zespołu
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
