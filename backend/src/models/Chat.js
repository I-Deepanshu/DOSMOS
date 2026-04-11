import mongoose from "mongoose";

const readStateSchema = new mongoose.Schema({
  userId:               { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  last_seen_message_id: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
}, { _id: false });

const chatSchema = new mongoose.Schema({
  participants:    [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  last_message:    { type: String, default: null },
  last_message_at: { type: Date,   default: null },
  read_state:      [readStateSchema],
  created_at:      { type: Date, default: Date.now },
});

chatSchema.index({ participants: 1 });
chatSchema.index({ last_message_at: -1 });
chatSchema.index({ "read_state.userId": 1 });

export default mongoose.model("Chat", chatSchema);
