import type { Request, Response } from "express";
import {
  addMembersToGroupConversation,
  createConversation,
  getConversationMembers,
  getConversations,
  removeMemberFromGroupConversation,
  updateGroupMemberRole,
} from "../services/conversation.service.js";

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

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

export async function getConversationMembersController(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const conversationId = getParam(req.params.conversationId);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!conversationId) {
      return res.status(400).json({ error: "Conversation ID is required" });
    }

    const members = await getConversationMembers({
      conversationId,
      currentUserId: userId,
    });

    res.json(members);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function addConversationMembersController(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const conversationId = getParam(req.params.conversationId);
    const bodyUserIds = req.body?.userIds;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!conversationId) {
      return res.status(400).json({ error: "Conversation ID is required" });
    }

    const userIds = Array.isArray(bodyUserIds)
      ? bodyUserIds.filter((entry: unknown): entry is string => typeof entry === "string")
      : [];

    const result = await addMembersToGroupConversation({
      conversationId,
      currentUserId: userId,
      userIds,
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function removeConversationMemberController(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const conversationId = getParam(req.params.conversationId);
    const memberUserId = getParam(req.params.memberUserId);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!conversationId || !memberUserId) {
      return res.status(400).json({ error: "Conversation ID and member user ID are required" });
    }

    const result = await removeMemberFromGroupConversation({
      conversationId,
      currentUserId: userId,
      memberUserId,
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function updateConversationMemberRoleController(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const conversationId = getParam(req.params.conversationId);
    const memberUserId = getParam(req.params.memberUserId);
    const role = req.body?.role;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!conversationId || !memberUserId) {
      return res.status(400).json({ error: "Conversation ID and member user ID are required" });
    }

    if (role !== "ADMIN" && role !== "MEMBER") {
      return res.status(400).json({ error: "Role must be ADMIN or MEMBER" });
    }

    const updated = await updateGroupMemberRole({
      conversationId,
      currentUserId: userId,
      memberUserId,
      role,
    });

    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}