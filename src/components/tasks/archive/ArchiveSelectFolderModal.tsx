"use client";

import { useState, useEffect } from "react";
import { getArchiveFolders, createArchiveFolder } from "@/lib/actions/archive";
// Dialog imports removed as we use custom AnimatePresence modal below

import { motion, AnimatePresence } from "framer-motion";
import { Folder, Plus, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ArchiveSelectFolderModal({ isOpen, onClose, onSelect, userId, role }: any) {
    const [folders, setFolders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newFolderName, setNewFolderName] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadFolders();
        }
    }, [isOpen]);

    const loadFolders = async () => {
        setLoading(true);
        const res = await getArchiveFolders(userId, role);
        if (res.success) setFolders(res.data || []);
        setLoading(false);
    };

    const handleCreate = async () => {
        if (!newFolderName.trim()) return;
        setIsCreating(true);
        const res = await createArchiveFolder(newFolderName, userId);
        if (res.success) {
            await loadFolders();
            setNewFolderName("");
        }
        setIsCreating(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
                    />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="lux-card-strong p-10 relative z-10 w-full max-w-md max-h-[85vh] flex flex-col border-white/40"
                    >
                        <button onClick={onClose} className="absolute top-8 right-8 text-muted-foreground/30 hover:text-red-600 transition-colors">
                            <X size={24} />
                        </button>

                        <div className="mb-8">
                            <h3 className="text-3xl font-black gradient-text tracking-tighter leading-none mb-3">Wybierz folder</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Gdzie chcesz zarchiwizować to zgłoszenie?</p>
                        </div>

                        <div className="flex gap-2 mb-8 bg-white/40 p-3 rounded-[24px] border border-white/60 shadow-inner">
                            <input
                                className="lux-input py-3 text-[10px] bg-white/60 flex-1"
                                placeholder="Nazwa nowego folderu..."
                                value={newFolderName}
                                onChange={e => setNewFolderName(e.target.value)}
                            />
                            <button
                                onClick={handleCreate}
                                disabled={!newFolderName.trim() || isCreating}
                                className="size-11 lux-gradient text-white rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center disabled:opacity-50 hover:-translate-y-0.5 transition-all"
                            >
                                {isCreating ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2 min-h-[250px]">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <Loader2 className="animate-spin text-primary" size={32} />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Ładowanie archiwum...</p>
                                </div>
                            ) : folders.length > 0 ? (
                                folders.map(folder => (
                                    <button
                                        key={folder.id}
                                        onClick={() => onSelect(folder.id)}
                                        className="w-full flex items-center gap-4 p-5 rounded-[24px] bg-white/40 border border-white/60 hover:bg-white hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all group text-left"
                                    >
                                        <div className="size-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all shadow-sm">
                                            <Folder size={22} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-black uppercase tracking-tight text-gray-800">{folder.nazwa}</div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mt-0.5">{folder.executionCount} pozycji</div>
                                        </div>
                                        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="size-8 rounded-full bg-primary/5 flex items-center justify-center text-primary">
                                                <X className="rotate-45" size={16} />
                                            </div>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 grayscale opacity-40">
                                    <Folder size={48} className="mb-4 text-muted-foreground" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-center">Brak folderów w archiwum</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
