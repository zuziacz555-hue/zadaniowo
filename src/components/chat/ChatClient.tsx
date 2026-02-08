"use client";

import { useState, useEffect, useRef } from "react";
import {
    Send,
    MessageSquareText,
    Search,
    User,
    Clock,
    ArrowLeft,
    Loader2,
    ChevronRight,
    MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getChatContacts, getChatMessages, sendChatMessage } from "@/lib/actions/chat";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function ChatClient() {
    const [user, setUser] = useState<any>(null);
    const [role, setRole] = useState("");
    const [contacts, setContacts] = useState<any[]>([]);
    const [selectedContact, setSelectedContact] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        const storedRole = localStorage.getItem("activeRole");
        if (storedUser) {
            const parsed = JSON.parse(storedUser);
            setUser(parsed);
            const r = (storedRole || parsed.role || parsed.rola || "UCZESTNICZKA").toUpperCase();
            setRole(r);
        } else {
            router.push("/dashboard");
        }
    }, []);

    useEffect(() => {
        let interval: any;
        if (user) {
            loadContacts();
            interval = setInterval(loadContacts, 5000);
        }
        return () => clearInterval(interval);
    }, [user, role]);

    useEffect(() => {
        let interval: any;
        if (user && selectedContact) {
            loadMessages();
            interval = setInterval(loadMessages, 3000);
        }
        return () => clearInterval(interval);
    }, [user, selectedContact]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const loadContacts = async () => {
        const res = await getChatContacts(user.id, role);
        if (res.success) setContacts(res.data || []);
        setLoading(false);
    };

    const loadMessages = async () => {
        if (!selectedContact) return;
        const res = await getChatMessages(user.id, selectedContact.id);
        if (res.success) setMessages(res.data || []);
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim() || !selectedContact) return;

        const content = newMessage;
        setNewMessage("");

        const res = await sendChatMessage(user.id, selectedContact.id, content);
        if (res.success) {
            loadMessages();
            loadContacts();
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const filteredContacts = contacts.filter(c =>
        c.imieNazwisko.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    return (
        <DashboardLayout>
            <div className="h-[calc(100vh-140px)] animate-slide-in">
                <div className="lux-card-strong h-full flex overflow-hidden lg:flex-row flex-col border-white/60">
                    {/* Contacts List */}
                    <div className={cn(
                        "lg:w-96 w-full flex flex-col border-r border-white/40 bg-white/30 backdrop-blur-md",
                        selectedContact && "hidden lg:flex"
                    )}>
                        <div className="p-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-black gradient-text">Konwersacje</h2>
                                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                                    <MessageSquareText size={20} />
                                </div>
                            </div>
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <input
                                    placeholder="Szukaj kontaktu..."
                                    className="lux-input pl-12 py-3.5 text-sm"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-2 custom-scrollbar">
                            {filteredContacts.length === 0 ? (
                                <div className="text-center py-10 px-4 text-muted-foreground italic text-sm opacity-50">
                                    Brak dostępnych kontaktów
                                </div>
                            ) : (
                                filteredContacts.map(contact => (
                                    <button
                                        key={contact.id}
                                        onClick={() => setSelectedContact(contact)}
                                        className={cn(
                                            "w-full p-4 rounded-3xl transition-all duration-300 flex items-center gap-4 relative group",
                                            selectedContact?.id === contact.id
                                                ? "bg-white shadow-xl shadow-primary/5 border border-primary/10 translate-x-1"
                                                : "hover:bg-white/60 hover:translate-x-1"
                                        )}
                                    >
                                        {selectedContact?.id === contact.id && (
                                            <motion.div
                                                layoutId="active-contact"
                                                className="absolute left-0 top-4 bottom-4 w-1.5 bg-primary rounded-r-full"
                                            />
                                        )}

                                        <div className="relative">
                                            <div className={cn(
                                                "size-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-inner transition-colors",
                                                selectedContact?.id === contact.id ? "bg-primary text-white" : "bg-primary/10 text-primary"
                                            )}>
                                                {contact.imieNazwisko[0]}
                                            </div>
                                        </div>

                                        <div className="flex-1 text-left">
                                            <h3 className={cn(
                                                "font-bold text-sm transition-colors",
                                                selectedContact?.id === contact.id ? "text-primary" : "text-foreground"
                                            )}>
                                                {contact.imieNazwisko}
                                            </h3>
                                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">
                                                {contact.rola}
                                            </p>
                                        </div>

                                        {contact.unread > 0 && selectedContact?.id !== contact.id && (
                                            <div className="bg-red-500 text-white text-[10px] font-black w-6 h-6 rounded-xl flex items-center justify-center shrink-0 animate-bounce shadow-lg shadow-red-500/20">
                                                {contact.unread}
                                            </div>
                                        )}

                                        <ChevronRight size={16} className={cn(
                                            "opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0 text-primary",
                                            selectedContact?.id === contact.id && "opacity-100 translate-x-0"
                                        )} />
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Chat Window */}
                    <div className={cn(
                        "flex-1 flex flex-col bg-white/10 overflow-hidden",
                        !selectedContact && "hidden lg:flex"
                    )}>
                        {selectedContact ? (
                            <>
                                {/* Header */}
                                <div className="p-6 border-b border-white/40 bg-white/40 backdrop-blur-md flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => setSelectedContact(null)}
                                            className="lg:hidden p-3 bg-white/60 hover:bg-white rounded-2xl text-primary transition-all shadow-sm"
                                        >
                                            <ArrowLeft size={20} />
                                        </button>
                                        <div className="size-12 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-lg shadow-lg shadow-primary/20">
                                            {selectedContact.imieNazwisko[0]}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-base text-foreground leading-none mb-1">{selectedContact.imieNazwisko}</h3>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">{selectedContact.rola}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Messages Area */}
                                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-white/20">
                                    {messages.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center px-10 animate-in fade-in duration-1000">
                                            <div className="w-20 h-20 rounded-[32px] bg-white shadow-sm flex items-center justify-center mb-6">
                                                <MessageSquareText size={32} className="text-primary/20" />
                                            </div>
                                            <h4 className="text-xl font-black gradient-text mb-2">Przywitaj się!</h4>
                                            <p className="text-xs italic max-w-[240px] leading-relaxed">Pamiętaj, że wszystkie wiadomości są automatycznie usuwane po 24 godzinach.</p>
                                        </div>
                                    ) : (
                                        messages.map((msg) => {
                                            const isMe = msg.senderId === user.id;
                                            return (
                                                <div key={msg.id} className={cn(
                                                    "flex w-full mb-2 animate-in fade-in slide-in-from-bottom-2 duration-300",
                                                    isMe ? "justify-end" : "justify-start"
                                                )}>
                                                    <div className={cn(
                                                        "max-w-[75%] px-5 py-4 rounded-3xl text-sm relative group transition-all shadow-sm",
                                                        isMe
                                                            ? "lux-gradient-strong text-white rounded-br-none shadow-primary/20"
                                                            : "bg-white/80 backdrop-blur-md text-gray-800 rounded-bl-none border border-white/60"
                                                    )}>
                                                        <p className="leading-relaxed font-semibold">{msg.content}</p>
                                                        <span className={cn(
                                                            "text-[9px] opacity-40 mt-2 block font-black uppercase tracking-widest",
                                                            isMe ? "text-right text-blue-50" : "text-gray-400"
                                                        )}>
                                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input Area */}
                                <div className="p-8 bg-white/40 backdrop-blur-md border-t border-white/40 shrink-0">
                                    <form onSubmit={handleSendMessage} className="flex gap-4 items-end">
                                        <div className="flex-1 relative group">
                                            <textarea
                                                rows={1}
                                                className="lux-input py-4 px-6 min-h-[56px] max-h-[160px] resize-none pr-12"
                                                placeholder="Twoja wiadomość..."
                                                value={newMessage}
                                                onChange={(e) => {
                                                    setNewMessage(e.target.value);
                                                    e.target.style.height = 'auto';
                                                    e.target.style.height = e.target.scrollHeight + 'px';
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleSendMessage();
                                                    }
                                                }}
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={!newMessage.trim()}
                                            className="p-4 bg-primary text-white rounded-[20px] shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all hover:bg-primary/90 disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
                                        >
                                            <Send size={24} />
                                        </button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full p-12 text-center text-muted-foreground bg-white/20 backdrop-blur-sm animate-in fade-in zoom-in duration-700">
                                <div className="w-28 h-28 rounded-[48px] bg-primary/5 flex items-center justify-center mb-8 text-primary group">
                                    <MessageSquareText size={48} className="group-hover:scale-110 transition-transform duration-500" />
                                </div>
                                <h3 className="text-3xl font-black gradient-text mb-4">Centrum Komunikacji</h3>
                                <p className="max-w-sm text-sm font-medium leading-relaxed mb-8 opacity-70">Wszelkie ustalenia poczynione tutaj są poufne i wygasają po upływie doby.</p>
                                <div className="flex items-center gap-4 bg-white/60 backdrop-blur-sm border border-white/60 px-6 py-3 rounded-2xl shadow-sm">
                                    <div className="size-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Połączono Jako {user?.imieNazwisko}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
