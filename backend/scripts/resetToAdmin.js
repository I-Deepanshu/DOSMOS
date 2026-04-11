import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log("✅ Connected to MongoDB...\n");
  const db = mongoose.connection.db;

  // 1. Delete all non-admin users (keep role: "admin")
  const userResult = await db.collection("users").deleteMany({ role: { $ne: "admin" } });
  console.log(`🗑  Deleted ${userResult.deletedCount} user(s).`);

  // 2. Delete all chats
  const chatResult = await db.collection("chats").deleteMany({});
  console.log(`🗑  Deleted ${chatResult.deletedCount} chat(s).`);

  // 3. Delete all messages
  const msgResult = await db.collection("messages").deleteMany({});
  console.log(`🗑  Deleted ${msgResult.deletedCount} message(s).`);

  // 4. Delete all refresh tokens
  const rtResult = await db.collection("refreshtokens").deleteMany({});
  console.log(`🗑  Deleted ${rtResult.deletedCount} refresh token(s).`);

  // 5. Reset counters (user number sequence etc.)
  const cntResult = await db.collection("counters").deleteMany({});
  console.log(`🗑  Reset ${cntResult.deletedCount} counter(s).`);

  console.log("\n✅ DB reset complete. Only admin remains.");
  process.exit(0);
}).catch((err) => {
  console.error("❌ Connection failed:", err.message);
  process.exit(1);
});
