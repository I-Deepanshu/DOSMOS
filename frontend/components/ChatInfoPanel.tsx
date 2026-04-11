"use client";
import { motion, AnimatePresence } from "framer-motion";

interface ChatInfoPanelProps {
  open: boolean;
  onClose: () => void;
  user: {
    name?: string;
    planet?: { name?: string; type?: string; color?: string };
    created_at?: string;
    role?: string;
  } | null;
  messageCount?: number;
}

export default function ChatInfoPanel({ open, onClose, user, messageCount }: ChatInfoPanelProps) {
  if (!user) return null;

  const planet = user.planet;
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "Unknown";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className="fixed top-0 right-0 h-full w-[340px] max-w-[85vw] z-[95] bg-[var(--bg-base)] border-l border-[var(--border-soft)] shadow-[-8px_0_30px_rgba(0,0,0,0.3)] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-soft)]">
              <h2 className="text-[13px] uppercase tracking-widest text-[var(--text-secondary)] font-medium">Identity Profile</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Planet Visualization */}
            <div className="flex flex-col items-center pt-12 pb-8 px-6">
              <div
                className="w-24 h-24 rounded-full mb-6 transition-all duration-500"
                style={{
                  background: planet?.color || "#555",
                  boxShadow: `0 0 40px ${planet?.color || "#555"}40, 0 0 80px ${planet?.color || "#555"}20, inset 0 -8px 20px rgba(0,0,0,0.3)`,
                }}
              />
              <h3 className="text-[20px] font-bold text-[var(--text-primary)] mb-1">
                {planet?.name || "Unknown Planet"}
              </h3>
              <p className="text-[13px] text-[var(--text-secondary)] uppercase tracking-widest">
                {planet?.type || "Unknown"} Class
              </p>
            </div>

            {/* Info Grid */}
            <div className="px-6 space-y-4">
              <InfoRow label="Commander" value={user.name || "Unknown"} />
              <InfoRow label="Role" value={user.role === "admin" ? "Sentinel" : "Commander"} />
              <InfoRow label="Joined" value={memberSince} />
              {messageCount !== undefined && (
                <InfoRow label="Messages" value={messageCount.toLocaleString()} />
              )}
            </div>

            {/* Bottom decorative element */}
            <div className="mt-auto p-6 border-t border-[var(--border-soft)]">
              <div className="flex items-center gap-2 justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--success-color)] animate-pulse" />
                <span className="text-[11px] uppercase tracking-widest text-[var(--text-muted)]">Quantum Link Active</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--border-soft)]">
      <span className="text-[11px] uppercase tracking-widest text-[var(--text-muted)]">{label}</span>
      <span className="text-[14px] text-[var(--text-primary)] font-medium">{value}</span>
    </div>
  );
}
