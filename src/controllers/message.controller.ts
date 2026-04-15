import type { Request, Response } from "express";
import {
  createMessage,
  getMessages,
  markConversationAsSeen,
} from "../services/message.service.js";
import { getIO } from "../config/socket.js";

function getMessageStatus(message: {
  statuses: Array<{ status: "SENT" | "DELIVERED" | "SEEN" }>;
}) {
  const statuses = message.statuses.map((entry) => entry.status);

  if (statuses.includes("SEEN")) {
    return "seen" as const;
  }

  if (statuses.includes("DELIVERED")) {
    return "delivered" as const;
  }

  if (statuses.includes("SENT")) {
    return "sent" as const;
  }

  return "sent" as const;
}

export async function sendMessage(req: Request, res: Response) {
  try {
    const { conversationId, type, content, fileUrl } = req.body;

    const senderId = req.user!.id;

    const message = await createMessage({
      conversationId,
      senderId,
      type,
      content,
      fileUrl,
    });

    const io = getIO();

    io.to(conversationId).emit("message_received", {
      conversationId,
      message: {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        senderName: message.sender.username,
        content: message.content,
        fileUrl: message.fileUrl,
        fileName: message.fileName,
        fileSize: message.fileSize,
        type: message.type,
        timestamp: message.createdAt,
      },
    });

    res.json(message);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function getConversationMessagesController(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const rawConversationId = req.params.conversationId;
    const conversationId = Array.isArray(rawConversationId)
      ? rawConversationId[0]
      : rawConversationId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!conversationId) {
      return res.status(400).json({ error: "Conversation ID is required" });
    }

    const messages = await getMessages({ conversationId });

    const result = messages.map((message) => ({
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderName: message.sender.username,
      content: message.content ?? "",
      fileUrl: message.fileUrl,
      fileName: message.fileName,
      fileSize: message.fileSize,
      type: message.type,
      timestamp: message.createdAt,
      status:
        message.senderId === userId ? getMessageStatus(message) : undefined,
    }));

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
//get conversations for a user
//send message 
//get all messages

export async function markAsSeen(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { conversationId } = req.body;

    await markConversationAsSeen({
      userId,
      conversationId,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark as seen" });
  }
}
