"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, User, Sparkles } from "lucide-react";

interface Message {
    id: string;
    role: "user" | "doula";
    text: string;
}

export const ChatOverlay: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            role: "doula",
            text: "Hi mama! I'm your personal doula. How are you feeling today?",
        },
    ]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isTyping, setIsTyping] = useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Message = { id: Date.now().toString(), role: "user", text: input };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput("");
        setIsTyping(true);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: input,
                    history: messages.slice(-5) // Send last 5 context messages
                }),
            });

            const data = await response.json();

            setIsTyping(false);
            setMessages((prev) => [
                ...prev,
                { id: Date.now().toString(), role: "doula", text: data.text }
            ]);
        } catch (error) {
            console.error("Chat Error:", error);
            setIsTyping(false);
            setMessages((prev) => [
                ...prev,
                { id: Date.now().toString(), role: "doula", text: "I'm sorry, I couldn't reach the server. Please try again." }
            ]);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="mb-4 w-[350px] h-[500px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-stone-100"
                    >
                        {/* Header */}
                        <div className="bg-brand-coral p-4 text-white flex justify-between items-center shadow-md">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">Nourish Doula</h3>
                                    <div className="flex items-center gap-1">
                                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                        <span className="text-xs text-white/80">Online</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-white/80 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 bg-brand-softWhite space-y-4">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${msg.role === "user"
                                            ? "bg-brand-coral text-white rounded-br-none"
                                            : "bg-white text-brand-text border border-stone-200 rounded-bl-none"
                                            }`}
                                    >
                                        {msg.text}
                                    </div>
                                </div>
                            ))}

                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-white px-4 py-2 rounded-2xl rounded-bl-none shadow-sm flex gap-1 items-center">
                                        <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce duration-1000 delay-0" />
                                        <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce duration-1000 delay-150" />
                                        <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce duration-1000 delay-300" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-3 bg-white border-t border-stone-100">
                            <form
                                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                                className="flex gap-2 items-center bg-stone-100 rounded-full px-4 py-2"
                            >
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask me anything..."
                                    className="flex-1 bg-transparent outline-none text-sm text-brand-text placeholder-stone-400"
                                />
                                <button
                                    disabled={!input.trim()}
                                    type="submit"
                                    className="p-2 bg-brand-coral rounded-full text-white disabled:opacity-50 hover:scale-105 transition-transform"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 bg-brand-coral rounded-full shadow-lg flex items-center justify-center text-white"
            >
                <MessageCircle className="w-7 h-7" />
            </motion.button>
        </div>
    );
};
