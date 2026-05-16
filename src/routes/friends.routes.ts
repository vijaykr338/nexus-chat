import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  acceptFriendRequestController,
  getFriendRequestsController,
  getFriendsController,
  rejectFriendRequestController,
  sendFriendRequestController,
} from "../controllers/friend.controller.js";

const router = Router();

router.get("/", authMiddleware, getFriendsController);
router.get("/requests", authMiddleware, getFriendRequestsController);
router.post("/requests", authMiddleware, sendFriendRequestController);
router.post("/requests/:requestId/accept", authMiddleware, acceptFriendRequestController);
router.post("/requests/:requestId/reject", authMiddleware, rejectFriendRequestController);

export default router;
