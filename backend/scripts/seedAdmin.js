import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "../src/models/User.js";
import { normalize } from "../src/utils/normalize.js";

dotenv.config();

const ADMIN = {
  name:       process.env.ADMIN_NAME     || "Deepanshu",
  dob:        process.env.ADMIN_DOB      || "2000-01-01",  // override in .env
  question:   process.env.ADMIN_QUESTION || "What is the name of your first pet?",
  answer:     process.env.ADMIN_ANSWER   || "change_me",   // MUST override in .env
};

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("[seed] Connected to DB");

  const existing = await User.findOne({ role: "admin" });
  if (existing) {
    console.log("[seed] Admin already exists:", existing.name);
    process.exit(0);
  }

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

  console.log(`[seed] ✅ Admin created: ${ADMIN.name}`);
  console.log("[seed] ⚠️  Set ADMIN_ANSWER in .env and change it before deploying!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("[seed] Failed:", err.message);
  process.exit(1);
});
