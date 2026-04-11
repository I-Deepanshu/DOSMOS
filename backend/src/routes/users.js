import express from "express";
import userController from "../controllers/userController.js";
import { authenticate, requireAdmin } from "../middleware/authenticate.js";

const router = express.Router();

router.get("/me",                         authenticate,               userController.getMe);
router.patch("/planet/rename",            authenticate,               userController.renamePlanet);
router.patch("/:userId/verify",           authenticate, requireAdmin, userController.verifyUser);

export default router;
