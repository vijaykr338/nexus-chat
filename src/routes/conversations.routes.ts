import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
	addConversationMembersController,
	createConversationController,
	getConversationMembersController,
	getConversationsController,
	removeConversationMemberController,
	updateConversationMemberRoleController,
} from "../controllers/conversation.controller.js";
import {
	getConversationMessagesController,
	markAsSeen,
} from "../controllers/message.controller.js";

const router = Router();

router.post("/", authMiddleware, createConversationController);
router.get("/", authMiddleware, getConversationsController);
router.get("/:conversationId/messages", authMiddleware, getConversationMessagesController);
router.post("/:conversationId/seen", authMiddleware, markAsSeen);
router.get("/:conversationId/members", authMiddleware, getConversationMembersController);
router.post("/:conversationId/members", authMiddleware, addConversationMembersController);
router.delete("/:conversationId/members/:memberUserId", authMiddleware, removeConversationMemberController);
router.patch("/:conversationId/members/:memberUserId/role", authMiddleware, updateConversationMemberRoleController);

export default router;
