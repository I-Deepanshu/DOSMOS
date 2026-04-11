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

async function seedUser() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("[seed-user] Connected to DB");

  const admin = await User.findOne({ role: "admin" });
  if (!admin) {
    console.error("[seed-user] Admin not found! Run reset script first.");
    process.exit(1);
  }

  const name = "Nova";
  const dob = "1995-05-15";
  const security_answer = "starlight";
  
  const existing = await User.findOne({ name });
  if (existing) {
    console.log("[seed-user] User 'Nova' already exists.");
    process.exit(0);
  }

  const hash = await bcrypt.hash(normalize(security_answer), 12);
  const seed = generateSeed(dob, name);
  const typeData = getPlanetType(seed);
  const color = getPlanetColor(seed, typeData);
  const planetName = generatePlanetName(seed);

  const userData = {
    name,
    normalized_name: normalize(name),
    dob: new Date(dob),
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
    orbitIndex: 1,
    size: 40,
    metadata: { seed, version: 2 },
  };

  const user = await planetService.createUserWithUniquePlanet(userData, planetData);
  console.log(`[seed-user] ✅ User created: ${user.name} (Planet: ${planetName})`);

  // Create chat with admin
  const chat = await Chat.create({
    participants: [admin._id, user._id],
    last_message: "A new presence has entered the cosmos.",
    last_message_at: new Date(),
  });

  await Message.create({
    chat_id: chat._id,
    sender_id: admin._id,
    type: "text",
    content: `Welcome to the DOSMOS, ${user.name}. Your planet ${planetName} is now initialized.`,
    is_system: true,
    created_at: new Date(),
  });

  console.log("[seed-user] ✅ Chat initialized with Admin.");
  process.exit(0);
}

seedUser().catch((err) => {
  console.error("[seed-user] Failed:", err.message);
  process.exit(1);
});
