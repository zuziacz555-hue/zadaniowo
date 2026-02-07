"use client";

import { useState, useEffect } from "react";
import { Lock, User, ArrowRight, Sparkles, Hexagon } from "lucide-react";
import { motion, useMotionTemplate, useMotionValue, animate } from "framer-motion";
import { useRouter } from "next/navigation";
import { login } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  // Animated background gradient
  const color = useMotionValue("#4F46E5"); // Initial color

  useEffect(() => {
    // Cycle through colors
    animate(color, ["#4F46E5", "#8B5CF6", "#EC4899", "#4F46E5"], {
      ease: "linear",
      duration: 10,
      repeat: Infinity,
    });
  }, []);

  const backgroundImage = useMotionTemplate`radial-gradient(125% 125% at 50% 10%, #fff 40%, ${color})`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Simulate a minimum loading time for better UX feel
    await new Promise(resolve => setTimeout(resolve, 800));

    const res = await login(formData.username, formData.password);

    if (res.success) {
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
    <motion.main
      style={{ backgroundImage }}
      className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Decorative Floating Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top Left Blob */}
        <motion.div
          animate={{
            y: [0, -20, 0],
            rotate: [0, 5, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-20 w-96 h-96 bg-purple-300/30 rounded-full blur-[100px]"
        />
        {/* Bottom Right Blob */}
        <motion.div
          animate={{
            y: [0, 30, 0],
            rotate: [0, -5, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -bottom-32 -right-20 w-[500px] h-[500px] bg-blue-300/30 rounded-full blur-[120px]"
        />

        {/* Floating Icons */}
        <motion.div
          animate={{ y: [0, -15, 0], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 5, repeat: Infinity }}
          className="absolute top-1/4 left-[15%] text-indigo-300/50"
        >
          <Hexagon size={48} strokeWidth={1} />
        </motion.div>

        <motion.div
          animate={{ y: [0, 20, 0], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 7, repeat: Infinity, delay: 2 }}
          className="absolute bottom-1/3 right-[10%] text-purple-300/50"
        >
          <Sparkles size={64} strokeWidth={1} />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[480px]"
      >
        {/* Glass Card */}
        <div className="relative overflow-hidden rounded-[40px] border border-white/60 bg-white/40 backdrop-blur-xl shadow-2xl p-1">

          {/* Inner Content Container */}
          <div className="bg-white/50 rounded-[36px] p-8 md:p-12 relative overflow-hidden">

            {/* Spotlight effect */}
            <motion.div
              className="pointer-events-none absolute -inset-px rounded-[36px] opacity-0 transition duration-300 group-hover:opacity-100"
              style={{
                background: useMotionTemplate`
                          radial-gradient(
                            650px circle at ${mouseX}px ${mouseY}px,
                            rgba(255,255,255,0.4),
                            transparent 80%
                          )
                        `,
              }}
            />

            {/* Header */}
            <div className="text-center mb-10 relative z-10">
              <motion.div
                whileHover={{ scale: 1.05, rotate: 2 }}
                transition={{ type: "spring", stiffness: 300, damping: 10 }}
                className="w-28 h-28 mx-auto mb-6 relative group cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
                <img
                  src="/app-logo.jpg"
                  alt="Logo"
                  className="w-full h-full object-cover rounded-3xl shadow-2xl relative z-10 border-[3px] border-white"
                />
                <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1.5 shadow-lg z-20">
                  <Sparkles size={16} className="text-violet-600 fill-violet-600 animate-pulse" />
                </div>
              </motion.div>

              <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                Witaj ponownie!
              </h1>
              <p className="text-gray-600 font-medium text-lg">
                Zaloguj się do <span className="text-violet-600 font-bold">Zadaniowo</span>
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">
                  Login
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-violet-600 transition-colors">
                    <User size={20} />
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full h-14 pl-12 pr-4 bg-white/70 border-2 border-transparent focus:border-violet-500/50 focus:bg-white focus:ring-4 focus:ring-violet-500/10 rounded-2xl outline-none font-semibold text-gray-800 placeholder:text-gray-400 transition-all shadow-sm group-hover:bg-white"
                    placeholder="Wpisz swój login..."
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">
                  Hasło
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-violet-600 transition-colors">
                    <Lock size={20} />
                  </div>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full h-14 pl-12 pr-4 bg-white/70 border-2 border-transparent focus:border-violet-500/50 focus:bg-white focus:ring-4 focus:ring-violet-500/10 rounded-2xl outline-none font-semibold text-gray-800 placeholder:text-gray-400 transition-all shadow-sm group-hover:bg-white"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-14 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold text-lg shadow-[0_4px_14px_0_rgba(0,0,0,0.39)] hover:shadow-[0_6px_20px_rgba(93,93,255,0.23)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:hover:translate-y-0 relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {isLoading ? "Logowanie..." : "Zaloguj się"}
                    {!isLoading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                  </span>

                  {/* Button Shine Effect */}
                  <div className="absolute inset-0 -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent z-0" />
                </button>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-red-50 text-red-600 text-sm font-bold text-center border border-red-100 flex items-center justify-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {error}
                </motion.div>
              )}
            </form>
          </div>

          {/* Bottom Glass Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 opacity-80" />
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500/60 text-xs font-bold uppercase tracking-[0.2em] mt-8 mix-blend-multiply">
          Secure Access • Zadaniowo 2026
        </p>

      </motion.div>
    </motion.main>
  );
}
