import { Server } from "socket.io";
import { prisma } from "./db.js";

let io: Server;

export function initSocket(server: any) {
  io = new Server(server, {
    cors: { origin: "*" }
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    //when the joining occurs
    socket.on("join", (userId) => {
      socket.join(userId);
      console.log(`The user ${userId} has joined the room`);
    });
    //this is the backend event, the frontend will 
    socket.on("message_delivered", async ({ messageId, userId }: { messageId: string; userId: string }) => {
      try {
        if (!messageId || !userId) {
          throw new Error("Message ID and User ID are required");
        }
        const status = await prisma.messageStatus.update({
          where: {
            messageId_userId: {
              messageId,
              userId
            }
          },
          //this is just updateing the status to delivered, we can also add a timestamp here if needed
          data: {
            status: "DELIVERED"
          },
          include: {
            message: true
          }
        });

        io.to(userId).emit("message_status_updated", {
          messageId: status.messageId,
          userId: status.userId,
        })

      } catch (error) {
        console.error("Error updating message status:", error);
      }
    });
      //for delivering message, i just needed the messageid and userid,
      //but for seen message, I need the conversation Id to bulk update
    socket.on("message_seen", async ({conversationId, userId}: {conversationId: string; userId: string})=> {
      try {
        if(!conversationId || !userId) {
          throw new Error("Conversation ID and User ID are required");
        }
        //bulk update all the messages
        
      } catch (error) {
        console.error("Error updating message seen status:", error);
      }
    })

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });
}

export function getIO() {
  return io;
}