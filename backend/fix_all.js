import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./src/models/User.js";
import { generateSeed, getPlanetType, getPlanetColor } from "./src/utils/planetSeed.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to DB.");

  const users = await User.find({ role: "user" });
  for (const user of users) {
    if (!user.planet) continue;
    
    const seed = user.planet.metadata?.seed || generateSeed(user.dob.toISOString(), user.name);
    const planetTypeObj = getPlanetType(seed);
    const newColor = getPlanetColor(seed, planetTypeObj);
    
    console.log(`User: ${user.name} | Old: ${user.planet.color} -> New: ${newColor}`);
    user.planet.color = newColor;
    await user.save();
  }

  console.log("Done.");
  process.exit(0);
}

run();
