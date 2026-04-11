import Chat from "../models/Chat.js";
import User from "../models/User.js";
import Message from "../models/Message.js";
import messageService from "../services/messageService.js";
import chatService from "../services/chatService.js";

const messageRateLimits = new Map();

export function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log(`[socket] connected: ${socket.user.id}`);

    // ── Join chat room ──────────────────────────────────────────────────────
    socket.on("join_chat", async ({ chatId }, cb) => {
      try {
        const chat = await Chat.findOne({ _id: chatId, participants: socket.user.id });
        if (!chat) return socket.emit("error", { message: "Access denied" });
        socket.join(chatId);
        cb?.({ ok: true });
      } catch (err) {
        socket.emit("error", { message: err.message });
      }
    });

    // ── Send message ────────────────────────────────────────────────────────
    socket.on("send_message", async ({ chatId, type = "text", content, tempId, replyTo }, cb) => {
      try {
        const chat = await Chat.findOne({ _id: chatId, participants: socket.user.id });
        if (!chat) return socket.emit("error", { message: "Access denied" });

        const user = await User.findById(socket.user.id).select("status role");
        if (user && user.role !== "admin" && user.status === "pending") {
          const now = Date.now();
          const limit = messageRateLimits.get(socket.user.id) || { count: 0, windowStart: now };
          
          if (now - limit.windowStart > 60000) {
            limit.count = 0;
            limit.windowStart = now;
          }
          
          if (limit.count >= 10) {
            return socket.emit("error", { message: "Message limit reached. Please wait a moment." });
          }
          
          limit.count++;
          messageRateLimits.set(socket.user.id, limit);
        }

        const message = await messageService.createMessage({
          chatId,
          senderId: socket.user.id,
          type,
          content,
          replyTo,
        });

        const populated = await message.populate([
          { path: "sender_id", select: "name planet role" },
          { path: "reply_to", select: "content type sender_id", populate: { path: "sender_id", select: "name role" } },
        ]);

        io.to(chatId).emit("new_message", { ...populated.toObject(), tempId });
        cb?.(populated.toObject());
      } catch (err) {
        socket.emit("error", { message: err.message });
      }
    });

    // ── Typing indicator ────────────────────────────────────────────────────
    socket.on("typing", async ({ chatId }) => {
      try {
        const user = await User.findById(socket.user.id).select("name");
        socket.to(chatId).emit("typing_indicator", {
          userId:      socket.user.id,
          displayText: `${user.name} is thinking...`,
        });
      } catch {}
    });

    // ── Mark delivered ──────────────────────────────────────────────────────
    socket.on("message_delivered", async ({ chatId, messageId }) => {
      try {
        await Message.updateOne({ _id: messageId, status: "sent" }, { status: "delivered" });
        socket.to(chatId).emit("delivered_ack", { messageId });
      } catch {}
    });

    // ── Mark seen ───────────────────────────────────────────────────────────
    socket.on("message_seen", async ({ chatId, messageId }) => {
      try {
        const seenTime = new Date();
        await chatService.markSeen(chatId, socket.user.id, messageId);
        await Message.updateOne({ _id: messageId, status: { $ne: "seen" } }, { status: "seen", seen_at: seenTime });
        // Include chatId so dashboard can restore planet color
        socket.to(chatId).emit("seen_ack", { messageId, seenBy: socket.user.id, chatId, seenAt: seenTime });
      } catch {}
    });

    // ── Disconnect ──────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      console.log(`[socket] disconnected: ${socket.user.id}`);
    });
  });
}
