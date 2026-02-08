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
    Maximize2,
    Users,
    ChevronRight
} from "lucide-react";
import { createUser, deleteUser, updateUser } from "@/lib/actions/users";
import { addUserToTeam, removeUserFromTeam } from "@/lib/actions/teams";
import { useRouter } from "next/navigation";

export default function UsersClient({ initialUsers, initialTeams }: { initialUsers: any[], initialTeams: any[] }) {
    const router = useRouter();
    const [showAddForm, setShowAddForm] = useState(false);
    const [newUser, setNewUser] = useState({ name: "", password: "", role: "UCZESTNICZKA", teamId: "", teamRole: "uczestniczka" });
    const [assignments, setAssignments] = useState<Record<number, { teamId: string; role: string }>>({});
    const [searchTerm, setSearchTerm] = useState("");
    const [filterTeam, setFilterTeam] = useState("");
    const [filterRole, setFilterRole] = useState("");

    const users = initialUsers;
    const teams = initialTeams;

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.imieNazwisko.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = !filterRole || user.rola === filterRole;
        const matchesTeam = !filterTeam || user.zespoly?.some((ut: any) => ut.teamId === Number(filterTeam));
        return matchesSearch && matchesRole && matchesTeam;
    });

    // Get current user info from localStorage
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem("user") : null;
    const currentUser = storedUser ? JSON.parse(storedUser) : null;
    const currentUserId = currentUser?.id;
    const isMainAdmin = currentUser?.name === "system";

    const getRoleBadgeClass = (rola: string) => {
        switch (rola.toUpperCase()) {
            case "ADMINISTRATOR": return "lux-badge lux-badge-danger";
            case "KOORDYNATORKA":
            case "KOORDYNATOR": return "lux-badge lux-badge-primary";
            default: return "lux-badge";
        }
    };

    const [editingUserId, setEditingUserId] = useState<number | null>(null);

    const handleSaveUser = async () => {
        if (!newUser.name.trim() || !newUser.password.trim()) return;

        if (editingUserId) {
            // Update existing user
            const res = await updateUser(editingUserId, {
                imieNazwisko: newUser.name.trim(),
                haslo: newUser.password.trim(),
                rola: newUser.role
            }, currentUserId);

            if (res.success) {
                setEditingUserId(null);
                setNewUser({ name: "", password: "", role: "UCZESTNICZKA", teamId: "", teamRole: "uczestniczka" });
                setShowAddForm(false);
                router.refresh();
            } else {
                alert(res.error || "Wystąpił błąd przy aktualizacji użytkownika.");
            }
        } else {
            // Create new user
            const res = await createUser({
                imieNazwisko: newUser.name.trim(),
                haslo: newUser.password.trim(),
                rola: newUser.role
            }, currentUserId);

            if (res.success) {
                // Automatically assign to team if selected
                if (newUser.teamId && res.data) {
                    await addUserToTeam(res.data.id, Number(newUser.teamId), newUser.teamRole);
                }
                setNewUser({ name: "", password: "", role: "UCZESTNICZKA", teamId: "", teamRole: "uczestniczka" });
                setShowAddForm(false);
                router.refresh();
            } else {
                alert(res.error || "Wystąpił błąd przy tworzeniu użytkownika.");
            }
        }
    };

    const handleStartEdit = (user: any) => {
        setEditingUserId(user.id);
        setNewUser({
            name: user.imieNazwisko,
            password: user.haslo,
            role: user.rola,
            teamId: "", // Editing team assignments is done separately
            teamRole: "uczestniczka"
        });
        setShowAddForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingUserId(null);
        setNewUser({ name: "", password: "", role: "UCZESTNICZKA", teamId: "", teamRole: "uczestniczka" });
        setShowAddForm(false);
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
        } else {
            alert(res.error || "Błąd podczas usuwania z zespołu.");
        }
    };

    const handleAssignTeam = async (userId: number) => {
        const selected = assignments[userId];
        if (!selected?.teamId) {
            alert("Wybierz zespół przed dodaniem.");
            return;
        }

        const res = await addUserToTeam(userId, Number(selected.teamId), selected.role || "uczestniczka");
        if (res.success) {
            setAssignments(prev => ({ ...prev, [userId]: { teamId: "", role: "uczestniczka" } }));
            router.refresh();
        } else {
            alert(res.error || "Błąd podczas przypisywania do zespołu.");
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-12 animate-slide-in p-8 max-w-[1600px] mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 lux-gradient shadow-lg shadow-primary/30 rounded-[20px] text-white">
                                <Users size={32} />
                            </div>
                            <h1 className="text-5xl font-black gradient-text tracking-tighter">Użytkownicy</h1>
                        </div>
                        <p className="text-muted-foreground font-medium text-lg ml-1 opacity-70">Uporządkowane role i precyzyjna kontrola uprawnień w całym systemie.</p>
                    </div>
                    {isMainAdmin && (
                        <button
                            onClick={() => {
                                if (showAddForm) handleCancelEdit();
                                else setShowAddForm(true);
                            }}
                            className="lux-btn flex items-center justify-center gap-3 py-4 px-8"
                        >
                            {showAddForm ? <Minimize2 size={24} /> : <UserPlus size={24} />}
                            <span className="font-black uppercase tracking-widest text-sm">
                                {showAddForm ? "Zamknij formularz" : "Dodaj użytkownika"}
                            </span>
                        </button>
                    )}
                </div>

                {/* Add User Form */}
                <AnimatePresence>
                    {showAddForm && isMainAdmin && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="lux-card-strong p-10 mb-12 border-white/60">
                                <h3 className="text-2xl font-black mb-8 text-foreground flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-xl text-primary">
                                        <UserPlus size={24} />
                                    </div>
                                    {editingUserId ? "Edytuj dane użytkownika" : "Tworzenie nowego użytkownika"}
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
                                            type="text"
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
                                    {!editingUserId && newUser.role !== "ADMINISTRATOR" && (
                                        <>
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Zespół (opcjonalnie)</label>
                                                <select
                                                    className="lux-select font-semibold"
                                                    value={newUser.teamId}
                                                    onChange={(e) => setNewUser(prev => ({ ...prev, teamId: e.target.value }))}
                                                >
                                                    <option value="">-- Wybierz zespół --</option>
                                                    {teams.map(t => <option key={t.id} value={t.id}>{t.nazwa}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Rola w zespole</label>
                                                <select
                                                    className="lux-select font-semibold"
                                                    value={newUser.teamRole}
                                                    onChange={(e) => setNewUser(prev => ({ ...prev, teamRole: e.target.value }))}
                                                >
                                                    <option value="uczestniczka">uczestniczka</option>
                                                    <option value="koordynatorka">koordynatorka</option>
                                                </select>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className="flex gap-4 mt-10">
                                    <button className="lux-btn flex-1 py-5" onClick={handleSaveUser}>
                                        <span className="font-black uppercase tracking-widest">{editingUserId ? "Zapisz zmiany" : "Stwórz profil użytkownika"}</span>
                                    </button>
                                    {editingUserId && (
                                        <button className="lux-btn-outline px-10" onClick={handleCancelEdit}>
                                            <span className="font-black uppercase tracking-widest">Anuluj</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Filter Bar */}
                <div className="lux-card-strong p-8 flex flex-wrap gap-8 items-end bg-white/40 border-white/60">
                    <div className="flex-1 min-w-[300px] space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-2">Wyszukiwarka</label>
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="Wpisz imię i nazwisko..."
                                className="lux-input text-sm py-4"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="w-full md:w-64 space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-2">Rola Systemowa</label>
                        <select
                            className="lux-select text-sm font-bold"
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                        >
                            <option value="">Wszystkie role</option>
                            <option value="UCZESTNICZKA">Uczestniczka</option>
                            <option value="ADMINISTRATOR">Administrator</option>
                        </select>
                    </div>
                    <div className="w-full md:w-72 space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-2">Przynależność</label>
                        <select
                            className="lux-select text-sm font-bold"
                            value={filterTeam}
                            onChange={(e) => setFilterTeam(e.target.value)}
                        >
                            <option value="">Wszystkie zespoły</option>
                            {teams.map(t => <option key={t.id} value={t.id}>{t.nazwa}</option>)}
                        </select>
                    </div>
                    {(searchTerm || filterRole || filterTeam) && (
                        <button
                            onClick={() => { setSearchTerm(""); setFilterRole(""); setFilterTeam(""); }}
                            className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary-foreground transition-colors"
                        >
                            Wyczyść filtry
                        </button>
                    )}
                </div>

                {/* Users Table */}
                <div className="lux-card-strong p-10 overflow-hidden border-white/60">
                    <div className="flex items-center gap-4 mb-10 pb-6 border-b border-white/40">
                        <div className="size-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                            <Users size={20} />
                        </div>
                        <h2 className="text-2xl font-black text-foreground tracking-tight">Lista członków</h2>
                    </div>

                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full border-separate border-spacing-0">
                            <thead>
                                <tr className="lux-gradient-strong text-white">
                                    <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] rounded-tl-[24px]">Użytkownik</th>
                                    {isMainAdmin && <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em]">Hasło</th>}
                                    <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em]">Zespoły i role</th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] rounded-tr-[24px]">Zarządzanie</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="border-b border-gray-100 hover:bg-white/60 transition-colors group">
                                        <td className="px-8 py-10 align-top min-w-[280px]">
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="size-14 rounded-2xl bg-white border border-white/60 shadow-sm flex items-center justify-center font-black text-primary text-xl">
                                                        {user.imieNazwisko[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-lg font-black text-foreground leading-tight">{user.imieNazwisko}</p>
                                                        <span className={cn(
                                                            "inline-block mt-2",
                                                            getRoleBadgeClass(user.rola)
                                                        )}>
                                                            {user.rola}
                                                        </span>
                                                    </div>
                                                </div>

                                                {((user.rola?.toUpperCase() !== "ADMINISTRATOR" || isMainAdmin) && user.imieNazwisko !== "system") ? (
                                                    <div className="flex gap-2">
                                                        {isMainAdmin && (
                                                            <button
                                                                className="flex-1 py-3 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all bg-white border border-white/60 hover:border-primary/40 hover:text-primary shadow-sm"
                                                                onClick={() => handleStartEdit(user)}
                                                            >
                                                                Edytuj
                                                            </button>
                                                        )}
                                                        <button
                                                            className="flex-1 py-3 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all bg-red-50 text-red-500 border border-red-100 hover:bg-red-500 hover:text-white shadow-sm"
                                                            onClick={() => handleDeleteUser(user.id)}
                                                        >
                                                            Usuń
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest bg-gray-100/30 text-gray-400 border border-gray-100 flex items-center justify-center cursor-not-allowed italic">
                                                        Chroniony
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {isMainAdmin && (
                                            <td className="px-8 py-10 align-top">
                                                <div className="font-bold text-sm bg-white/60 backdrop-blur-md px-4 py-3 rounded-xl border border-white shadow-inner text-primary/60 font-mono">
                                                    {user.id === currentUserId ? "—" : user.haslo}
                                                </div>
                                            </td>
                                        )}

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

                                        <td className="px-8 py-10 align-top min-w-[340px]">
                                            {user.rola?.toUpperCase() !== "ADMINISTRATOR" && (
                                                <div className="bg-white/40 backdrop-blur-md p-8 rounded-[32px] border border-white/60 space-y-6 shadow-xl shadow-primary/5">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest ml-2">Zespół</label>
                                                            <select
                                                                className="w-full lux-select text-xs font-bold py-3"
                                                                value={assignments[user.id]?.teamId || ""}
                                                                onChange={(e) => setAssignments(prev => ({
                                                                    ...prev,
                                                                    [user.id]: { teamId: e.target.value, role: prev[user.id]?.role || "uczestniczka" }
                                                                }))}
                                                            >
                                                                <option value="">-- Wybierz --</option>
                                                                {teams.map(t => <option key={t.id} value={t.id}>{t.nazwa}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest ml-2">Rola</label>
                                                            <select
                                                                className="w-full lux-select text-xs font-bold py-3"
                                                                value={assignments[user.id]?.role || "uczestniczka"}
                                                                onChange={(e) => setAssignments(prev => ({
                                                                    ...prev,
                                                                    [user.id]: { teamId: prev[user.id]?.teamId || "", role: e.target.value }
                                                                }))}
                                                            >
                                                                <option value="uczestniczka">uczestnik</option>
                                                                <option value="koordynatorka">koordynator</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <button
                                                        className="w-full lux-btn text-[10px] py-4 flex items-center justify-center gap-3 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                                                        onClick={() => handleAssignTeam(user.id)}
                                                    >
                                                        <Plus size={16} /> <span className="font-black uppercase tracking-widest">Dodaj do zespołu</span>
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground italic font-medium opacity-50">
                                            Nie znaleziono użytkowników spełniających kryteria.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
