"use client";

import { useState, useEffect } from "react";
import { getArchiveFolders, createArchiveFolder, deleteArchiveFolder, getArchiveFolderDetails, shareArchiveFolder, updateArchiveFolder, unarchiveTaskExecution, acceptArchiveInvite, declineArchiveInvite } from "@/lib/actions/archive";
import ExecutionDetailModal from "../ExecutionDetailModal";
import { Archive, Plus, Folder, Users as UsersIcon, Trash2, Edit2, ArrowLeft, Loader2, Share2, Search, CheckCircle, Clock, AlertTriangle, Layers, Calendar, Check, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getUsers } from "@/lib/actions/users"; // You might need this for sharing modal

export default function ArchiveView({ userId, role, onBack }: any) {
    const [folders, setFolders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFolder, setSelectedFolder] = useState<any>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingFolder, setEditingFolder] = useState<any>(null);
    const [folderContent, setFolderContent] = useState<any[]>([]);
    const [loadingContent, setLoadingContent] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [folderToShare, setFolderToShare] = useState<any>(null);
    const [selectedExecution, setSelectedExecution] = useState<any>(null);
    const [invites, setInvites] = useState<any[]>([]);

    useEffect(() => {
        loadFolders();
    }, []);

    const loadFolders = async () => {
        setLoading(true);
        const res = await getArchiveFolders(userId, role);
        if (res.success) {
            setFolders(res.data || []);
            setInvites(res.invites || []);
        }
        setLoading(false);
    };

    const handleAcceptInvite = async (folderId: number) => {
        const res = await acceptArchiveInvite(folderId, userId);
        if (res.success) loadFolders();
        else alert("Błąd akceptacji: " + res.error);
    };

    const handleDeclineInvite = async (folderId: number) => {
        if (!confirm("Czy na pewno chcesz odrzucić zaproszenie do tego folderu?")) return;
        const res = await declineArchiveInvite(folderId, userId);
        if (res.success) loadFolders();
        else alert("Błąd odrzucenia: " + res.error);
    };

    const handleSaveFolder = async (name: string) => {
        if (editingFolder) {
            const res = await updateArchiveFolder(editingFolder.id, name);
            if (res.success) {
                loadFolders();
                setIsCreateModalOpen(false);
                setEditingFolder(null);
            } else {
                alert("Błąd aktualizacji folderu: " + res.error);
            }
        } else {
            const res = await createArchiveFolder(name, userId);
            if (res.success) {
                loadFolders();
                setIsCreateModalOpen(false);
            } else {
                alert("Błąd tworzenia folderu: " + res.error);
            }
        }
    };

    const handleDeleteFolder = async (id: number) => {
        if (!confirm("Czy na pewno chcesz usunąć ten folder? Zadania wrócą do listy głównej (od-zarchiwizowane).")) return;
        const res = await deleteArchiveFolder(id);
        if (res.success) loadFolders();
    };

    const handleOpenFolder = async (folder: any) => {
        setSelectedFolder(folder);
        setLoadingContent(true);
        const res = await getArchiveFolderDetails(folder.id);
        if (res.success) setFolderContent(res.data || []);
        setLoadingContent(false);
    };

    const handleUnarchiveTask = async (executionId: number) => {
        if (!confirm("Czy na pewno chcesz przywrócić to zadanie do listy głównej?")) return;
        const res = await unarchiveTaskExecution(executionId);
        if (res.success) {
            // Refresh folder content
            const updatedContent = await getArchiveFolderDetails(selectedFolder.id);
            if (updatedContent.success) setFolderContent(updatedContent.data || []);
            setSelectedExecution(null);
        } else {
            alert("Błąd przywracania zadania: " + res.error);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => selectedFolder ? setSelectedFolder(null) : onBack()}
                        className="p-3 bg-white hover:bg-gray-50 rounded-2xl transition-all shadow-sm border border-gray-100 group"
                    >
                        <ArrowLeft size={20} className="text-gray-400 group-hover:text-gray-900 transition-colors" />
                    </button>
                    <div>
                        <h2 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
                            <Archive className="text-gray-300" />
                            {selectedFolder ? selectedFolder.nazwa : "Archiwum Zadań"}
                        </h2>
                        <p className="text-sm font-medium text-muted-foreground ml-1">
                            {selectedFolder ? "Przeglądanie zawartości folderu" : "Zarządzaj zarchiwizowanymi zadaniami"}
                        </p>
                    </div>
                </div>

                {!selectedFolder && (role === "ADMIN" || role === "ADMINISTRATOR" || role === "KOORDYNATOR" || role === "KOORDYNATORKA") && (
                    <button
                        onClick={() => { setEditingFolder(null); setIsCreateModalOpen(true); }}
                        className="px-6 py-3 bg-gray-900 text-white rounded-2xl font-bold text-sm uppercase tracking-wider hover:bg-primary transition-all shadow-lg shadow-gray-200 flex items-center gap-2"
                    >
                        <Plus size={18} /> Nowy Folder
                    </button>
                )}
            </div>

            {/* Invitations Section */}
            {invites.length > 0 && !selectedFolder && (
                <div className="bg-blue-50/50 border border-blue-100 rounded-[32px] p-8 space-y-4 animate-in fade-in zoom-in-95">
                    <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                        <Sparkles className="text-blue-500" /> Otrzymane zaproszenia do folderów
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {invites.map((invite) => (
                            <div key={invite.id} className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
                                        <Folder size={20} />
                                    </div>
                                    <span className="font-bold text-gray-900">{invite.nazwa}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleAcceptInvite(invite.id)}
                                        className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-xl transition-all"
                                        title="Akceptuj"
                                    >
                                        <Check size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDeclineInvite(invite.id)}
                                        className="p-2 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                                        title="Odrzuć"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Folder List */}
            {!selectedFolder ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {loading ? (
                        [...Array(4)].map((_, i) => (
                            <div key={i} className="h-40 bg-gray-100/50 rounded-[32px] animate-pulse" />
                        ))
                    ) : folders.length > 0 ? (
                        folders.map((folder) => (
                            <motion.div
                                key={folder.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="group relative bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer overflow-hidden"
                                onClick={() => handleOpenFolder(folder)}
                            >
                                <div className="absolute top-0 right-0 p-6 flex gap-2">
                                    {(role === "ADMIN" || role === "ADMINISTRATOR" || role === "KOORDYNATOR" || role === "KOORDYNATORKA") && (
                                        <>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setEditingFolder(folder); setIsCreateModalOpen(true); }}
                                                className="p-2 bg-gray-50/80 text-gray-500 hover:text-primary rounded-xl shadow-sm hover:bg-primary/10 transition-all backdrop-blur-sm"
                                                title="Edytuj nazwę"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setFolderToShare(folder); setIsShareModalOpen(true); }}
                                                className="p-2 bg-gray-50/80 text-gray-500 hover:text-blue-500 rounded-xl shadow-sm hover:bg-blue-50 transition-all backdrop-blur-sm"
                                                title="Udostępnij"
                                            >
                                                <Share2 size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                                                className="p-2 bg-gray-50/80 text-gray-500 hover:text-red-500 rounded-xl shadow-sm hover:bg-red-50 transition-all backdrop-blur-sm"
                                                title="Usuń"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>
                                <div className="mb-4 w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                    <Folder size={28} />
                                </div>
                                <h3 className="font-bold text-lg text-gray-900 mb-1">{folder.nazwa}</h3>
                                <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                                    <span className="flex items-center gap-1.5">
                                        <Layers size={12} /> {folder.executionCount} zadań
                                    </span>
                                    {folder.sharedWithUsers?.length > 0 && (
                                        <span className="flex items-center gap-1.5 text-blue-500">
                                            <UsersIcon size={12} /> {folder.sharedWithUsers.length}
                                        </span>
                                    )}
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="col-span-full py-20 text-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                                <Archive size={32} />
                            </div>
                            <p className="text-muted-foreground font-medium">Brak folderów w archiwum</p>
                            {(role === "ADMIN" || role === "ADMINISTRATOR" || role === "KOORDYNATOR" || role === "KOORDYNATORKA") && <p className="text-xs text-gray-400 mt-2">Utwórz pierwszy folder aby zacząć archiwizować zadania</p>}
                        </div>
                    )}
                </div>
            ) : (
                /* Folder Content */
                <div className="space-y-4">
                    {loadingContent ? (
                        <div className="py-20 flex justify-center text-muted-foreground"><Loader2 className="animate-spin" /></div>
                    ) : folderContent.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                            {folderContent.map((ex) => (
                                <div
                                    key={ex.id}
                                    className="bg-white p-5 rounded-[24px] border border-gray-100 flex items-center justify-between group hover:border-gray-200 transition-all cursor-pointer"
                                    onClick={() => setSelectedExecution(ex)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                                            <CheckCircle size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">{ex.task.tytul}</h4>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                                <span className="flex items-center gap-1"><UsersIcon size={10} /> {ex.user.imieNazwisko}</span>
                                                <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(ex.dataOznaczenia).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleUnarchiveTask(ex.id); }}
                                            className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
                                            title="Przywróć do listy głównej"
                                        >
                                            <Archive size={18} className="rotate-180" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center text-muted-foreground italic">Pusty folder</div>
                    )}
                </div>
            )}

            {/* Execution Detail Modal */}
            <ExecutionDetailModal
                execution={selectedExecution}
                onClose={() => setSelectedExecution(null)}
                isAdmin={role === "ADMIN" || role === "ADMINISTRATOR"}
                onUnarchive={selectedExecution ? () => handleUnarchiveTask(selectedExecution.id) : undefined}
            />

            {/* Create / Edit Folder Modal */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsCreateModalOpen(false); setEditingFolder(null); }} className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white p-8 rounded-[32px] shadow-2xl relative z-10 w-full max-w-md">
                            <h3 className="text-2xl font-bold mb-6">{editingFolder ? "Edytuj Folder" : "Nowy Folder"}</h3>
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                handleSaveFolder(formData.get("name") as string);
                            }}>
                                <input
                                    name="name"
                                    autoFocus
                                    className="lux-input mb-6"
                                    placeholder="Nazwa folderu (np. Styczeń 2024)..."
                                    required
                                    defaultValue={editingFolder?.nazwa || ""}
                                />
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => { setIsCreateModalOpen(false); setEditingFolder(null); }}
                                        className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-all"
                                    >
                                        Anuluj
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-primary transition-all"
                                    >
                                        {editingFolder ? "Zapisz" : "Utwórz"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Share Modal */}
            {isShareModalOpen && folderToShare && (
                <ShareFolderModal
                    folder={folderToShare}
                    onClose={() => setIsShareModalOpen(false)}
                    onShare={async (userIds: number[]) => {
                        await shareArchiveFolder(folderToShare.id, userIds);
                        loadFolders();
                        setIsShareModalOpen(false);
                    }}
                />
            )}
        </div>
    );
}

