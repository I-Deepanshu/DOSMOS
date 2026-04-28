import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./src/models/User.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await User.find({ role: "user" }).select("name planet.name planet.type planet.color");
  console.log(JSON.stringify(users, null, 2));
  process.exit(0);
}

run();
