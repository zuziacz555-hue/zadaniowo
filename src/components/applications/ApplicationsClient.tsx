"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, User, Calendar, MessageSquare, CheckCircle2, XCircle, Clock, ChevronRight, Inbox } from "lucide-react";
import { getTeamApplications, respondToTeamApplication } from "@/lib/actions/notifications";
import { cn } from "@/lib/utils";
import { popIn, slideUp, staggerContainer } from "@/lib/animations";

export default function ApplicationsClient() {
    const [applications, setApplications] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [activeTeamId, setActiveTeamId] = useState<number | null>(null);
    const [processingId, setProcessingId] = useState<number | null>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        const storedTeamId = localStorage.getItem("activeTeamId");

        if (storedUser) setUser(JSON.parse(storedUser));
        if (storedTeamId) {
            const teamId = parseInt(storedTeamId);
            setActiveTeamId(teamId);
            fetchApplications(teamId);
        }
    }, []);

    const fetchApplications = async (teamId: number) => {
        setIsLoading(true);
        const res = await getTeamApplications(teamId);
        if (res.success) {
            setApplications(res.data || []);
        }
        setIsLoading(false);
    };

    const handleAction = async (notificationId: number, accept: boolean) => {
        setProcessingId(notificationId);
        const res = await respondToTeamApplication(notificationId, accept);
        if (res.success) {
            // Refresh list
            if (activeTeamId) fetchApplications(activeTeamId);
        }
        setProcessingId(null);
    };

    const pendingApps = applications.filter(app => app.status === 'PENDING');
    const historyApps = applications.filter(app => app.status !== 'PENDING').slice(0, 10);

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto space-y-12 pb-20">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row md:items-end justify-between gap-6"
                >
                    <div>
                        <div className="flex items-center gap-3 text-purple-600 mb-2">
                            <Sparkles size={24} />
                            <span className="font-bold tracking-widest uppercase text-sm">Rekrutacja</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight">
                            Aplikacje <span className="text-purple-600">do zespołu</span>
                        </h1>
                    </div>
                </motion.div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 grayscale opacity-50">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
                        <p className="font-bold text-gray-500 uppercase tracking-widest">Pobieranie zgłoszeń...</p>
                    </div>
                ) : (
                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        animate="animate"
                        className="grid grid-cols-1 lg:grid-cols-3 gap-10"
                    >
                        {/* Pending Applications List */}
                        <div className="lg:col-span-2 space-y-6">
                            <h2 className="text-2xl font-bold flex items-center gap-3 text-gray-800">
                                <Inbox className="text-purple-500" />
                                Nowe zgłoszenia
                                {pendingApps.length > 0 && (
                                    <span className="bg-purple-100 text-purple-600 px-3 py-1 rounded-full text-sm">
                                        {pendingApps.length}
                                    </span>
                                )}
                            </h2>

                            {pendingApps.length === 0 ? (
                                <div className="lux-card p-12 text-center bg-gray-50/50 border-dashed border-2">
                                    <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-gray-400">
                                        <Inbox size={40} />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">Brak nowych aplikacji</h3>
                                    <p className="text-gray-500 max-w-xs mx-auto">
                                        Gdy ktoś wyśle zgłoszenie do Twojego zespołu, pojawi się ono tutaj.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <AnimatePresence mode="popLayout">
                                        {pendingApps.map((app) => {
                                            const data = app.data as any;
                                            return (
                                                <motion.div
                                                    key={app.id}
                                                    variants={popIn}
                                                    layout
                                                    exit={{ opacity: 0, scale: 0.9, x: -20 }}
                                                    className="lux-card p-8 group hover:border-purple-200 transition-all bg-white"
                                                >
                                                    <div className="flex flex-col md:flex-row gap-8 items-start justify-between">
                                                        <div className="flex gap-6 items-start flex-1">
                                                            <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                                                <User size={28} />
                                                            </div>
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <h3 className="text-2xl font-bold text-gray-900 mb-1">
                                                                        {data.applicantName || app.user?.imieNazwisko}
                                                                    </h3>
                                                                    <div className="flex items-center gap-4 text-gray-400 text-sm font-medium">
                                                                        <span className="flex items-center gap-1.5">
                                                                            <Calendar size={14} />
                                                                            {new Date(app.createdAt).toLocaleDateString('pl-PL')}
                                                                        </span>
                                                                        <span className="flex items-center gap-1.5">
                                                                            <Clock size={14} />
                                                                            {new Date(app.createdAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 relative">
                                                                    <MessageSquare className="absolute -top-3 -left-3 text-purple-200" size={24} fill="currentColor" />
                                                                    <p className="text-gray-700 leading-relaxed italic font-medium">
                                                                        "{data.motivation}"
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex md:flex-col gap-3 w-full md:w-auto">
                                                            <button
                                                                onClick={() => handleAction(app.id, true)}
                                                                disabled={processingId === app.id}
                                                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-black rounded-xl hover:bg-green-700 active:scale-95 transition-all shadow-lg shadow-green-100 uppercase tracking-widest text-xs disabled:opacity-50"
                                                            >
                                                                <CheckCircle2 size={18} />
                                                                Przyjmij
                                                            </button>
                                                            <button
                                                                onClick={() => handleAction(app.id, false)}
                                                                disabled={processingId === app.id}
                                                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white text-red-600 border-2 border-red-50 font-bold rounded-xl hover:bg-red-50 active:scale-95 transition-all uppercase tracking-widest text-xs disabled:opacity-50"
                                                            >
                                                                <XCircle size={18} />
                                                                Odrzuć
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>

                        {/* Recent History Sidebar */}
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold flex items-center gap-3 text-gray-800">
                                <Clock className="text-gray-400" />
                                Ostatnio rozpatrzone
                            </h2>

                            <div className="lux-card overflow-hidden">
                                {historyApps.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400 text-sm font-medium italic">
                                        Brak historii zgłoszeń.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-50">
                                        {historyApps.map((app) => (
                                            <div key={app.id} className="p-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                                                        app.status === 'ACCEPTED' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                                                    )}>
                                                        {app.status === 'ACCEPTED' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 text-sm">
                                                            {(app.data as any).applicantName || app.user?.imieNazwisko}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">
                                                            {app.status === 'ACCEPTED' ? 'Zaakceptowano' : 'Odrzucono'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-300">
                                                    {new Date(app.updatedAt).toLocaleDateString('pl-PL')}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </DashboardLayout>
    );
}
