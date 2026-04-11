import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema({
  userId:               { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  tokenHash:            { type: String, required: true },
  refreshTokenVersion:  { type: Number, default: 1 },
  expiresAt:            { type: Date,   required: true },
  ipAddress:            { type: String },
  userAgent:            { type: String },
  createdAt:            { type: Date, default: Date.now },
});

refreshTokenSchema.index({ userId: 1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL auto-delete

export default mongoose.model("RefreshToken", refreshTokenSchema);
