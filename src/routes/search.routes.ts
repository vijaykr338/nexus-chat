import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
	searchAllController,
	searchConversationsController,
	searchUsersController,
} from "../controllers/search.controller.js";

const router = Router();

router.get("/users", authMiddleware, searchUsersController);
router.get("/conversations", authMiddleware, searchConversationsController);
router.get("/", authMiddleware, searchAllController);

export default router;
