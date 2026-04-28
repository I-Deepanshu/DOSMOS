import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./src/models/User.js";
import { generateSeed, getPlanetType, getPlanetColor } from "./src/utils/planetSeed.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await User.find({ role: "user" });
  for (const user of users) {
    const seed = user.planet?.metadata?.seed || generateSeed(user.dob.toISOString(), user.name);
    const colorSeed = (seed * 1000) % 1;
    const hueSeed = (colorSeed * 13) % 1;
    console.log(`${user.name}: seed=${seed}, hueSeed=${hueSeed}, h=${hueSeed * 360}`);
  }
  process.exit(0);
}
run();
