import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
	createConversationController,
	getConversationsController,
} from "../controllers/conversation.controller.js";

const router = Router();

router.post("/", authMiddleware, createConversationController);
router.get("/", authMiddleware, getConversationsController);

export default router;
