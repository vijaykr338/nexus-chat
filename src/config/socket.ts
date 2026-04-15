import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import { prisma } from "./db.js";
import { createMessage } from "../services/message.service.js";

let io: Server;

export function initSocket(server: HttpServer) {
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
    : ["http://localhost:3000", "http://localhost:3001"];

  io = new Server(server, {
    cors: {
      origin: corsOrigins,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    //when the joining occurs
    socket.on("join", (userId) => {
      socket.data.userId = userId; //  store it
      socket.join(userId);

      socket.broadcast.emit("user_online", { userId });
    });

    socket.on("disconnect", () => {
      const userId = socket.data.userId;

      if (userId) {
        socket.broadcast.emit("user_offline", { userId });
      }

      console.log("User disconnected:", socket.id);
    });

    socket.on("join_conversation", (conversationId) => {
      socket.join(conversationId);
      console.log(`User ${socket.id} joined conversation ${conversationId}`);
      socket.broadcast
        .to(conversationId)
        .emit("user_joined", { conversationId, userId: socket.data.userId });
    });

    /**
     * SEND_MESSAGE event handler
     * 
     * Flow:
     * 1. Frontend emits: { conversationId, content, senderId, senderName }
     * 2. Backend receives and broadcasts to all users in conversation
     * 3. All clients receive message and update UI
     * 4. Optionally save to database
     */
    socket.on(
      "send_message",
      async (data: {
        conversationId: string;
        content: string;
        type?: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "FILE";
        fileUrl?: string;
        senderId: string;
        senderName: string;
      }) => {
        try {
          const { conversationId, content, senderId, senderName, type, fileUrl } = data;
          const messageType = type ?? "TEXT";
          const hasText = Boolean(content?.trim());
          const hasFile = Boolean(fileUrl);

          if (!conversationId || !senderId) {
            throw new Error("Missing required fields");
          }

          if (messageType === "TEXT" && !hasText) {
            throw new Error("Text message cannot be empty");
          }

          if (messageType !== "TEXT" && !hasFile) {
            throw new Error("File URL is required for non-text messages");
          }

          const message = await createMessage({
            conversationId,
            senderId,
            content: content ?? "",
            type: messageType,
            ...(fileUrl ? { fileUrl } : {}),
          });

          // Broadcast to all users in this conversation
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

          console.log(
            `Message sent in ${conversationId} by ${senderName}: ${content.slice(
              0,
              50
            )}`
          );
        } catch (error) {
          console.error("Error sending message:", error);
          socket.emit("message_error", {
            error: error instanceof Error ? error.message : "Failed to send message",
          });
        }
      }
    );

    //this is the backend event, the frontend will
    socket.on(
      "message_delivered",
      async ({ messageId, userId }: { messageId: string; userId: string }) => {
        try {
          if (!messageId || !userId) {
            throw new Error("Message ID and User ID are required");
          }
          const status = await prisma.messageStatus.update({
            where: {
              //this is user B's status for a particular message
              messageId_userId: {
                messageId,
                userId,
              },
            },
            //this is just updateing the status to delivered, we can also add a timestamp here if needed
            data: {
              status: "DELIVERED",
            },
            include: {
              message: true,
            },
          });
          //this is User A, we got this from the message
          const senderId = status.message.senderId;
          //emit to the sender that his message has been delivered
          io.to(senderId).emit("message_status_updated", {
            messageId: status.messageId,
            userId: status.userId,
          });
        } catch (error) {
          console.error("Error updating message status:", error);
        }
      },
    );
    // for delivering message, i just needed the messageId and userId,
    // but for seen message, I need the conversationId to bulk update
    socket.on(
      "message_seen",
      async ({
        conversationId,
        userId,
      }: {
        conversationId: string;
        userId: string;
      }) => {
        try {
          if (!conversationId || !userId) {
            throw new Error("Conversation ID and User ID are required");
          }

          // bulk update all the messages - user B's side
          // mark all messages in this conversation as SEEN for this user
          await prisma.messageStatus.updateMany({
            where: {
              userId,
              message: {
                conversationId,
              },
            },
            data: {
              status: "SEEN",
            },
          });

          // instead of fetching ALL messages and emitting per message (expensive),
          // emit a single event for the entire conversation
          // this tells other participants that "user B has seen this conversation"
          io.to(conversationId).emit("conversation_seen", {
            conversationId,
            seenBy: userId,
          });

          // frontend can now mark all messages in this conversation as seen
          // without needing individual message updates

        } catch (error) {
          console.error("Error updating message seen status:", error);
        }
      },
    );

    //typing indicators
    socket.on("typing", ({ conversationId, userId, userName }) => {
      socket.to(conversationId).emit("user_typing", {
        conversationId,
        userId,
        userName,
      });
    });

    socket.on("stop_typing", ({ conversationId, userId }) => {
      socket.to(conversationId).emit("user_stop_typing", {
        conversationId,
        userId,
      });
    });
  });
}

export function getIO() {
  return io;
}
