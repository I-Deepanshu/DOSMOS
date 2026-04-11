import Chat from "../models/Chat.js";

export async function ownChat(req, res, next) {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.user.id,
    }).populate("participants");
    if (!chat) return res.status(403).json({ error: "Access denied" });
    req.chat = chat;
    next();
  } catch {
    return res.status(400).json({ error: "Invalid chat ID" });
  }
}
