import type { Request, Response } from "express";
import {
  acceptFriendRequest,
  getFriendRequests,
  getFriends,
  rejectFriendRequest,
  sendFriendRequest,
} from "../services/friend.service.js";

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function sendFriendRequestController(req: Request, res: Response) {
  try {
    const senderId = req.user?.id;
    const receiverId = req.body?.receiverId as string | undefined;

    if (!senderId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!receiverId) {
      return res.status(400).json({ error: "Receiver ID is required" });
    }

    const request = await sendFriendRequest({ senderId, receiverId });

    return res.status(201).json({ request });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

export async function getFriendRequestsController(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const requests = await getFriendRequests(userId);
    return res.json(requests);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
}

export async function acceptFriendRequestController(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const requestId = getParam(req.params.requestId);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!requestId) {
      return res.status(400).json({ error: "Request ID is required" });
    }

    const request = await acceptFriendRequest({
      requestId,
      currentUserId: userId,
    });

    return res.json({ request });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

export async function rejectFriendRequestController(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const requestId = getParam(req.params.requestId);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!requestId) {
      return res.status(400).json({ error: "Request ID is required" });
    }

    const request = await rejectFriendRequest({
      requestId,
      currentUserId: userId,
    });

    return res.json({ request });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

export async function getFriendsController(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const friends = await getFriends(userId);
    return res.json({ friends });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
}
