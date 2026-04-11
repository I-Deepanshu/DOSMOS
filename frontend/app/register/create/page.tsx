"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { setAccessToken, setUser } from "@/lib/auth";

export default function RegisterCreatePage() {
  const router  = useRouter();
  const [name, setName]     = useState("");
  const [dob, setDob]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !dob) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/register", { name: name.trim(), dob });
      setAccessToken(data.accessToken);
      setUser(data.user);
      // Store planet data for the birth animation screen
      sessionStorage.setItem("newPlanet", JSON.stringify(data.user.planet));
      sessionStorage.setItem("newChatId", data.chatId);
      router.push("/register/born");
    } catch (err: any) {
      const d = err.response?.data;
      setError(d?.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="cosmos-center">
      <motion.div
        className="glass-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🌌</div>
            <h2 className="cosmos-title">Claim your planet</h2>
            <p className="cosmos-subtitle">
              Every soul in DOSMOS has their own world.<br />Let's create yours.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>
                What should we call you?
              </label>
              <input
                type="text"
                className="cosmos-input"
                placeholder="Your name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={2}
                maxLength={30}
                required
                autoFocus
              />
            </div>

            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>
                When were you born?
              </label>
              <input
                type="date"
                className="cosmos-input"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                required
                style={{ colorScheme: "dark" }}
              />
            </div>

            {error && <div className="cosmos-error">{error}</div>}

            <motion.button
              type="submit"
              className="btn-primary"
              disabled={loading || !name.trim() || !dob}
              whileTap={{ scale: 0.97 }}
              style={{ marginTop: "0.5rem" }}
            >
              {loading ? "Forging your planet..." : "Enter the Cosmos →"}
            </motion.button>
          </form>
        </motion.div>
      </motion.div>
    </main>
  );
}
