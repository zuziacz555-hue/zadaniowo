"use client";

import { useState } from "react";
import { Lock, User } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { login } from "@/lib/actions/auth";
import { loginContainerVariant, loginItemVariant } from "@/lib/animations";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const res = await login(formData.username, formData.password);

    if (res.success) {
      // Store user info in localStorage for client-side persistence (simple demo)
      if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(res.user));
      }
      router.push("/dashboard");
    } else {
      setIsLoading(false);
      setError(res.error || "Nieprawidłowe dane logowania.");
    }
  };

  return (
    <main className="min-h-screen relative flex items-center justify-center p-6 bg-white overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-blue-100/40 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1], x: [0, 50, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-100/40 rounded-full blur-[100px]"
        />
      </div>

      <motion.div
        initial="hidden"
        animate="show"
        variants={loginContainerVariant}
        className="relative z-10 w-full max-w-[450px]"
      >
        <div className="lux-card-strong p-12 backdrop-blur-3xl bg-white/60 border border-white/50 shadow-[0_30px_60px_rgba(0,0,0,0.05)]">
          <motion.div variants={loginItemVariant} className="text-center mb-10">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="w-20 h-20 lux-gradient rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-[0_12px_30px_rgba(84,0,255,0.25)]"
            >
              <Lock className="text-white" size={36} />
            </motion.div>
            <h1 className="text-4xl font-bold mb-3 tracking-tight text-foreground">Witaj ponownie</h1>
            <p className="text-muted-foreground font-medium">
              Zaloguj się do platformy <span className="text-primary font-bold">Zadaniowo</span>
            </p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <motion.div variants={loginItemVariant} className="space-y-2 relative">
              <label htmlFor="username" className="text-xs font-bold text-muted-foreground ml-1 uppercase tracking-widest">
                Imię i nazwisko
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-primary transition-colors pointer-events-none">
                  <User size={20} />
                </div>
                <input
                  id="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Wpisz swoje imię..."
                  className="lux-input pl-12 h-14 text-lg bg-white/80 focus:bg-white transition-all"
                />
              </div>
            </motion.div>

            <motion.div variants={loginItemVariant} className="space-y-2 relative">
              <label htmlFor="password" className="text-xs font-bold text-muted-foreground ml-1 uppercase tracking-widest">
                Hasło
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-primary transition-colors pointer-events-none">
                  <Lock size={20} />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="lux-input pl-12 h-14 text-lg bg-white/80 focus:bg-white transition-all"
                />
              </div>
            </motion.div>

            <motion.div variants={loginItemVariant} className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="lux-btn w-full h-14 text-lg shadow-[0_10px_30px_rgba(84,0,255,0.2)] hover:shadow-[0_15px_40px_rgba(84,0,255,0.3)] disabled:opacity-70 flex items-center justify-center gap-2 group"
              >
                {isLoading ? (
                  "Ładowanie..."
                ) : (
                  <>
                    Zaloguj się <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </>
                )}
              </button>
            </motion.div>

            <motion.div variants={loginItemVariant} className="min-h-[24px]">
              {error && (
                <p className="text-center text-red-500 text-sm font-bold animate-slide-in flex items-center justify-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> {error}
                </p>
              )}
            </motion.div>
          </form>

          <motion.div variants={loginItemVariant} className="mt-8 text-center border-t border-gray-100 pt-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest opacity-60">
              Panel Zadaniowo © 2026
            </p>
          </motion.div>
        </div>
      </motion.div>
    </main>
  );
}
