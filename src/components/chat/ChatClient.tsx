"use client";

import { useState, useEffect, useRef } from "react";
import {
    Send,
    MessageSquareText,
    Search,
    User,
    Clock,
    ArrowLeft,
    Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getChatContacts, getChatMessages, sendChatMessage } from "@/lib/actions/chat";
import { useRouter } from "next/navigation";

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
            interval = setInterval(loadContacts, 5000); // Polling kontaktów rzadziej
        }
        return () => clearInterval(interval);
    }, [user, role]);

    useEffect(() => {
        let interval: any;
        if (user && selectedContact) {
            loadMessages();
            interval = setInterval(loadMessages, 3000); // Polling wiadomości
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

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedContact) return;

        const content = newMessage;
        setNewMessage(""); // Clear immediate UI

        const res = await sendChatMessage(user.id, selectedContact.id, content);
        if (res.success) {
            loadMessages();
            loadContacts(); // Odśwież kontakty, aby przenieść na górę
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
        <div className="flex h-full gap-6 bg-gray-50/50 p-6 rounded-[32px] overflow-hidden lg:flex-row flex-col">
            {/* Contacts List */}
            <div className={cn(
                "lg:w-80 w-full flex flex-col bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden shrink-0",
                selectedContact && "hidden lg:flex"
            )}>
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <MessageSquareText size={20} className="text-primary" />
                        Wiadomości
                    </h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            placeholder="Szukaj kontaktu..."
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    {filteredContacts.length === 0 ? (
                        <div className="text-center py-10 px-4 text-muted-foreground italic text-sm">
                            Brak dostępnych kontaktów
                        </div>
                    ) : (
                        filteredContacts.map(contact => (
                            <button
                                key={contact.id}
                                onClick={() => setSelectedContact(contact)}
                                className={cn(
                                    "w-full flex items-center gap-3 p-3 rounded-xl transition-all mb-1",
                                    selectedContact?.id === contact.id
                                        ? "bg-primary text-white shadow-md"
                                        : "hover:bg-gray-50 text-gray-700 hover:text-gray-900"
                                )}
                            >
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-sm",
                                    selectedContact?.id === contact.id ? "bg-white/20" : "bg-primary/10 text-primary"
                                )}>
                                    {contact.imieNazwisko[0]}
                                </div>
                                <div className="text-left overflow-hidden flex-1">
                                    <p className="font-bold text-sm truncate">{contact.imieNazwisko}</p>
                                    <p className={cn(
                                        "text-[10px] uppercase font-black tracking-widest opacity-60 truncate",
                                        selectedContact?.id === contact.id ? "text-white" : "text-muted-foreground"
                                    )}>
                                        {contact.rola}
                                    </p>
                                </div>
                                {contact.unread > 0 && selectedContact?.id !== contact.id && (
                                    <div className="bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 animate-bounce shadow-sm">
                                        {contact.unread}
                                    </div>
                                )}
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Window */}
            <div className={cn(
                "flex-1 flex flex-col bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden h-[calc(100vh-12rem)] min-h-[500px]",
                !selectedContact && "hidden lg:flex items-center justify-center"
            )}>
                {selectedContact ? (
                    <>
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setSelectedContact(null)}
                                    className="lg:hidden p-2 hover:bg-gray-50 rounded-lg text-gray-400"
                                >
                                    <ArrowLeft size={20} />
                                </button>
                                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                                    {selectedContact.imieNazwisko[0]}
                                </div>
                                <h3 className="font-bold text-sm">{selectedContact.imieNazwisko}</h3>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4 custom-scrollbar bg-gray-50/30">
                            {messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center px-10">
                                    <div className="w-16 h-16 rounded-[24px] bg-white shadow-sm flex items-center justify-center mb-4">
                                        <MessageSquareText size={24} className="text-gray-300" />
                                    </div>
                                    <p className="text-sm italic">Brak wiadomości. Przywitaj się!</p>
                                    <p className="text-[10px] mt-2 opacity-60">Pamiętaj, że wszystkie wiadomości są usuwane po 24 godzinach od ich wysłania.</p>
                                </div>
                            ) : (
                                messages.map((msg) => {
                                    const isMe = msg.senderId === user.id;
                                    return (
                                        <div key={msg.id} className={cn(
                                            "flex w-full mb-1",
                                            isMe ? "justify-end" : "justify-start"
                                        )}>
                                            <div className={cn(
                                                "max-w-[80%] px-4 py-3 rounded-2xl text-sm relative group transition-all transform hover:scale-[1.01]",
                                                isMe
                                                    ? "bg-primary text-white rounded-br-none shadow-sm"
                                                    : "bg-white text-gray-800 rounded-bl-none shadow-sm border border-gray-100"
                                            )}>
                                                <p className="leading-relaxed font-medium">{msg.content}</p>
                                                <span className={cn(
                                                    "text-[8px] opacity-40 mt-1 block font-bold",
                                                    isMe ? "text-right text-blue-100" : "text-gray-400"
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
                        <div className="p-4 bg-white border-t border-gray-100">
                            <form onSubmit={handleSendMessage} className="flex gap-3">
                                <input
                                    className="flex-1 px-5 py-3.5 bg-gray-50 rounded-2xl text-sm font-medium border-none focus:ring-2 focus:ring-primary/20 transition-all"
                                    placeholder="Napisz wiadomość..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
                                >
                                    <Send size={20} />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground animate-in fade-in zoom-in duration-500">
                        <div className="w-24 h-24 rounded-[32px] bg-primary/5 flex items-center justify-center mb-6 text-primary">
                            <MessageSquareText size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Twój bezpieczny czat</h3>
                        <p className="max-w-xs text-sm leading-relaxed mb-6">Wybierz kontakt z listy po lewej stronie, aby rozpocząć rozmowę. Wszystkie wiadomości zostaną automatycznie usunięte po 24 godzinach.</p>
                        <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest">
                            <User size={12} className="text-primary" />
                            {user.imieNazwisko} • {role}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
