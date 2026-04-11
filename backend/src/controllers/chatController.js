import chatService from "../services/chatService.js";
import messageService from "../services/messageService.js";
import { uploadMedia as mediaServiceUpload } from "../services/mediaService.js";

export async function getChats(req, res, next) {
  try {
    let chatsArray = req.user.role === "admin"
      ? await chatService.getAdminChats(req.user.id)
      : [await chatService.getUserChat(req.user.id)];
      
    chatsArray = chatsArray.filter(Boolean);
    
    // Piggyback unread status 
    const augmentedChats = await Promise.all(chatsArray.map(async (c) => {
      const doc = c.toObject();
      const unreadCount = await chatService.getUnreadCount(c._id, req.user.id);
      doc.hasUnread = unreadCount > 0;
      doc.unreadCount = unreadCount;
      return doc;
    }));
    
    res.json({ chats: augmentedChats });
  } catch (err) { next(err); }
}

export async function getChat(req, res, next) {
  try {
    res.json({ chat: req.chat });
  } catch (err) { next(err); }
}

export async function getMessages(req, res, next) {
  try {
    const { page = 1, limit = 30 } = req.query;
    const result = await messageService.getMessages(
      req.params.chatId,
      parseInt(page),
      parseInt(limit)
    );
    res.json(result);
  } catch (err) { next(err); }
}

export async function sendMessage(req, res, next) {
  try {
    const { type = "text", content, replyTo } = req.body;
    if (!content) return res.status(400).json({ error: "Content required" });
    const message = await messageService.createMessage({
      chatId:   req.params.chatId,
      senderId: req.user.id,
      type,
      content,
      replyTo,
    });
    // Populate for socket broadcast
    const io = req.app.get("io");
    if (io) {
      const populated = await message.populate([
        { path: "sender_id", select: "name planet role" },
        { path: "reply_to", select: "content type sender_id", populate: { path: "sender_id", select: "name role" } },
      ]);
      io.to(req.params.chatId).emit("new_message", populated.toObject());
    }
    res.status(201).json({ message });
  } catch (err) { next(err); }
}

export async function markSeen(req, res, next) {
  try {
    const { messageId } = req.params;
    await chatService.markSeen(req.params.chatId, req.user.id, messageId);
    res.json({ ok: true });
  } catch (err) { next(err); }
}

export async function uploadMedia(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No media file provided" });
    }

    const { buffer, mimetype, originalname } = req.file;
    const { replyTo } = req.body;
    const mediaMetadata = await mediaServiceUpload(buffer, mimetype, originalname);

    const message = await messageService.createMessage({
      chatId:   req.params.chatId,
      senderId: req.user.id,
      type:     mediaMetadata.type,
      content:  mediaMetadata.url,
      replyTo,
    });

    // Real-time synchronization
    const io = req.app.get("io");
    if (io) {
      const populated = await message.populate([
        { path: "sender_id", select: "name planet role" },
        { path: "reply_to", select: "content type sender_id", populate: { path: "sender_id", select: "name role" } },
      ]);
      io.to(req.params.chatId).emit("new_message", populated.toObject());
    }

    res.status(201).json({ message });
  } catch (err) {
    console.error("[chatController] uploadMedia error:", err);
    res.status(500).json({ error: "Media upload failed" });
  }
}

export default { getChats, getChat, getMessages, sendMessage, markSeen, uploadMedia };
