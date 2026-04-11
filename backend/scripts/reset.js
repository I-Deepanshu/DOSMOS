import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "../src/models/User.js";
import Chat from "../src/models/Chat.js";
import Message from "../src/models/Message.js";
import RefreshToken from "../src/models/RefreshToken.js";
import { normalize } from "../src/utils/normalize.js";

dotenv.config();

const ADMIN = {
  name:       process.env.ADMIN_NAME     || "Deepanshu",
  dob:        process.env.ADMIN_DOB      || "2000-01-01",
  question:   process.env.ADMIN_QUESTION || "What is the name of your first pet?",
  answer:     process.env.ADMIN_ANSWER   || "cosmos",
};

async function reset() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("[reset] Connected to DB");

  // 1. Clear all data
  console.log("[reset] Purging all collections...");
  await User.deleteMany({});
  await Chat.deleteMany({});
  await Message.deleteMany({});
  await RefreshToken.deleteMany({});
  console.log("[reset] Pure void established.");

  // 2. Seed Admin
  const security_answer_hash = await bcrypt.hash(
    normalize(ADMIN.answer),
    12
  );

  await User.create({
    name:        ADMIN.name,
    normalized_name: normalize(ADMIN.name),
    dob:         new Date(ADMIN.dob),
    role:        "admin",
    security_question:    ADMIN.question,
    security_answer_hash,
    status:      "active",
    is_active:   true,
    created_at:  new Date(),
  });

  console.log(`[reset] ✅ Admin created: ${ADMIN.name}`);
  console.log("[reset] Universe reset complete.");
  process.exit(0);
}

reset().catch((err) => {
  console.error("[reset] Failed:", err.message);
  process.exit(1);
});
