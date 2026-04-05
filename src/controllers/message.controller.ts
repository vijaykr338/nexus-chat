import type { Request, Response } from "express";
import { createMessage } from "../services/message.service.js";
import { getIO } from "../config/socket.js";
import { prisma } from "../config/db.js";

export async function sendMessage(req: Request, res: Response) {
  try {
    const { conversationId, type, content, fileUrl } = req.body;

    const senderId = req.user!.id;

    const message = await createMessage({
      conversationId,
      senderId,
      type,
      content,
      fileUrl
    });

    const io = getIO();
    message.conversation.participants.forEach((p) => {
        if(p.userId !== senderId){
            //send to everyone except the sender
            io.to(p.userId)
            .emit("recieve_message", message);

            console.log("Emitting to:", p.userId);
        }
    })

    res.json(message);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function markAsSeen(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { conversationId } = req.body;

    await prisma.messageStatus.updateMany({
      where: {
        userId,
        status: "DELIVERED",
        message: {
          conversationId
        }
      },
      data: {
        status: "SEEN"
      }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark as seen" });
  }
}