import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import { createRequire } from "module";
import dotenv from "dotenv";

dotenv.config();

import authRoutes  from "./routes/auth.js";
import chatRoutes  from "./routes/chat.js";
import userRoutes  from "./routes/users.js";
import { socketAuth }            from "./socket/middleware.js";
import { registerSocketHandlers } from "./socket/handlers.js";
import { errorHandler }           from "./middleware/errorHandler.js";

const app    = express();
const server = createServer(app);
const io     = new Server(server, {
  cors: {
    origin:      process.env.FRONTEND_URL,
    credentials: true,
  },
});

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'"],
      styleSrc:    ["'self'", "'unsafe-inline'"],
      imgSrc:      ["'self'", "data:", "blob:", "res.cloudinary.com",
                    "media.giphy.com", "media0.giphy.com", "media1.giphy.com",
                    "media2.giphy.com", "media3.giphy.com", "media4.giphy.com"],
      mediaSrc:    ["'self'", "blob:", `https://${process.env.S3_BUCKET}.s3.amazonaws.com`],
      connectSrc:  ["'self'", process.env.FRONTEND_URL, "wss:"],
      workerSrc:   ["'self'", "blob:"],
    },
  },
}));

app.use(cors({
  origin:      process.env.FRONTEND_URL,
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(mongoSanitize());

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use("/api/auth",  authRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/users", userRoutes);

// Static uploads fallback
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// ── Socket.io ──────────────────────────────────────────────────────────────────
app.set("io", io);
io.use(socketAuth);
registerSocketHandlers(io);

// ── Error handler ──────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── DB + Server ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("[db] Connected to MongoDB Atlas");
    server.listen(PORT, () => console.log(`[server] Running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("[db] Connection failed:", err.message);
    process.exit(1);
  });
