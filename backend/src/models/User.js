import mongoose from "mongoose";

const planetSchema = new mongoose.Schema({
  name:       { type: String },
  slug:       { type: String },
  type:       { type: String, enum: ["Rocky", "Ocean", "Gas Giant", "Ice"] },
  color:      { type: String },
  orbitIndex: { type: Number },
  size:       { type: Number, default: 40 },
  metadata: {
    seed:    { type: Number },
    version: { type: Number, default: 1 },
  },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  normalized_name: { type: String, required: true, trim: true },
  allowed_aliases: [{ type: String, trim: true }],
  dob:  { type: Date,   required: true },
  role: { type: String, enum: ["admin", "user"], default: "user" },

  // Auth
  security_question:    { type: String,  default: null },
  security_answer_hash: { type: String,  default: null },
  status: { type: String, enum: ["pending", "active"], default: "pending" },

  // Security
  failed_attempts:        { type: Number,  default: 0 },
  last_failed_attempt_at: { type: Date,    default: null },
  lock_until:             { type: Date,    default: null },
  active_step_token_id:   { type: String,  default: null },

  // Planet
  planet: { type: planetSchema, default: null },

  // Moderation
  is_active:   { type: Boolean, default: true  },

  // Rename cooldown
  last_renamed_at: { type: Date, default: null },

  // Preferences
  theme_preferences: { type: Object, default: {} },

  created_at: { type: Date, default: Date.now },
});

// Indexes
userSchema.index({ dob: 1 });
userSchema.index({ role: 1 });
userSchema.index({ lock_until: 1 });
userSchema.index({ is_active: 1 });
userSchema.index({ "planet.orbitIndex": 1 });
userSchema.index({ "planet.name": 1 }, { unique: true, sparse: true });
userSchema.index({ "planet.slug": 1 }, { unique: true, sparse: true });
userSchema.index(
  { dob: 1, normalized_name: 1 },
  { unique: true }
);

export default mongoose.model("User", userSchema);
