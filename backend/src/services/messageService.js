import Message from "../models/Message.js";
import Chat from "../models/Chat.js";

// ── Create message (server timestamp ONLY) ────────────────────────────────────

export async function createMessage({ chatId, senderId, type, content, replyTo }) {
  // Validate replyTo belongs to the same chat (security + data integrity)
  if (replyTo) {
    const parent = await Message.findOne({ _id: replyTo, chat_id: chatId }).select("_id");
    if (!parent) replyTo = null; // Silently drop invalid reference
  }

  const message = await Message.create({
    chat_id:    chatId,
    sender_id:  senderId,
    type,
    content,
    reply_to:   replyTo || null,
    created_at: new Date(), // server-generated — never trust client
  });

  // Update chat preview
  const preview = type === "text" ? content : `[${type}]`;
  await Chat.updateOne(
    { _id: chatId },
    { last_message: preview, last_message_at: message.created_at }
  );

  return message;
}

// ── Paginate messages ─────────────────────────────────────────────────────────

export async function getMessages(chatId, page = 1, limit = 30) {
  const skip = (page - 1) * limit;
  const messages = await Message.find({
    chat_id: chatId,
  })
    .sort({ created_at: 1, _id: 1 })
    .skip(skip)
    .limit(limit)
    .populate("sender_id", "name planet role")
    .populate({
      path: "reply_to",
      select: "content type sender_id",
      populate: { path: "sender_id", select: "name role" },
    });

  const total = await Message.countDocuments({ chat_id: chatId });

  return {
    messages,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasMore: skip + messages.length < total,
    },
  };
}

export default { createMessage, getMessages };
