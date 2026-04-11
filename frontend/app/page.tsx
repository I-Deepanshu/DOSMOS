"use client";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function EntryPage() {
  const router = useRouter();
  const [dob, setDob] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dob) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/dob", { dob });
      if (data.redirect === "register") {
        router.push("/register");
        return;
      }
      
      sessionStorage.setItem("stepToken", data.stepToken);
      sessionStorage.setItem("maskedName", data.maskedName);
      router.push("/verify");
    } catch (err: any) {
      const msg = err.response?.data?.error || "Connection error.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <motion.div
        className="premium-panel w-full max-w-[400px]"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="text-center mb-8">
          <h1 className="heading-orbitron text-[32px] mb-2 text-white glow-pulse text-shadow-glow">DOSMOS</h1>
          <p className="text-[14px] text-[var(--text-secondary)]">
            Enter your point of origin to proceed.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <input
              ref={inputRef}
              type="date"
              className="premium-input text-center text-[16px]"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              required
              style={{ colorScheme: "dark" }}
            />
          </div>

          <div className="min-h-[24px] text-center mt-[-8px]">
             {error && <div className="text-[var(--error-color)] text-[14px] animate-shake">{error}</div>}
          </div>

          <button
            type="submit"
            className="premium-btn w-full mt-[-8px]"
            disabled={loading || !dob}
          >
            {loading ? "Aligning..." : "Connect"}
          </button>
        </form>

        <div className="mt-8 border-t border-[var(--border-soft)] pt-6 flex flex-col items-center gap-2">
           <span className="text-[12px] text-[var(--text-muted)] tracking-wide">New here?</span>
           <button 
             onClick={() => router.push('/register')}
             className="text-[14px] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors duration-200"
           >
             Create a new presence →
           </button>
        </div>
      </motion.div>
    </main>
  );
}
