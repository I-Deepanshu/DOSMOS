import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    console.log("Connected to MongoDB...");
    
    const db = mongoose.connection.db;
    
    await db.collection("chats").deleteMany({});
    console.log("Purged all chats.");
    
    await db.collection("messages").deleteMany({});
    console.log("Purged all messages.");
    
    console.log("Wipe complete!");
    process.exit(0);
}).catch(console.error);
