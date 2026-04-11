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
  { name: "Lyra", dob: "1992-03-12", ans: "stardust" },
  { name: "Orion", dob: "1988-11-20", ans: "hunter" },
  { name: "Vega", dob: "1994-07-04", ans: "bright" },
  { name: "Draco", dob: "1990-01-30", ans: "dragon" },
  { name: "Cygnus", dob: "1985-06-15", ans: "swan" },
  { name: "Andromeda", dob: "1993-02-22", ans: "galaxy" },
  { name: "Cassiopeia", dob: "1991-09-09", ans: "queen" }
];

async function seedMany() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("[seed-many] Connected to DB");

  const admin = await User.findOne({ role: "admin" });

  for (const u of USERS) {
    const existing = await User.findOne({ normalized_name: normalize(u.name) });
    if (existing) continue;

    const hash = await bcrypt.hash(normalize(u.ans), 12);
    const seed = generateSeed(u.dob, u.name);
    const typeData = getPlanetType(seed);
    const color = getPlanetColor(seed, typeData);
    const planetName = generatePlanetName(seed);

    const orbitIdx = await planetService.getNextOrbitIndex();

    const userData = {
      name: u.name,
      normalized_name: normalize(u.name),
      dob: new Date(u.dob),
      role: "user",
      status: "active",
      is_active: true,
      security_question: "Verify your cosmic source.",
      security_answer_hash: hash,
      created_at: new Date(),
    };

    const planetData = {
      name: planetName,
      type: typeData.type,
      color,
      orbitIndex: orbitIdx,
      size: 30 + Math.random() * 20,
      metadata: { seed, version: 2 },
    };

    const user = await planetService.createUserWithUniquePlanet(userData, planetData);
    console.log(`[seed-many] ✅ User created: ${user.name} (Planet: ${planetName})`);

    await Chat.create({
      participants: [admin._id, user._id],
      last_message: "New connection established.",
      last_message_at: new Date(),
    });
  }

  process.exit(0);
}

seedMany().catch(err => {
  console.error(err);
  process.exit(1);
});
