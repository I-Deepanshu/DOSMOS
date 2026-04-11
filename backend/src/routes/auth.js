import express from "express";
import authController from "../controllers/authController.js";
import { authLimiter, registerLimiter } from "../middleware/rateLimit.js";
import { authenticate } from "../middleware/authenticate.js";

const router = express.Router();

router.post("/dob", authLimiter, authController.checkDob);
router.post("/verify-name", authLimiter, authController.verifyName);
router.post("/verify", authLimiter, authController.verifyAnswer);
router.post("/register", registerLimiter, authController.register);
router.post("/refresh", authController.refresh);
router.post("/logout", authenticate, authController.logout);

export default router;