function ShareFolderModal({ folder, onClose, onShare }: any) {
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<number[]>(folder.sharedWithUsers?.map((s: any) => s.userId) || []);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        getUsers().then(res => {
            if (res.success) setUsers(res.data || []);
            setLoading(false);
        });
    }, []);

    const filteredUsers = users.filter(u => u.imieNazwisko.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
            <div className="bg-white p-8 rounded-[32px] shadow-2xl relative z-10 w-full max-w-lg h-[600px] flex flex-col">
                <h3 className="text-2xl font-bold mb-2">Udostępnij Folder</h3>
                <p className="text-muted-foreground text-sm mb-6">Wybierz osoby, które będą miały widok do folderu <strong>{folder.nazwa}</strong></p>

                <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        className="lux-input pl-11"
                        placeholder="Szukaj osoby..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                    {loading ? <div className="text-center py-10"><Loader2 className="animate-spin mx-auto" /></div> :
                        filteredUsers.map(user => {
                            const isSelected = selectedUsers.includes(user.id);
                            return (
                                <div
                                    key={user.id}
                                    onClick={() => {
                                        if (isSelected) setSelectedUsers(prev => prev.filter(id => id !== user.id));
                                        else setSelectedUsers(prev => [...prev, user.id]);
                                    }}
                                    className={cn(
                                        "flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all",
                                        isSelected ? "bg-primary/5 border-primary/30" : "bg-white border-gray-100 hover:border-gray-200"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold", isSelected ? "bg-primary text-white" : "bg-gray-100 text-gray-500")}>
                                            {user.imieNazwisko[0]}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-gray-900">{user.imieNazwisko}</p>
                                            <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">{user.rola}</p>
                                        </div>
                                    </div>
                                    <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center transition-all", isSelected ? "bg-primary border-primary text-white" : "border-gray-300 bg-white")}>
                                        {isSelected && <Check size={12} />}
                                    </div>
                                </div>
                            );
                        })}
                </div>

                <div className="pt-6 mt-4 border-t border-gray-100 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-all">Anuluj</button>
                    <button onClick={() => onShare(selectedUsers)} className="flex-1 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-primary transition-all">Zapisz uprawnienia</button>
                </div>
            </div>
        </div>
    );
}
