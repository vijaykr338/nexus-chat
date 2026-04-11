import type { Request, Response } from "express";
import {
  createConversation,
  getConversations,
} from "../services/conversation.service.js";

export async function createConversationController(req: Request, res: Response) {
  try {
    const currentUserId = req.user?.id;
    const { type, name, userIds } = req.body;

    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const conversation = await createConversation({
      type,
      name,
      userIds,
      currentUserId,
    });

    res.status(201).json(conversation);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function getConversationsController(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const conversations = await getConversations(userId);

    res.json(conversations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}