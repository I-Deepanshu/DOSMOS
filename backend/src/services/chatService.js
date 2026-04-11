import Chat from "../models/Chat.js";
import Message from "../models/Message.js";
import mongoose from "mongoose";

// ── Create chat between user and admin ────────────────────────────────────────

export async function createChat(userId, adminId) {
  // Idempotent — don't create duplicate chats
  const existing = await Chat.findOne({ participants: { $all: [userId, adminId] } });
  if (existing) return existing;

  const chat = await Chat.create({
    participants:    [userId, adminId],
    read_state:      [
      { userId,   last_seen_message_id: null },
      { userId: adminId, last_seen_message_id: null },
    ],
    created_at: new Date(),
  });
  return chat;
}

// ── Get all chats for admin (sorted by last message) ──────────────────────────

export async function getAdminChats(adminId) {
  return Chat.find({ participants: adminId })
    .sort({ last_message_at: -1 })
    .populate("participants", "name planet role is_verified is_active");
}

// ── Get single chat for user ───────────────────────────────────────────────────

export async function getUserChat(userId) {
  return Chat.findOne({ participants: userId })
    .populate("participants", "name planet role");
}

// ── Get unread count from Message statuses directly ──────────────────────────

export async function getUnreadCount(chatId, userId) {
  const safeUserId = typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;
  return Message.countDocuments({
    chat_id: chatId,
    sender_id: { $ne: safeUserId },
    status: { $ne: "seen" }
  });
}

// ── Mark messages seen ────────────────────────────────────────────────────────

export async function markSeen(chatId, userId, messageId) {
  await Chat.updateOne(
    { _id: chatId, "read_state.userId": userId },
    { $set: { "read_state.$.last_seen_message_id": messageId } }
  );
}

export default { createChat, getAdminChats, getUserChat, getUnreadCount, markSeen };
