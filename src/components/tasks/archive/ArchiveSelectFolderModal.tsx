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
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-white p-8 rounded-[32px] shadow-2xl relative z-10 w-full max-w-md max-h-[80vh] flex flex-col"
                    >
                        <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 transition-colors">
                            <X size={24} />
                        </button>

                        <h3 className="text-2xl font-bold mb-2">Wybierz folder</h3>
                        <p className="text-muted-foreground text-sm mb-6">Wybierz folder w archiwum, do którego trafią zadania.</p>

                        <div className="flex gap-2 mb-6">
                            <input
                                className="lux-input py-2 text-sm"
                                placeholder="Nowy folder..."
                                value={newFolderName}
                                onChange={e => setNewFolderName(e.target.value)}
                            />
                            <button
                                onClick={handleCreate}
                                disabled={!newFolderName.trim() || isCreating}
                                className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl disabled:opacity-50 transition-colors"
                            >
                                {isCreating ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2 min-h-[200px]">
                            {loading ? (
                                <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-gray-300" /></div>
                            ) : folders.length > 0 ? (
                                folders.map(folder => (
                                    <button
                                        key={folder.id}
                                        onClick={() => onSelect(folder.id)}
                                        className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50 transition-all group text-left"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Folder size={20} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900 group-hover:text-emerald-700">{folder.nazwa}</div>
                                            <div className="text-xs text-muted-foreground">{folder.executionCount} zadań</div>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="text-center py-10 text-muted-foreground italic">Brak folderów. Utwórz pierwszy!</div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
