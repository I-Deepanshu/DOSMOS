import express from "express";
import chatController from "../controllers/chatController.js";
import { authenticate } from "../middleware/authenticate.js";
import { ownChat } from "../middleware/ownChat.js";
import { uploadMediaMiddleware } from "../middleware/upload.js";

const router = express.Router();

router.get("/",                          authenticate,           chatController.getChats);
router.get("/:chatId",                   authenticate, ownChat,  chatController.getChat);
router.get("/:chatId/messages",          authenticate, ownChat,  chatController.getMessages);
router.post("/:chatId/messages",         authenticate, ownChat,  chatController.sendMessage);
router.post("/:chatId/messages/media",   authenticate, ownChat,  uploadMediaMiddleware.single('file'), chatController.uploadMedia);
router.patch("/:chatId/messages/:messageId/seen", authenticate, ownChat, chatController.markSeen);

export default router;
