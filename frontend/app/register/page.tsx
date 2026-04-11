"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { setAccessToken, setUser } from "@/lib/auth";

const QUESTIONS = [
  "What is the name of your first pet?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What is the name of your first school?",
  "What is your favorite childhood movie?",
  "What is the model of your first car?",
  "What is your favorite food?",
  "What is your oldest sibling's middle name?",
  "What street did you grow up on?",
  "What is your hidden cosmic trait?"
];

function PlanetBirthSequence({ data, onComplete }: { data: any, onComplete: () => void }) {
  // MAX 3-4 seconds as per spec. We'll auto-route at 4s.
  useEffect(() => {
    const timer = setTimeout(onComplete, 4000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div 
      className="fixed inset-0 bg-[#050510] z-50 flex items-center justify-center flex-col overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      <button 
         onClick={onComplete}
         className="absolute top-8 right-8 text-[12px] text-[var(--text-muted)] hover:text-white transition-colors tracking-[0.2em] z-50"
      >
         SKIP
      </button>

      <motion.div
         className="relative flex items-center justify-center"
         initial={{ scale: 0.9, opacity: 0 }}
         animate={{ scale: 1, opacity: 1 }}
         transition={{ duration: 2.5, ease: "easeOut", delay: 0.2 }}
      >
        {/* Soft Ambient Glow Drop inside the forming moment */}
        <motion.div 
          className="absolute rounded-full blur-[80px]"
          style={{ width: '300px', height: '300px', background: data.planet.color, opacity: 0 }}
          animate={{ opacity: [0, 0.2, 0.15] }}
          transition={{ duration: 1.5, delay: 2.2, ease: "easeInOut" }}
        />

        {/* Planet Surface */}
        <div 
          className="rounded-full relative overflow-hidden"
          style={{ 
             width: '180px', height: '180px', 
             background: `radial-gradient(circle at 35% 35%, ${data.planet.color}, #050510)` 
          }}
        />
        
        {/* Subtle Orbit Ring */}
        <motion.div 
           className="absolute border border-[rgba(255,255,255,0.04)] rounded-[50%]"
           style={{ width: '400px', height: '80px', transform: 'rotate(15deg)' }}
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ duration: 1.5, delay: 1 }}
        />
      </motion.div>

      <motion.div
        className="mt-24 text-center z-10"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 2.5 }}
      >
        <p className="text-[13px] text-[var(--text-secondary)] mb-3">A new presence has entered the cosmos.</p>
        <h2 className="heading-orbitron text-[22px] tracking-widest text-white">
          You are <span style={{ color: data.planet.color }}>{data.planet.name}</span>
        </h2>
      </motion.div>
    </motion.div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", dob: "", q: QUESTIONS[0], a: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [birthData, setBirthData] = useState<any>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.dob || !form.a) return;
    setLoading(true);
    setError("");

    try {
      const { data } = await api.post("/auth/register", {
        name: form.name,
        dob: form.dob,
        security_question: form.q,
        security_answer: form.a
      });
      setAccessToken(data.accessToken);
      setUser(data.user);
      // Trigger birth
      setBirthData(data.user);
    } catch (err: any) {
      setError(err.response?.data?.error || "Registration failed.");
      setLoading(false);
    }
  }

  function handleComplete() {
    router.push("/chat");
  }

  if (birthData) {
    return <PlanetBirthSequence data={birthData} onComplete={handleComplete} />;
  }

  return (
    <main className="min-h-screen flex flex-col justify-start pt-[12vh] items-center px-6 pb-12">
      <motion.div
        className="w-full max-w-[440px]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
      >
        <div className="mb-10">
          <h1 className="heading-orbitron text-[28px] text-white mb-2">New Identity</h1>
          <p className="text-[14px] text-[var(--text-secondary)]">Create your presence in the DOSMOS system.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          
          <div className="flex flex-col gap-2">
            <label className="text-[12px] text-[var(--text-muted)] font-medium tracking-wide uppercase">Legal Name</label>
            <input
              type="text"
              className="premium-input"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. John Doe"
              spellCheck={false}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] text-[var(--text-muted)] font-medium tracking-wide uppercase">Point of Origin</label>
            <input
              type="date"
              className="premium-input"
              value={form.dob}
              onChange={(e) => setForm(f => ({ ...f, dob: e.target.value }))}
              max={new Date().toISOString().split("T")[0]}
              style={{ colorScheme: "dark" }}
              required
            />
          </div>

          <div className="flex flex-col gap-2 mt-4">
            <label className="text-[12px] text-[var(--text-muted)] font-medium tracking-wide uppercase">Verification Protocol</label>
            <select
              className="premium-input appearance-none cursor-pointer"
              value={form.q}
              onChange={(e) => setForm(f => ({ ...f, q: e.target.value }))}
            >
              {QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-2 relative">
            <input
              type="text"
              className="premium-input"
              value={form.a}
              onChange={(e) => setForm(f => ({ ...f, a: e.target.value }))}
              placeholder="Your answer"
              spellCheck={false}
              required
            />
          </div>

          <div className="min-h-[20px] mt-2">
             {error && <div className="text-[var(--error-color)] text-[12px] animate-shake">{error}</div>}
          </div>

          <button
            type="submit"
            className="premium-btn w-full mt-4"
            disabled={loading || !form.name || !form.dob || !form.a}
          >
            {loading ? "Generating Payload..." : "Initialize Identity"}
          </button>
        </form>
      </motion.div>
    </main>
  );
}
