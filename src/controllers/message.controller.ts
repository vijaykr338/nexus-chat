import type { Request, Response } from "express";
import { createMessage, markConversationAsSeen } from "../services/message.service.js";
import { getIO } from "../config/socket.js";

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

    // emit to entire conversation room EXCEPT sender
    io.to(conversationId).emit("receive_message", message);

    res.json(message);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
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
