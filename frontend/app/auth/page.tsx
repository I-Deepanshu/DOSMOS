"use client";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { setAccessToken, setUser, setSessionCookie } from "@/lib/auth";

export default function SecurityQuestionPage() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [stepToken, setStepToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = sessionStorage.getItem("stepToken");
    const q = sessionStorage.getItem("question");
    if (!token || !q) {
      router.push("/");
      return;
    }
    setStepToken(token);
    setQuestion(q);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim()) return;
    setLoading(true);
    setError("");

    try {
      const { data } = await api.post("/auth/verify", { stepToken, answer });
      
      if (data.redirect === "register") {
        router.push("/register");
        return;
      }
      setAccessToken(data.accessToken);
      setUser(data.user);
      setSessionCookie(); // write readable cookie on Vercel domain for middleware
      
      sessionStorage.clear(); // Clean up auth flow temp data
      router.push(data.user.role === "admin" ? "/admin" : "/chat");
    } catch (err: any) {
      setError(err.response?.data?.error || "Identity could not be verified.");
      setAnswer("");
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  if (!stepToken) return null;

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <motion.div
        className="premium-panel w-full max-w-[400px] text-center"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <p className="text-[12px] text-[var(--text-secondary)] mb-2 uppercase tracking-widest">Verification Protocol</p>
        
        <h2 className="text-[20px] font-medium leading-relaxed text-white mb-8">
          {question}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            ref={inputRef}
            type="password"
            className="premium-input"
            value={answer}
            onChange={(e) => {
                setAnswer(e.target.value);
                if (error) setError("");
            }}
            disabled={loading}
          />

          <div className="min-h-[20px] flex items-center justify-between">
             {error ? (
                <div className="text-[var(--error-color)] text-[12px] animate-shake">{error}</div>
             ) : (
                <div className="text-[12px] text-[var(--text-muted)]">Enter your answer to connect</div>
             )}
          </div>

          <button
            type="submit"
            className="premium-btn w-full mt-2"
            disabled={loading || !answer.trim()}
          >
            {loading ? "Verifying..." : "Confirm Identity →"}
          </button>
        </form>
      </motion.div>
    </main>
  );
}
