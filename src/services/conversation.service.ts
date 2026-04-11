import { prisma } from "../config/db.js";

export async function createConversation({
    type,
    name,
    userIds,
    currentUserId
} : {
    type: "DIRECT" | "GROUP",
    name: string,
    userIds: string[],
    currentUserId: string
}) {
    //set allows only unique values
const allUsers = [...new Set([currentUserId, ...userIds])];

if(type === "DIRECT" && allUsers.length !== 2) {
    throw new Error("Direct conversation must have exactly 2 participants");
}

if(type === "DIRECT" && allUsers.length === 2) {
    //otheruserId is in the array not the one which includes both
    const otherUserId = userIds[0];
    //typescript is very strict about otherUserId being possibly undefined, 
    // even though we know it won't be because of the length check above.
    //  We can use a non-null assertion operator to tell typescript that 
    // we are sure otherUserId is not undefined.
    if (!otherUserId) {
  throw new Error("Target user ID is missing");
        }

    const existingConversation = await prisma.conversation.findFirst({
        where: {
            type: "DIRECT",
            AND: [
                {
                    participants: {
                        some: {
                            userId: currentUserId!
                        }
                    }
                },
                {
                    participants: {
                        some: {
                            userId: otherUserId!
                        }
                    }
                }
            ]
        },
        //this line ensures the data returned always has the participants field with the array
        include: {
            participants: true
        }
    });

    if (existingConversation && existingConversation.participants.length === 2) {
  return existingConversation;
}
}

//create a conversation - multiple groups are allowed with same members
const conversation = await prisma.conversation.create({
  data: {
    type,
    name,
    participants: {
      create: allUsers.map((userId) => ({
        userId,
        role:
          type === "GROUP" && userId === currentUserId
            ? "ADMIN"
            : "MEMBER"
      }))
    }
  },
  include: {
    participants: true
  }
});

return conversation;
}

export async function getConversations(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: {
      participants: {
        some: {
          userId,
        },
      },
    },
    include: {
      participants: true,
      messages: {
        take: 1,
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  const result = await Promise.all(
    conversations.map(async (conv) => {
      const unreadCount = await prisma.messageStatus.count({
        where: {
          userId,
          status: {
            not: "SEEN",
          },
          message: {
            conversationId: conv.id,
          },
        },
      });

      return {
        id: conv.id,
        type: conv.type,
        name: conv.name,
        participants: conv.participants,
        lastMessage: conv.messages[0] || null,
        unreadCount,
      };
    })
  );

  return result;
}