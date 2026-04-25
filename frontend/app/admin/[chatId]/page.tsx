"use client";
import { useEffect, useRef, useState, useCallback, Fragment } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { useRouter, useParams } from "next/navigation";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { getAccessToken, getUser, performLogout } from "@/lib/auth";
import { v4 as uuid } from "uuid";
import AudioPlayer from "@/components/AudioPlayer";
import ImageLightbox from "@/components/ImageLightbox";
import ChatInfoPanel from "@/components/ChatInfoPanel";

interface ReplySnippet {
  _id: string;
  content: string;
  type: string;
  sender_id: { _id: string; name: string; role: string } | string;
}

interface Message {
  _id?: string;
  tempId?: string;
  chat_id: string;
  sender_id: { _id: string; name: string; role: string; planet?: any } | string;
  type: string;
  content: string;
  is_system?: boolean;
  created_at: string;
  status?: "pending" | "sent" | "delivered" | "seen";
  seen_at?: string;
  reply_to?: ReplySnippet | null;
}

export default function AdminChatPage() {
  const router = useRouter();
  const params = useParams();
  const chatId = params.chatId as string;
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [firstUnreadId, setFirstUnreadId] = useState<string | null>(null);

  // Media States
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const typingTimeout    = useRef<ReturnType<typeof setTimeout>>(undefined);
  const user = getUser();

  async function handleLogout() {
    await performLogout();
    router.replace("/");
  }

  useEffect(() => {
    if (user?.role !== "admin") { router.replace("/chat"); return; }
    
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    async function init() {
      try {
        const { data: chatData }  = await api.get(`/chats/${chatId}`);
        const { data: msgData }   = await api.get(`/chats/${chatId}/messages?page=1&limit=30`);

        const other = chatData.chat.participants?.find((p: any) => p.role !== "admin");
        setOtherUser(other || null);
        
        const msgs = msgData.messages || [];
        setMessages(msgs);
        
        // Find first unread message from the OTHER user
        const firstUnread = msgs.find((m: Message) => {
          const sId = typeof m.sender_id === "object" ? m.sender_id._id : m.sender_id;
          return sId !== user?.id && m.status !== "seen";
        });
        if (firstUnread) setFirstUnreadId(firstUnread._id || null);

        setHasMore(msgs.length === 30);
        setPage(1);
        setLoading(false);

        const socket = getSocket(getAccessToken()!);
        socket.emit("join_chat", { chatId });

        socket.on("new_message", (msg: Message) => {
          const senderId = typeof msg.sender_id === "object" ? msg.sender_id._id : msg.sender_id;
          if (senderId !== user?.id) {
            
            // Background push notification
            if (document.visibilityState === "hidden" && "Notification" in window && Notification.permission === "granted") {
              const senderName = typeof msg.sender_id === "object" ? msg.sender_id.name : "User";
              const notification = new Notification(`DOSMOS: ${senderName}`, {
                body: msg.type === "text" ? msg.content : `[${msg.type.toUpperCase()}]`,
              });
              notification.onclick = () => { window.focus(); notification.close(); };
            }

            socket.emit("message_delivered", { chatId, messageId: msg._id });
          }
          setMessages((prev) => {
            if (msg.tempId) {
              const idx = prev.findIndex((m) => m.tempId === msg.tempId);
              if (idx !== -1) {
                const updated = [...prev];
                updated[idx] = { ...msg, status: "sent" };
                return updated;
              }
            }
            return insertSorted(prev, msg);
          });
        });

        socket.on("typing_indicator", ({ displayText }: { displayText: string }) => {
          setTyping(displayText);
          clearTimeout(typingTimeout.current);
          typingTimeout.current = setTimeout(() => setTyping(null), 3000);
        });

        socket.on("delivered_ack", ({ messageId }: { messageId: string }) => {
          setMessages((prev) => prev.map((m) => m._id === messageId && m.status !== "seen" ? { ...m, status: "delivered" } : m));
        });

        socket.on("seen_ack", ({ messageId, seenAt }: { messageId: string, seenAt: string }) => {
          setMessages((prev) => prev.map((m) => m._id === messageId ? { ...m, status: "seen", seen_at: seenAt } : m));
        });
      } catch {
        setLoading(false);
      }
    }
    if (chatId) init();

    return () => {
      const token = getAccessToken();
      if (!token) return;
      const socket = getSocket(token);
      socket.off("new_message");
      socket.off("typing_indicator");
      socket.off("delivered_ack");
      socket.off("seen_ack");
    };
  }, [chatId, router, user]);

  // Handle document focus for seen logic
  useEffect(() => {
    if (!chatId) return;
    const onFocus = () => {
      const unseen = messages.filter(m => {
        const senderId = typeof m.sender_id === "object" ? m.sender_id._id : m.sender_id;
        return senderId !== user?.id && m.status !== "seen";
      });
      if (unseen.length === 0) return;
      const socket = getSocket(getAccessToken()!);
      unseen.forEach((m) => socket.emit("message_seen", { chatId, messageId: m._id }));
    };
    window.addEventListener("focus", onFocus);
    if (document.hasFocus()) onFocus();
    return () => window.removeEventListener("focus", onFocus);
  }, [chatId, messages, user?.id]);

  useEffect(() => {
    if (firstUnreadId && messageRefs.current[firstUnreadId]) {
      messageRefs.current[firstUnreadId]?.scrollIntoView({ behavior: "smooth", block: "center" });
      setFirstUnreadId(null);
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, firstUnreadId]);

  useEffect(() => {
    const handleLightbox = (e: any) => setLightboxSrc(e.detail);
    document.addEventListener("open-lightbox", handleLightbox);
    return () => document.removeEventListener("open-lightbox", handleLightbox);
  }, []);

  const loadMoreMessages = async () => {
    if (isLoadingMore || !hasMore || !chatId) return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { data } = await api.get(`/chats/${chatId}/messages?page=${nextPage}&limit=30`);
      
      if (data.messages && data.messages.length > 0) {
        const container = messagesContainerRef.current;
        const prevHeight = container ? container.scrollHeight : 0;

        setMessages((prev) => [...data.messages, ...prev]);
        setPage(nextPage);
        setHasMore(data.messages.length === 30);

        setTimeout(() => {
          if (container) {
            container.scrollTop = container.scrollHeight - prevHeight;
          }
        }, 0);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !chatId) return;
    const content = input.trim();
    const tempId  = uuid();
    const replyToId = replyTarget?._id;
    setInput("");
    setReplyTarget(null);

    const optimistic: Message = {
      tempId, chat_id: chatId,
      sender_id: user?.id || "",
      type: "text", content,
      created_at: new Date().toISOString(),
      status: "pending",
      reply_to: replyTarget ? {
        _id: replyTarget._id!,
        content: replyTarget.content,
        type: replyTarget.type,
        sender_id: replyTarget.sender_id,
      } : null,
    };
    setMessages((prev) => [...prev, optimistic]);

    const socket = getSocket(getAccessToken()!);
    let ackReceived = false;

    const fallbackTimer = setTimeout(async () => {
      if (ackReceived) return;
      try {
        const { data } = await api.post(`/chats/${chatId}/messages`, { type: "text", content, replyTo: replyToId });
        setMessages((prev) => {
          if (prev.some(m => m._id === data.message._id)) return prev.filter(m => m.tempId !== tempId);
          return prev.map((m) => m.tempId === tempId ? { ...data.message, status: "sent" } : m);
        });
      } catch {}
    }, 2000);

    socket.emit("send_message", { chatId, type: "text", content, tempId, replyTo: replyToId }, () => {
      ackReceived = true;
      clearTimeout(fallbackTimer);
    });
  }, [input, chatId, user, replyTarget]);

  const sendMedia = async () => {
    if (!previewFile || !chatId) return;
    setIsUploading(true);

    const tempId = uuid();
    const replyToId = replyTarget?._id;
    const optimisticType = previewFile.type.startsWith("image/") ? "image" : "audio";
    const optimisticContent = previewUrl || "";

    const optimistic: Message = {
      tempId, chat_id: chatId,
      sender_id: user?.id || "",
      type: optimisticType, content: optimisticContent,
      created_at: new Date().toISOString(),
      status: "pending",
      reply_to: replyTarget ? {
        _id: replyTarget._id!,
        content: replyTarget.content,
        type: replyTarget.type,
        sender_id: replyTarget.sender_id,
      } : null,
    };
    setMessages((prev) => [...prev, optimistic]);
    setReplyTarget(null);

    try {
      const formData = new FormData();
      formData.append("file", previewFile);
      if (replyToId) formData.append("replyTo", replyToId);

      const { data } = await api.post(`/chats/${chatId}/messages/media`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setMessages((prev) => {
        if (prev.some(m => m._id === data.message._id)) return prev.filter(m => m.tempId !== tempId);
        return prev.map((m) => m.tempId === tempId ? { ...data.message, status: "sent" } : m);
      });
    } catch (err) {
      console.error("Upload failed", err);
      setMessages((prev) => prev.filter((m) => m.tempId !== tempId));
    } finally {
      discardPreview();
      setIsUploading(false);
    }
  };

  const scrollToMessage = (msgId: string) => {
    const el = messageRefs.current[msgId];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-[var(--sentinel-accent)]", "ring-offset-1");
    setTimeout(() => el.classList.remove("ring-2", "ring-[var(--sentinel-accent)]", "ring-offset-1"), 1500);
  };

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInput(e.target.value);
    const socket = getSocket(getAccessToken()!);
    socket.emit("typing", { chatId });
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setPreviewFile(file);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          const url = URL.createObjectURL(file);
          setPreviewUrl(url);
          setPreviewFile(file);
          break;
        }
      }
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        const file = new File([audioBlob], "audiomemo.webm", { type: "audio/webm" });
        setPreviewUrl(url);
        setPreviewFile(file);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone", err);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }

  function discardPreview() {
    setPreviewFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (loading) return <div className="min-h-screen bg-[var(--bg-base)]" />;

  const mappedMessages = Array.from(new Map(messages.map(m => [m._id || m.tempId || m.created_at, m])).values());
  const lastSeenOutgoingId = [...mappedMessages].reverse().find(m => {
    const sId = typeof m.sender_id === "object" ? m.sender_id._id : m.sender_id;
    return sId === user?.id && m.status === "seen";
  })?._id;

  return (
    <div className="flex flex-col h-[100dvh] relative bg-[var(--bg-base)] text-[var(--text-primary)] font-['Space_Grotesk']">
      <header 
        className="flex-none px-6 py-5 border-b border-[var(--border-soft)] bg-[var(--bg-glass)] backdrop-blur-md flex items-center gap-4 z-10 shrink-0 cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-colors"
        onClick={() => setShowInfo(true)}
      >
        <button
          onClick={(e) => { e.stopPropagation(); router.push("/admin"); }}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors focus:outline-none"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        <div className="flex-1 flex items-center gap-4">
          {otherUser?.planet && (
            <div className="w-10 h-10 rounded-full shadow-[0_0_14px_rgba(255,255,255,0.08)]"
                 style={{ background: otherUser.planet.color }} />
          )}
          <div className="flex flex-col">
            <h1 className="text-[15px] font-semibold">{otherUser?.planet?.name || otherUser?.name || "Unknown"}</h1>
            <p className="text-[12px] uppercase tracking-widest text-[var(--text-secondary)] font-medium mt-0.5">{otherUser?.name} • Active</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-5 sm:px-10 w-full max-w-[960px] mx-auto flex flex-col pt-8 pb-8 scroll-smooth">
        {hasMore && !loading && messages.length > 0 && (
          <div className="flex justify-center mb-6">
            <button
              onClick={loadMoreMessages}
              disabled={isLoadingMore}
              className="px-4 py-2 rounded-full bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[12px] uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.05)] transition-colors disabled:opacity-50"
            >
              {isLoadingMore ? "Loading..." : "Load Earlier Messages"}
            </button>
          </div>
        )}

        {messages.length === 0 && !loading && (
          <div className="m-auto flex flex-col items-center justify-center opacity-40">
            <div className="w-16 h-16 rounded-full border border-[var(--border-soft)] flex items-center justify-center mb-5">
               <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </div>
            <p className="text-[15px] text-[var(--text-secondary)] tracking-wide">Secure channel ready.</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {mappedMessages.map((msg, i, arr) => {
            const senderId  = typeof msg.sender_id === "object" ? msg.sender_id._id : msg.sender_id;
            const isAdmin   = senderId === user?.id; // Sentinel = isAdmin

            const prevMsg = i > 0 ? arr[i-1] : null;
            const prevSender = prevMsg ? (typeof prevMsg.sender_id === "object" ? prevMsg.sender_id._id : prevMsg.sender_id) : null;
            const isSameSender = prevSender === senderId;

            // Date separator logic
            const showDate = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();
            let dateLabel = null;
            if (showDate) {
              const msgDate = new Date(msg.created_at);
              const today = new Date();
              const yesterday = new Date(today);
              yesterday.setDate(yesterday.getDate() - 1);
              
              if (msgDate.toDateString() === today.toDateString()) {
                dateLabel = "Today";
              } else if (msgDate.toDateString() === yesterday.toDateString()) {
                dateLabel = "Yesterday";
              } else {
                dateLabel = msgDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
              }
            }

            return (
              <Fragment key={msg._id || msg.tempId || i}>
                {showDate && (
                  <div className="flex justify-center my-6">
                    <div className="px-[14px] py-[5px] rounded-full bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[11px] uppercase tracking-widest text-[var(--text-secondary)] opacity-80 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
                      {dateLabel}
                    </div>
                  </div>
                )}
                {/* Unread Divider */}
                {msg._id === firstUnreadId && (
                  <div className="flex w-full items-center justify-center my-6 opacity-90">
                    <div className="px-[12px] py-[4px] rounded-full bg-[rgba(255,77,79,0.06)] border border-[rgba(255,77,79,0.15)] text-[11px] tracking-[0.08em] text-[#ff4d4f] font-medium shadow-[0_4px_12px_rgba(255,77,79,0.05)]">
                      New Messages
                    </div>
                  </div>
                )}
                
                {msg.is_system ? (
                  <div className="text-center text-[var(--text-muted)] text-[11px] uppercase tracking-widest my-8 border-y border-[var(--border-soft)] py-2 w-max mx-auto">
                    {msg.content}
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <AdminSwipeableBubble
                      msg={msg}
                      isAdmin={isAdmin}
                      isSameSender={isSameSender}
                      prevMsg={prevMsg}
                      onReply={() => setReplyTarget(msg)}
                      onScrollToReply={scrollToMessage}
                      msgRef={(el) => { if (msg._id) messageRefs.current[msg._id] = el; }}
                    />
                    {isAdmin && msg._id === lastSeenOutgoingId && msg.seen_at && (
                      <div className="text-right text-[11px] text-[var(--text-muted)] mt-1.5 mr-[85px] opacity-70">
                        Seen at {new Date(msg.seen_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                )}
              </Fragment>
            );
          })}
        </AnimatePresence>

        <AnimatePresence>
          {typing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-4 text-[var(--text-muted)] text-[12px] italic mr-2 flex items-center justify-end gap-2"
            >
              {typing}
              <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} className="h-2" />
      </div>

      {/* Input Bar */}
      <div className="flex-none border-t border-[var(--border-soft)] bg-[var(--bg-glass)] backdrop-blur-xl">
        {/* Reply Preview Deck */}
        <AnimatePresence>
          {replyTarget && (
            <motion.div
              initial={{ opacity: 0, y: 8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: 8, height: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="mx-auto max-w-[960px] px-5 sm:px-10 pt-3 overflow-hidden"
            >
              <div className="flex items-center justify-between bg-[var(--bg-surface)] border border-[var(--border-soft)] border-l-[3px] border-l-[var(--sentinel-accent)] rounded-[10px] px-4 py-3">
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] uppercase tracking-widest text-[var(--sentinel-accent)] font-semibold mb-0.5">
                    Replying to {typeof replyTarget.sender_id === "object" ? replyTarget.sender_id.name : "Commander"}
                  </span>
                  <span className="text-[13px] text-[var(--text-secondary)] truncate">
                    {replyTarget.type === "image" ? "🖼 Image" : replyTarget.type === "audio" ? "🎤 Voice Message" : replyTarget.content}
                  </span>
                </div>
                <button
                  onClick={() => setReplyTarget(null)}
                  className="ml-3 shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-5 sm:px-10">
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
          <div className="mx-auto max-w-[960px] flex items-center gap-3">
            {previewFile ? (
              <div className="flex-1 bg-[var(--bg-input)] border border-[var(--border-soft)] text-[var(--text-primary)] rounded-[14px] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {previewFile.type.startsWith("image/") ? (
                    <img src={previewUrl!} alt="Preview" className="h-8 w-8 object-cover rounded" />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[var(--error-color)] animate-pulse" />
                      <span className="text-[12px] uppercase text-[var(--text-secondary)]">Audio Captured</span>
                    </div>
                  )}
                  <span className="text-[13px] text-[var(--text-secondary)] hidden sm:block truncate max-w-[200px]">
                    {previewFile.name}
                  </span>
                </div>
                <button onClick={discardPreview} disabled={isUploading} className="text-[var(--text-secondary)] hover:text-[var(--error-color)] text-[12px] uppercase tracking-wider transition-colors disabled:opacity-50">
                  Discard
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-12 h-12 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors hover:bg-[var(--user-accent)] rounded-[14px] shrink-0"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"></path></svg>
                </button>

                <input
                  type="text"
                  className="flex-1 bg-[var(--bg-input)] border border-[var(--border-soft)] text-[var(--text-primary)] text-[16px] rounded-[16px] px-5 py-3.5 focus:outline-none focus:border-[var(--text-secondary)] transition-colors placeholder:text-[var(--text-muted)]"
                  placeholder={replyTarget ? "Type your reply..." : `Reply to ${otherUser?.planet?.name || "identity"}...`}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  onPaste={handlePaste}
                />

                <button
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onMouseLeave={stopRecording}
                  className={`w-11 h-11 flex items-center justify-center transition-colors rounded-[14px] shrink-0 ${isRecording ? 'text-[var(--error-color)] bg-[rgba(255,77,109,0.1)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--user-accent)]'}`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
                </button>
              </>
            )}

            <button
              onClick={previewFile ? sendMedia : sendMessage}
              disabled={(!input.trim() && !previewFile) || isUploading}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed w-11 h-11 rounded-[14px] flex items-center justify-center transition-colors focus:outline-none bg-[var(--bg-surface)] border border-[var(--border-soft)] hover:bg-[var(--user-accent)] shrink-0"
            >
              {isUploading ? (
                <span className="w-4 h-4 border-2 border-[var(--text-muted)] border-t-[var(--text-primary)] rounded-full animate-spin"></span>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                   <path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      
      <ChatInfoPanel 
        open={showInfo} 
        onClose={() => setShowInfo(false)} 
        onLogout={handleLogout}
        user={otherUser}
        messageCount={messages.length}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin Swipeable Bubble
// ─────────────────────────────────────────────────────────────────────────────
function AdminSwipeableBubble({ msg, isAdmin, isSameSender, prevMsg, onReply, onScrollToReply, msgRef }: {
  msg: Message;
  isAdmin: boolean;
  isSameSender: boolean;
  prevMsg: Message | null;
  onReply: () => void;
  onScrollToReply: (id: string) => void;
  msgRef: (el: HTMLDivElement | null) => void;
}) {
  const x = useMotionValue(0);
  const replyIconOpacity = useTransform(x, isAdmin ? [-60, -30, 0] : [0, 30, 60], isAdmin ? [1, 0.5, 0] : [0, 0.5, 1]);
  const replyIconScale   = useTransform(x, isAdmin ? [-60, -30, 0] : [0, 30, 60], isAdmin ? [1, 0.7, 0.4] : [0.4, 0.7, 1]);
  const THRESHOLD = typeof window !== 'undefined' && window.innerWidth < 640 ? 50 : 40;

  function handleDragEnd() {
    const val = x.get();
    const triggered = isAdmin ? val < -THRESHOLD : val > THRESHOLD;
    if (triggered) {
      if (navigator.vibrate) navigator.vibrate(30);
      onReply();
    }
    x.set(0);
  }

  const replySnippet = msg.reply_to;

  return (
    <motion.div
      ref={msgRef}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`flex w-full group ${isAdmin ? "justify-end" : "justify-start"} ${isSameSender && !prevMsg?.is_system ? "mt-1" : "mt-3"} relative`}
    >
      {/* Reply arrow icon */}
      <motion.div
        style={{ opacity: replyIconOpacity, scale: replyIconScale }}
        className={`absolute top-1/2 -translate-y-1/2 ${isAdmin ? "left-0" : "right-0"} flex items-center justify-center w-8 h-8 rounded-full bg-[var(--bg-surface)] border border-[var(--border-soft)] pointer-events-none z-10`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--sentinel-accent)]">
          <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
        </svg>
      </motion.div>

      <div className={`relative max-w-[88%] sm:max-w-[68%] flex gap-2 items-center ${isAdmin ? "flex-row" : "flex-row-reverse"}`}>

        {/* Context Menu */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1.5 items-center">
          <button
            onClick={() => navigator.clipboard.writeText(msg.content)}
            title="Copy"
            className="w-8 h-8 rounded-full hover:bg-[var(--user-accent)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors active:scale-95"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
          <button
            onClick={onReply}
            title="Reply"
            className="w-8 h-8 rounded-full hover:bg-[var(--user-accent)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors active:scale-95"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
            </svg>
          </button>
        </div>

        {/* Draggable Bubble */}
        <motion.div
          drag="x"
          dragConstraints={isAdmin ? { left: -80, right: 0 } : { left: 0, right: 80 }}
          dragElastic={0.25}
          style={{ x, touchAction: "pan-y" }}
          onDragEnd={handleDragEnd}
          whileDrag={{ cursor: "grabbing" }}
          className={`px-[18px] py-[13px] rounded-[16px] text-[15.5px] leading-relaxed transition-colors border relative min-w-[80px]
              ${isAdmin
                ? 'bg-[var(--bg-surface)] border-[var(--border-soft)] text-[var(--text-primary)] rounded-br-[4px] shadow-[0_0_10px_var(--sentinel-accent)]'
                : 'bg-[var(--user-accent)] border-transparent text-[var(--text-primary)] rounded-bl-[4px]'}
              ${msg.status === "pending" ? "opacity-50" : "opacity-100"}
              ${typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'cursor-grab' : ''}`
          }
        >
          {/* Quoted reply preview */}
          {replySnippet && (
            <button
              onClick={() => replySnippet._id && onScrollToReply(replySnippet._id)}
              className="w-full text-left mb-3 px-3 py-2.5 rounded-[10px] border-l-[3px] border-l-[var(--sentinel-accent)] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.07)] transition-colors"
            >
              <p className="text-[11px] uppercase tracking-wider text-[var(--sentinel-accent)] font-semibold mb-0.5">
                {typeof replySnippet.sender_id === "object" ? replySnippet.sender_id.name : "Commander"}
              </p>
              <p className="text-[13px] text-[var(--text-secondary)] truncate">
                {replySnippet.type === "image" ? "🖼 Image" : replySnippet.type === "audio" ? "🎤 Voice Message" : replySnippet.content}
              </p>
            </button>
          )}

          {msg.type === "image" && (
            <div className="mb-4">
              <img 
                src={msg.content} 
                alt="Attachment" 
                className="max-w-[200px] sm:max-w-[260px] rounded-[8px] cursor-zoom-in" 
                loading="lazy" 
                onClick={() => document.dispatchEvent(new CustomEvent('open-lightbox', { detail: msg.content }))} 
              />
            </div>
          )}
          {msg.type === "audio" && (
            <div className="mb-4">
              <AudioPlayer src={msg.content} />
            </div>
          )}
          {msg.type === "text" && (
            <div className="pb-1">{msg.content}</div>
          )}

          {/* Timestamp + Ticks */}
          <div className="flex items-center justify-end gap-1.5 mt-2 opacity-70">
            <span className="text-[11px] tabular-nums font-medium text-[var(--text-secondary)]">
              {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            {isAdmin && <MessageTick status={msg.status} />}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function insertSorted(messages: Message[], newMsg: Message): Message[] {
  if (newMsg._id) {
    const existingIdx = messages.findIndex(m => m._id === newMsg._id);
    if (existingIdx !== -1) {
      const updated = [...messages];
      updated[existingIdx] = { ...updated[existingIdx], ...newMsg };
      return updated;
    }
  }
  const idx = messages.findIndex((m) => m.created_at > newMsg.created_at);
  if (idx === -1) return [...messages, newMsg];
  return [...messages.slice(0, idx), newMsg, ...messages.slice(idx)];
}

function MessageTick({ status }: { status?: Message["status"] }) {
  if (status === "pending") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)] opacity-60">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
    );
  }
  if (status === "sent") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-secondary)]">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    );
  }
  if (status === "delivered") {
    return (
      <div className="relative inline-flex items-center text-[var(--text-secondary)]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="absolute -left-1">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-1 z-10 bg-[var(--bg-surface)] shadow-[-2px_0_0_var(--bg-surface)]">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
    );
  }
  if (status === "seen") {
    return (
      <div className="relative inline-flex items-center text-blue-400">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="absolute -left-1">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-1 z-10 bg-[var(--bg-surface)] shadow-[-2px_0_0_var(--bg-surface)]">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
    );
  }
  return null;
}
