"use client";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { getUser, getAccessToken, bootstrapSession } from "@/lib/auth";
import { getSocket } from "@/lib/socket";

interface Chat {
  _id: string;
  participants: Array<any>;
  last_message: string;
  last_message_at: string;
  hasUnread?: boolean;
  unreadCount?: number;
}

interface PlanetData {
  id: string;
  name: string;
  lastMessage: string;
  radius: number;
  startAngle: number;
  speed: number;
  size: number;
  color: string;
  originalColor: string;
  isOuter: boolean;
  hasUnread: boolean;
  unreadCount: number;
}

// Custom hook to detect cursor "intent" via velocity
function useCursorIntent() {
  const velocity = useRef(0);
  const lastPos = useRef({ x: 0, y: 0 });
  const lastTime = useRef(Date.now());

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const now = Date.now();
      const dt = now - lastTime.current;
      if (dt <= 0) return;
      
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      velocity.current = dist / dt;
      lastPos.current = { x: e.clientX, y: e.clientY };
      lastTime.current = now;
    };

    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  // Returns true if moving slowly (Intentional)
  const hasIntent = useCallback(() => velocity.current < 0.8, []);
  return { hasIntent };
}

export default function AdminPage() {
  const router = useRouter();
  const { hasIntent } = useCursorIntent();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [pausedOrbitId, setPausedOrbitId] = useState<string | null>(null);
  const [isSystemSlowed, setIsSystemSlowed] = useState(false);
  const [activePlanetId, setActivePlanetId] = useState<string | null>(null);
  const [typingMap, setTypingMap] = useState<Record<string, string | null>>({});
  const planetHoverId = useRef<string | null>(null);
  const globalTimer = useRef<NodeJS.Timeout | null>(null);
  const resumeTimer = useRef<NodeJS.Timeout | null>(null);
  const typingTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const [currentUser, setCurrentUser] = useState(() => getUser());
  const user = currentUser;

  useEffect(() => {
    async function init() {
      const ok = await bootstrapSession();
      const resolvedUser = getUser();
      if (!ok && !getAccessToken()) { router.replace("/"); return; }
      if (resolvedUser?.role !== "admin") { router.replace("/chat"); return; }
      setCurrentUser(resolvedUser);

      // Request Native Notification Permission
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }

      try {
        const { data } = await api.get("/chats");
        setChats(data.chats || []);
        setLoading(false);

        const socket = getSocket(getAccessToken()!);
        data.chats?.forEach((c: Chat) => socket.emit("join_chat", { chatId: c._id }));

        socket.on("new_message", (msg: any) => {
          const senderId = typeof msg.sender_id === "object" ? msg.sender_id._id : msg.sender_id;
          if (senderId !== resolvedUser!.id) {
            setChats((prev) => prev.map(chat => {
              if (chat._id === msg.chat_id) {
                const senderName = typeof msg.sender_id === "object" ? msg.sender_id.name : "Commander";
                if (document.visibilityState === "hidden" && "Notification" in window && Notification.permission === "granted") {
                  const notification = new Notification(`DOSMOS: ${senderName}`, {
                    body: msg.type === "text" ? msg.content : `[${msg.type.toUpperCase()}]`,
                  });
                  notification.onclick = () => { window.focus(); notification.close(); };
                }
                return { ...chat, hasUnread: true, unreadCount: (chat.unreadCount || 0) + 1, last_message: msg.content };
              }
              return chat;
            }));
          }
        });

        socket.on("seen_ack", ({ chatId }: { messageId: string; chatId?: string }) => {
          if (!chatId) return;
          setChats((prev) => prev.map(chat =>
            chat._id === chatId ? { ...chat, hasUnread: false, unreadCount: 0 } : chat
          ));
        });

        socket.on("typing_indicator", ({ userId, displayText }: { userId: string; displayText: string }) => {
          const chat = data.chats?.find((c: Chat) =>
            c.participants.some((p: any) => (typeof p === "object" ? p._id : p) === userId)
          );
          if (!chat) return;
          setTypingMap((prev) => ({ ...prev, [chat._id]: displayText }));
          if (typingTimers.current[chat._id]) clearTimeout(typingTimers.current[chat._id]);
          typingTimers.current[chat._id] = setTimeout(() => {
            setTypingMap((prev) => ({ ...prev, [chat._id]: null }));
          }, 3000);
        });
      } catch {
        setLoading(false);
      }
    }
    init();

    return () => {
      const token = getAccessToken();
      if (!token) return;
      const socket = getSocket(token);
      socket.off("new_message");
      socket.off("seen_ack");
      socket.off("typing_indicator");
    };
  }, [router]);

  const getOtherUser = (chat: Chat) => chat.participants.find((p) => p.role !== "admin");

  // Generate static starfield once
  const stars = useMemo(() => {
    return Array.from({ length: 150 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() > 0.8 ? '2px' : '1px',
      opacity: Math.random() * 0.8 + 0.2,
      delay: `${Math.random() * 3}s`
    }));
  }, []);

  const shootingStars = useMemo(() => {
    return Array.from({ length: 3 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 50}%`,
      left: `${50 + Math.random() * 50}%`,
      delay: `${Math.random() * 5}s`
    }));
  }, []);

  const planets = useMemo((): PlanetData[] => {
    return chats.slice(0, 10).map((chat, i) => {
      // Each planet gets its own unique orbit — no sharing
      const radius = 90 + (i * 50);
      const startAngle = (i * 137.5) % 360;
      const speed = 22 + (i * 8) + (Math.sin(i) * 4); // outer planets orbit slower
      const size = 22 + (Math.abs(Math.cos(i)) * 10);
      const other = getOtherUser(chat);
      const isUnread = chat.hasUnread;
      const originalColor = other?.planet?.color || "#7F5AF0";
      return {
        id: chat._id,
        name: other?.planet?.name || other?.name || "Unknown",
        lastMessage: chat.last_message,
        radius,
        startAngle,
        speed,
        size,
        color: isUnread ? "#990000" : originalColor,
        originalColor,
        hasUnread: isUnread || false,
        unreadCount: chat.unreadCount || 0,
        isOuter: i >= 6,
      };
    });
  }, [chats]);

  const handleMouseEnter = (id: string) => {
    if (!hasIntent()) return;

    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    planetHoverId.current = id;
    setPausedOrbitId(id);
    
    const jitter = 40 + Math.random() * 20;
    globalTimer.current = setTimeout(() => {
      setIsSystemSlowed(true);
    }, jitter);
  };

  const handleMouseLeave = (hoverDuration: number) => {
    if (globalTimer.current) clearTimeout(globalTimer.current);
    planetHoverId.current = null;
    
    if (hoverDuration < 120) {
      setPausedOrbitId(null);
      setIsSystemSlowed(false);
    } else {
      const jitter = 60 + Math.random() * 40;
      resumeTimer.current = setTimeout(() => {
        setPausedOrbitId(null);
        setIsSystemSlowed(false);
      }, jitter);
    }
  };

  const handlePlanetClick = (id: string) => {
    setActivePlanetId(id);
    setIsSystemSlowed(true);
    setChats((prev) => prev.map(c => c._id === id ? { ...c, hasUnread: false, unreadCount: 0 } : c));
    setTimeout(() => {
      router.push(`/admin/${id}`);
    }, 150);
  };

  if (loading) return <div className="min-h-screen bg-[#050510]" />;

  return (
    <main className="min-h-screen relative bg-[#050510] text-white flex flex-col overflow-hidden">
      <div className="nebula-bg" />
      
      {/* Starfield */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {stars.map(star => (
          <div 
            key={star.id} 
            className="absolute rounded-full bg-white"
            style={{
              left: star.left, top: star.top,
              width: star.size, height: star.size,
              opacity: star.opacity,
              animation: star.size === '2px' ? `glow-pulse 3s ease-in-out infinite ${star.delay}` : undefined
            }}
          />
        ))}
        {shootingStars.map(star => (
          <div
            key={`shoot-${star.id}`}
            className="shooting-star"
            style={{ top: star.top, left: star.left, animationDelay: star.delay }}
          />
        ))}
      </div>

      <header className="relative z-[100] flex items-center justify-between px-10 py-8 bg-transparent">
        <div>
          <h1 className="heading-orbitron text-[20px] tracking-[0.3em] text-white/90">DOSMOS CONSOLE</h1>
          <p className="text-[11px] text-[#A0A0B5] mt-1 tracking-widest uppercase opacity-50">
            {chats.length} Systems Active
          </p>
        </div>
      </header>

      {/* Solar System Viewport */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
        
        <div className={`cosmos-container pointer-events-auto ${isSystemSlowed ? 'is-focused' : ''}`}>
          
          <AnimatePresence>
            {activePlanetId && (
              <motion.div 
                 className="absolute inset-x-[-100vw] inset-y-[-100vh] bg-black/60 backdrop-blur-md z-[60]"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
              />
            )}
          </AnimatePresence>

          {/* Orbit Rings — one per planet */}
          {planets.map((planet) => (
            <div key={`ring-${planet.id}`} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ width: planet.radius * 2, height: planet.radius * 2 }}>
              <div
                className="cosmos-orbit-ring absolute inset-0"
              />
              {/* Permanent Planet Label on Orbit Ring */}
              <div 
                className="absolute text-[9px] uppercase tracking-widest text-[#A0A0B5]/60 font-semibold"
                style={{ 
                  left: '50%', 
                  top: '100%', 
                  transform: 'translate(-50%, -50%)',
                  textShadow: '0 0 4px #050510',
                  padding: '2px 6px',
                  backgroundColor: '#050510'
                }}
              >
                {planet.name}
              </div>
            </div>
          ))}

          {/* Central Sun — 3D with corona */}
          <div className="absolute z-[50] flex flex-col items-center" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            <div className="relative flex items-center justify-center">

              {/* Corona ring 1 — slow pulse */}
              <div className="absolute rounded-full animate-ping"
                style={{
                  width: '110px', height: '110px',
                  background: 'radial-gradient(circle, rgba(255,200,0,0.18) 0%, transparent 70%)',
                  animationDuration: '2.4s', animationTimingFunction: 'ease-out',
                }} />

              {/* Corona ring 2 — medium pulse */}
              <div className="absolute rounded-full animate-ping"
                style={{
                  width: '150px', height: '150px',
                  background: 'radial-gradient(circle, rgba(255,160,0,0.10) 0%, transparent 70%)',
                  animationDuration: '3.2s', animationDelay: '0.6s', animationTimingFunction: 'ease-out',
                }} />

              {/* Corona ring 3 — slow wide glow */}
              <div className="absolute rounded-full animate-ping"
                style={{
                  width: '200px', height: '200px',
                  background: 'radial-gradient(circle, rgba(255,120,0,0.06) 0%, transparent 70%)',
                  animationDuration: '4s', animationDelay: '1.2s', animationTimingFunction: 'ease-out',
                }} />

              {/* Soft ambient halo */}
              <div className="absolute rounded-full blur-2xl"
                style={{
                  width: '120px', height: '120px',
                  background: 'radial-gradient(circle, rgba(255,220,80,0.55) 0%, rgba(255,140,0,0.2) 50%, transparent 80%)',
                }} />

              {/* 3D Sun sphere */}
              <div
                className="relative rounded-full z-10"
                style={{
                  width: '72px', height: '72px',
                  background: [
                    // Specular highlight — bright white glint top-left
                    'radial-gradient(circle at 32% 26%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.5) 7%, transparent 28%)',
                    // Secondary sheen
                    'radial-gradient(circle at 40% 36%, rgba(255,255,200,0.25) 0%, transparent 40%)',
                    // Sphere diffuse — bright gold → deep amber → dark edge
                    'radial-gradient(circle at 36% 32%, #FFF176 0%, #FFD700 35%, #FF8C00 65%, #7B3500 100%)',
                  ].join(', '),
                  boxShadow: [
                    '0 0 30px rgba(255,215,0,0.95)',
                    '0 0 60px rgba(255,165,0,0.6)',
                    '0 0 100px rgba(255,100,0,0.35)',
                    '0 0 160px rgba(255,80,0,0.15)',
                    'inset -4px -4px 12px rgba(100,30,0,0.6)',
                  ].join(', '),
                }}
              />
            </div>
            <span className="absolute top-[100%] mt-14 text-[11px] tracking-[0.5em] text-yellow-400/90 uppercase font-bold whitespace-nowrap"
              style={{ textShadow: '0 0 12px rgba(255,215,0,0.8)' }}>
              Deepanshu
            </span>
          </div>
          
          {planets.map((planet) => (
            <PlanetCard 
              key={planet.id}
              planet={planet}
              isPaused={pausedOrbitId === planet.id}
              isSlowed={isSystemSlowed && pausedOrbitId !== planet.id}
              isActive={activePlanetId === planet.id}
              isTyping={!!typingMap[planet.id]}
              onEnter={() => handleMouseEnter(planet.id)}
              onLeave={handleMouseLeave}
              onClick={() => handlePlanetClick(planet.id)}
            />
          ))}
        </div>
      </div>
    </main>
  );
}

// ── 3D sphere shading ─────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [r, g, b];
}

function planet3dStyle(hex: string, size: number, hasUnread: boolean) {
  const baseColor = hasUnread ? "#cc0000" : hex;
  let r: number, g: number, b: number;
  try {
    [r, g, b] = hexToRgb(baseColor);
  } catch {
    [r, g, b] = [127, 90, 240]; // fallback
  }
  // Lighter variant for the lit hemisphere
  const lr = Math.min(255, Math.round(r + (255 - r) * 0.45));
  const lg = Math.min(255, Math.round(g + (255 - g) * 0.45));
  const lb = Math.min(255, Math.round(b + (255 - b) * 0.45));
  // Darker variant for the shadow hemisphere
  const dr = Math.round(r * 0.25);
  const dg = Math.round(g * 0.25);
  const db = Math.round(b * 0.25);

  const dim = Math.round(size * 0.06); // inner shadow spread

  return {
    background: [
      // Layer 1: specular highlight — sharp white glint top-left
      `radial-gradient(circle at 34% 28%, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.55) 8%, transparent 30%)`,
      // Layer 2: secondary soft sheen
      `radial-gradient(circle at 42% 38%, rgba(255,255,255,0.18) 0%, transparent 45%)`,
      // Layer 3: sphere diffuse — lit top-left → base → dark bottom-right
      `radial-gradient(circle at 38% 35%, rgb(${lr},${lg},${lb}) 0%, ${baseColor} 48%, rgb(${dr},${dg},${db}) 100%)`,
    ].join(", "),
    boxShadow: hasUnread
      ? `0 0 ${size}px rgba(204,0,0,0.9), 0 0 ${size * 2}px rgba(204,0,0,0.4), inset -${dim}px -${dim}px ${dim * 3}px rgba(0,0,0,0.7)`
      : `0 0 ${size * 0.8}px rgba(${r},${g},${b},0.7), 0 0 ${size * 1.8}px rgba(${r},${g},${b},0.25), inset -${dim}px -${dim}px ${dim * 3}px rgba(0,0,0,0.6)`,
  };
}

function PlanetCard({ planet, isPaused, isSlowed, isActive, isTyping, onEnter, onLeave, onClick }: {
  planet: PlanetData,
  isPaused: boolean,
  isSlowed: boolean,
  isActive: boolean,
  isTyping: boolean,
  onEnter: () => void,
  onLeave: (duration: number) => void,
  onClick: () => void
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const hoverStartTime = useRef(0);
  const tooltipTimer = useRef<NodeJS.Timeout | null>(null);

  const handleEnter = () => {
    hoverStartTime.current = Date.now();
    onEnter();
    tooltipTimer.current = setTimeout(() => setShowTooltip(true), 60);
  };

  const handleLeave = () => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setShowTooltip(false);
    onLeave(Date.now() - hoverStartTime.current);
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div
        className={`cosmos-planet-wrapper ${isPaused ? 'paused' : ''} ${isSlowed ? 'slow-down' : ''}`}
        style={{ 
          animationName: 'spin-linear',
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
          animationDelay: `-${(planet.startAngle / 360) * planet.speed}s`,
          animationDuration: `${planet.speed}s`
        }}
      >

        <div 
           className={`cosmos-planet-node ${planet.isOuter ? 'opacity-70 grayscale-[0.2]' : ''} ${isActive ? 'active' : ''} ${isPaused ? 'focused' : ''} ${planet.hasUnread ? 'animate-pulse' : ''}`}
           style={{
             width: planet.size * (planet.hasUnread ? 1.4 : 1),
             height: planet.size * (planet.hasUnread ? 1.4 : 1),
             transform: `translateY(-${planet.radius}px)`,
             // @ts-ignore
             "--radius": `${planet.radius}px`,
             ...planet3dStyle(planet.originalColor, planet.size, planet.hasUnread),
           }}
           onMouseEnter={handleEnter}
           onMouseLeave={handleLeave}
           onClick={onClick}
        >
           {/* Unread Count Badge */}
           {planet.unreadCount > 0 && (
             <div className="absolute -top-1 -right-1 z-[130] min-w-[18px] h-[18px] px-1 rounded-full bg-[#cc0000] border-2 border-[#050510] flex items-center justify-center">
               <span className="text-[9px] font-bold text-white leading-none">{planet.unreadCount > 99 ? "99+" : planet.unreadCount}</span>
             </div>
           )}

           {/* Typing indicator dot */}
           {isTyping && (
             <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-[2px] z-[130]">
               <span className="w-[4px] h-[4px] rounded-full bg-white/90 animate-bounce" style={{ animationDelay: "0ms" }} />
               <span className="w-[4px] h-[4px] rounded-full bg-white/90 animate-bounce" style={{ animationDelay: "150ms" }} />
               <span className="w-[4px] h-[4px] rounded-full bg-white/90 animate-bounce" style={{ animationDelay: "300ms" }} />
             </div>
           )}

           {/* Tooltip */}
           <div className={`absolute bottom-[calc(100%+20px)] left-1/2 -translate-x-1/2 z-[120] system-tooltip-v2 ${showTooltip ? 'visible' : ''}`}>
              <div className="bg-[#050510] border-l border-l-yellow-400/50 border border-white/10 px-4 py-2" style={{ minWidth: '150px' }}>
                <div className="text-[10px] heading-orbitron tracking-widest text-[#FFD700] mb-1">{planet.name}</div>
                <div className="text-[9px] text-[#A0A0B5] font-light truncate">
                   {isTyping ? "typing..." : (planet.lastMessage || "Target Locked")}
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
