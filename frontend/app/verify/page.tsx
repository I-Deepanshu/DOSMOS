"use client";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function VerifyNamePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [maskedHint, setMaskedHint] = useState("");
  const [stepToken, setStepToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = sessionStorage.getItem("stepToken");
    const mName = sessionStorage.getItem("maskedName");
    if (!token) {
      router.push("/");
      return;
    }
    setStepToken(token);
    setMaskedHint(mName || "");
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [router]);

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");

    try {
      const { data } = await api.post("/auth/verify-name", { stepToken, name });
      if (data.redirect === "register") {
        router.push("/register");
        return;
      }
      
      sessionStorage.setItem("stepToken", data.stepToken);
      sessionStorage.setItem("question", data.question);
      router.push("/auth");
    } catch (err: any) {
      setError(err.response?.data?.error || "Identity mismatch. But a new presence can still exist.");
    } finally {
      setLoading(false);
    }
  }

  if (!stepToken) return null;

  // The hint looks like: "D _ _ _ _ u" (with spaces). 
  // We extract the actual raw characters representing the mask length.
  const rawMaskArray = maskedHint.split(" ").filter(c => c !== "");
  const targetLength = rawMaskArray.length;
  // If fallback is empty, just use 5
  const L = targetLength > 0 ? targetLength : 5;

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <motion.div
        className="premium-panel w-full max-w-[440px] text-center"
        initial={{ opacity: 0, filter: "blur(4px)" }}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <p className="text-[14px] text-[var(--text-secondary)] mb-[60px] tracking-wide uppercase">Identity Verification</p>
        
        <form onSubmit={handleSubmit} className="flex flex-col items-center">
          
          {/* Custom Inline Editable Mask Component */}
          <div 
             className={`relative flex justify-center gap-1.5 md:gap-2 mb-6 cursor-text ${error ? 'animate-shake' : ''}`}
             onClick={() => inputRef.current?.focus()}
          >
             <input
               ref={inputRef}
               type="text"
               className="absolute inset-0 w-full h-[60px] opacity-0 cursor-text"
               value={name}
               onChange={(e) => {
                 const val = e.target.value.replace(/[^a-zA-Z0-9.\- ]/g, "");
                 setName(val);
                 if (error) setError("");
               }}
               onKeyDown={(e) => {
                 if (e.key === "Enter") handleSubmit();
               }}
               spellCheck={false}
               autoComplete="off"
               autoFocus
             />

             {Array.from({ length: L }).map((_, i) => {
                const charTyped = name[i];
                const isCurrentCursorIndex = name.length === i;

                // Only show hints on first and last character, if we have them and they aren't typed yet
                let hintChar = "";
                if (!charTyped && i === 0 && rawMaskArray[0] !== "_") hintChar = rawMaskArray[0];
                if (!charTyped && i === L - 1 && rawMaskArray[L - 1] !== "_") hintChar = rawMaskArray[L - 1];
                
                return (
                  <div 
                    key={i} 
                    className="relative flex flex-col justify-end items-center w-[24px] md:w-[32px] h-[48px]"
                  >
                     <span className={`heading-orbitron text-[28px] leading-none mb-1 z-10 transition-colors
                         ${charTyped ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)] opacity-50'}
                     `}>
                        {charTyped || hintChar || "_"}
                     </span>

                     {/* The animated purple cursor caret */}
                     {isCurrentCursorIndex && (
                        <motion.div 
                          className="absolute bottom-[4px] left-[5%] right-[5%] h-[2px] bg-[var(--accent-primary)] z-20"
                          animate={{ opacity: [1, 0, 1] }}
                          transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
                        />
                     )}
                     
                     {/* Static underline for untyped spots to simulate the mask bounds perfectly */}
                     {!charTyped && !isCurrentCursorIndex && (
                        <div className="absolute bottom-[4px] left-[5%] right-[5%] h-[2px] bg-[rgba(255,255,255,0.05)]" />
                     )}
                  </div>
                )
             })}
          </div>

          <div className="flex flex-col items-center gap-1 mb-6">
             <p className="text-[14px] text-white font-medium">Complete your identity</p>
             <p className="text-[12px] text-[var(--text-secondary)]">This must match your registered presence</p>
          </div>

          <div className="min-h-[20px] mb-4">
             {error && <div className="text-[var(--error-color)] text-[12px]">{error}</div>}
          </div>

           {/* Mobile friendly explicit submit (visible but elegant) */}
          <button
            type="submit"
            className="premium-btn w-[200px]"
            disabled={loading || name.length === 0}
          >
            {loading ? "Verifying..." : "Confirm"}
          </button>
        </form>
      </motion.div>
    </main>
  );
}
