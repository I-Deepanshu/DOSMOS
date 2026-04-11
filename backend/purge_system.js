import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const result = await mongoose.connection.db.collection("messages").deleteMany({ is_system: true });
    console.log("Deleted system messages:", result.deletedCount);
    process.exit(0);
}).catch(console.error);
