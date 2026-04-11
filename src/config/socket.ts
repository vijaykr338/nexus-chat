import { Server } from "socket.io";
import { prisma } from "./db.js";

let io: Server;

export function initSocket(server: any) {
  io = new Server(server, {
    cors: { origin: "*" },
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
});

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
          socket.to(conversationId).emit("conversation_seen", {
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
    socket.on("typing", ({ conversationId, userId }) => {
      socket.to(conversationId).emit("user_typing", { userId });
    });

    socket.on("stop_typing", ({ conversationId, userId }) => {
      socket.to(conversationId).emit("user_stop_typing", { userId });
    });
  });
}

export function getIO() {
  return io;
}
