import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "../src/models/User.js";
import Chat from "../src/models/Chat.js";
import Message from "../src/models/Message.js";
import { normalize } from "../src/utils/normalize.js";
import { generateSeed, getPlanetType, getPlanetColor } from "../src/utils/planetSeed.js";
import { generatePlanetName } from "../src/utils/planetNameGen.js";
import planetService from "../src/services/planetService.js";

dotenv.config();

const USERS = [
  { name: "Lyra",   dob: "1998-03-12", security_answer: "nebula"   },
  { name: "Solus",  dob: "2000-07-24", security_answer: "eclipse"  },
  { name: "Oryn",   dob: "1996-11-05", security_answer: "aurora"   },
];

async function seedThreeUsers() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("[seed] Connected to DB");

  const admin = await User.findOne({ role: "admin" });
  if (!admin) {
    console.error("[seed] Admin not found! Run reset script first.");
    process.exit(1);
  }

  for (const u of USERS) {
    // Skip if already exists
    const existing = await User.findOne({ normalized_name: normalize(u.name) });
    if (existing) {
      console.log(`[seed] User '${u.name}' already exists, skipping.`);
      continue;
    }

    const hash = await bcrypt.hash(normalize(u.security_answer), 12);
    const seed = generateSeed(u.dob, u.name);
    const typeData = getPlanetType(seed);
    const color = getPlanetColor(seed, typeData);
    const planetName = generatePlanetName(seed);

    const userData = {
      name: u.name,
      normalized_name: normalize(u.name),
      dob: new Date(u.dob),
      role: "user",
      status: "active",
      is_active: true,
      security_question: "What is your cosmic origin?",
      security_answer_hash: hash,
      created_at: new Date(),
    };

    const planetData = {
      name: planetName,
      type: typeData.type,
      color,
      orbitIndex: 99,
      size: 40,
      metadata: { seed, version: 2 },
    };

    const user = await planetService.createUserWithUniquePlanet(userData, planetData);
    console.log(`[seed] ✅ Created: ${user.name} | Planet: ${planetName} | Color: ${color}`);

    // Create chat with admin (idempotent)
    let chat = await Chat.findOne({ participants: { $all: [admin._id, user._id] } });
    if (!chat) {
      chat = await Chat.create({
        participants: [admin._id, user._id],
        read_state: [
          { userId: admin._id, last_seen_message_id: null },
          { userId: user._id, last_seen_message_id: null },
        ],
        created_at: new Date(),
      });
    }

    // Send "Hello" from user to admin
    const msg = await Message.create({
      chat_id: chat._id,
      sender_id: user._id,
      type: "text",
      content: "Hello",
      status: "sent",
      created_at: new Date(Date.now() + Math.random() * 1000), // stagger slightly
    });

    await Chat.updateOne(
      { _id: chat._id },
      { last_message: "Hello", last_message_at: msg.created_at, hasUnread: true }
    );

    console.log(`[seed] 💬 Message sent from ${user.name} → Admin`);
  }

  console.log("[seed] All done!");
  process.exit(0);
}

seedThreeUsers().catch((err) => {
  console.error("[seed] Failed:", err.message);
  process.exit(1);
});
