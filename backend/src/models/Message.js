import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  chat_id:   { type: mongoose.Schema.Types.ObjectId, ref: "Chat",    required: true },
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
  type:      { type: String, enum: ["text", "image", "audio", "gif"], required: true },
  content:   { type: mongoose.Schema.Types.Mixed,   required: true },
  status:    { type: String, enum: ["sent", "delivered", "seen"], default: "sent" },
  seen_at:   { type: Date, default: null },
  reply_to:  { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
  is_system: { type: Boolean, default: false },
  created_at:{ type: Date, default: Date.now },  // server-generated ONLY
});

messageSchema.index({ chat_id: 1, created_at: 1 });
messageSchema.index({ chat_id: 1, _id: 1 });
messageSchema.index({ sender_id: 1 });
messageSchema.index({ status: 1 });
messageSchema.index({ is_system: 1 });

export default mongoose.model("Message", messageSchema);
