"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface Planet {
  name: string;
  type: string;
  color: string;
}

const PHASES = [
  { id: 0, duration: 500  },  // black
  { id: 1, duration: 1000 },  // dot appears
  { id: 2, duration: 1000 },  // dot expands
  { id: 3, duration: 700  },  // orbit ring
  { id: 4, duration: 700  },  // name appears
  { id: 5, duration: 1000 },  // message
  { id: 6, duration: 500  },  // button
];

export default function PlanetBornPage() {
  const router = useRouter();
  const [planet, setPlanet] = useState<Planet | null>(null);
  const [phase, setPhase]   = useState(0);
  const [chatId, setChatId] = useState("");

  useEffect(() => {
    const raw = sessionStorage.getItem("newPlanet");
    const cid = sessionStorage.getItem("newChatId");
    if (!raw) { router.replace("/"); return; }
    setPlanet(JSON.parse(raw));
    setChatId(cid || "");
  }, [router]);

  useEffect(() => {
    if (!planet || phase >= PHASES.length - 1) return;
    const timer = setTimeout(() => setPhase((p) => p + 1), PHASES[phase].duration);
    return () => clearTimeout(timer);
  }, [phase, planet]);

  function handleEnter() {
    sessionStorage.removeItem("newPlanet");
    sessionStorage.removeItem("newChatId");
    router.replace("/chat");
  }

  if (!planet) return null;
  const c = planet.color;

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#000",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      overflow: "hidden",
    }}>
      {/* Star field */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: [10,25,50,70,85,40,60,90,15,35].map((x, i) =>
          `radial-gradient(1px 1px at ${x}% ${[15,60,30,80,20,90,50,65,40,75][i]}%, rgba(255,255,255,${phase >= 1 ? 0.5 : 0}) 0%, transparent 100%)`
        ).join(","),
        transition: "all 1s ease",
        pointerEvents: "none",
      }} />

      {/* Orbit ring */}
      <AnimatePresence>
        {phase >= 3 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              position: "absolute",
              width: 180, height: 180,
              border: `1px solid ${c}40`,
              borderRadius: "50%",
              animation: "orbit-rotate 8s linear infinite",
            }}
          />
        )}
      </AnimatePresence>

      {/* Planet */}
      <motion.div
        animate={{
          width:     phase === 0 ? 0 : phase === 1 ? 8 : 100,
          height:    phase === 0 ? 0 : phase === 1 ? 8 : 100,
          opacity:   phase === 0 ? 0 : 1,
          boxShadow: phase >= 2
            ? `0 0 60px ${c}80, 0 0 120px ${c}40, inset 0 0 30px rgba(0,0,0,0.4)`
            : `0 0 12px ${c}`,
        }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{
          background:   `radial-gradient(circle at 35% 35%, ${c}ff, ${c}88 50%, ${c}33 100%)`,
          borderRadius: "50%",
          position:     "relative",
          zIndex:       10,
          flexShrink:   0,
        }}
      />

      {/* Planet name */}
      <AnimatePresence>
        {phase >= 4 && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "1.5rem",
              fontWeight: 700,
              color: c,
              marginTop: "2rem",
              letterSpacing: "0.1em",
              textShadow: `0 0 20px ${c}80`,
            }}
          >
            {planet.name}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Message */}
      <AnimatePresence>
        {phase >= 5 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            style={{ textAlign: "center", marginTop: "1rem" }}
          >
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.95rem" }}>
              Your planet <strong style={{ color: c }}>'{planet.name}'</strong> has been created 🌍
            </p>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", marginTop: 6 }}>
              You are now part of DOSMOS.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enter button */}
      <AnimatePresence>
        {phase >= 6 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              marginTop: "2.5rem",
              background: `linear-gradient(135deg, ${c}, #7B4FFF)`,
              border: "none",
              borderRadius: 12,
              color: "#fff",
              cursor: "pointer",
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
              fontSize: "0.95rem",
              padding: "0.9rem 2.5rem",
              boxShadow: `0 0 30px ${c}50`,
              animation: "pulse-btn 2s ease-in-out infinite",
            }}
            onClick={handleEnter}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
          >
            Begin →
          </motion.button>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes orbit-rotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pulse-btn {
          0%, 100% { box-shadow: 0 0 30px ${c}50; }
          50%       { box-shadow: 0 0 50px ${c}80; }
        }
      `}</style>
    </div>
  );
}
