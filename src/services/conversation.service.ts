import { prisma } from "../config/db.js";

export async function createConversation({
    type,
  name,
    userIds,
    currentUserId
} : {
    type: "DIRECT" | "GROUP",
  name?: string,
    userIds: string[],
    currentUserId: string
}) {
    //set allows only unique values
const allUsers = [...new Set([currentUserId, ...userIds])];
let conversationName: string | null = name ?? null;

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

    const otherUser = await prisma.user.findUnique({
      where: {
        id: otherUserId,
      },
      select: {
        username: true,
      },
    });

    conversationName = conversationName || otherUser?.username || null;
}

//create a conversation - multiple groups are allowed with same members
const conversation = await prisma.conversation.create({
  data: {
    type,
    name: conversationName,
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

//basically it returns all the members of the convo -> could be a group or 1 to 1
async function getConversationForParticipantCheck(conversationId: string) {
  return prisma.conversation.findUnique({
    where: {
      id: conversationId,
    },
    include: {
      participants: true,
    },
  });
}

//this is a check, that checks everything 
//
async function requireGroupAdmin(conversationId: string, currentUserId: string) {
  //get all memebers first
  const conversation = await getConversationForParticipantCheck(conversationId);

  //see if it exists or not first
  if (!conversation) {
    throw new Error("Conversation not found");
  }
  //see if it is a group or not 
  if (conversation.type !== "GROUP") {
    throw new Error("Member management is only supported for GROUP conversations");
  }
  //find the current user is an admin of this CONVERSATION - group 
  const currentParticipant = conversation.participants.find(
    (participant) => participant.userId === currentUserId
  );
  //see if the user is even part or not
  if (!currentParticipant) {
    throw new Error("You are not a participant in this conversation");
  }

  //see if this the admin role or not 
  if (currentParticipant.role !== "ADMIN") {
    throw new Error("Only admins can manage group members");
  }

  return conversation;
}

export async function getConversationMembers({
  conversationId,
  currentUserId,
}: {
  conversationId: string;
  currentUserId: string;
}) {
  const conversation = await prisma.conversation.findUnique({
    where: {
      id: conversationId,
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const currentParticipant = conversation.participants.find(
    (participant) => participant.userId === currentUserId
  );

  if (!currentParticipant) {
    throw new Error("You are not a participant in this conversation");
  }

  return {
    conversationId: conversation.id,
    type: conversation.type,
    members: conversation.participants,
  };
}

export async function addMembersToGroupConversation({
  conversationId,
  currentUserId,
  userIds,
}: {
  conversationId: string;
  currentUserId: string;
  userIds: string[];
}) {
  //only a group admin can add members, so we check that first 
  //using our function
  const conversation = await requireGroupAdmin(conversationId, currentUserId);

  //check for empty 
  if (!userIds.length) {
    throw new Error("At least one user ID is required");
  }

  //unique ID needed -> set is great for this (FROM THE INPUT)
  const uniqueRequestedIds = [...new Set(userIds)];
  //can't add the same guy again right (FROM THE DATABASE)
  const existingMemberIds = new Set(conversation.participants.map((participant) => participant.userId));

  // Requested: ["B", "C", "D"]
  // Existing:  ["A", "B", "C"]
  // Result: ["D"]
  const newMemberIds = uniqueRequestedIds.filter((userId) => !existingMemberIds.has(userId));

  //if there are no members to add then just return early 
  if (!newMemberIds.length) {
    return {
      addedCount: 0,
    };
  }

  //next we check if the users even exist or not in the database
  const existingUsers = await prisma.user.findMany({
    where: {
      id: {
        in: newMemberIds,
      },
    },
    select: {
      id: true,
    },
  });

    //finally get the existing users -> transform into ID set 
  const existingUserIds = new Set(existingUsers.map((user) => user.id));

  //get the ID which does not exist in the database 
  const missingUserIds = newMemberIds.filter((userId) => !existingUserIds.has(userId));

  //return error for those missing IDs
  if (missingUserIds.length) {
    throw new Error(`Users not found: ${missingUserIds.join(", ")}`);
  }

  //if all good, then we can add the members to the conversation
  const result = await prisma.participant.createMany({
    data: newMemberIds.map((userId) => ({
      userId,
      conversationId,
      role: "MEMBER",
    })),
    skipDuplicates: true,
  });

  return {
    addedCount: result.count,
  };
}

export async function removeMemberFromGroupConversation({
  conversationId,
  currentUserId,
  memberUserId,
}: {
  conversationId: string;
  currentUserId: string;
  memberUserId: string;
}) {
  //check if the current user is an admin of this group, if not throw error
  await requireGroupAdmin(conversationId, currentUserId);

  const member = await prisma.participant.findUnique({
    where: {
      userId_conversationId: {
        userId: memberUserId,
        conversationId,
      },
    },
  });

  if (!member) {
    throw new Error("Member not found in this conversation");
  }

  if (member.role === "ADMIN") {
    const adminCount = await prisma.participant.count({
      where: {
        conversationId,
        role: "ADMIN",
      },
    });

    if (adminCount <= 1) {
      throw new Error("Cannot remove the last admin from the group");
    }
  }

  await prisma.participant.delete({
    where: {
      userId_conversationId: {
        userId: memberUserId,
        conversationId,
      },
    },
  });

  return {
    removedUserId: memberUserId,
  };
}

export async function updateGroupMemberRole({
  conversationId,
  currentUserId,
  memberUserId,
  role,
}: {
  conversationId: string;
  currentUserId: string;
  memberUserId: string;
  role: "ADMIN" | "MEMBER";
}) {
  await requireGroupAdmin(conversationId, currentUserId);

  const member = await prisma.participant.findUnique({
    where: {
      userId_conversationId: {
        userId: memberUserId,
        conversationId,
      },
    },
  });

  if (!member) {
    throw new Error("Member not found in this conversation");
  }

  if (member.role === "ADMIN" && role === "MEMBER") {
    const adminCount = await prisma.participant.count({
      where: {
        conversationId,
        role: "ADMIN",
      },
    });

    if (adminCount <= 1) {
      throw new Error("Cannot demote the last admin");
    }
  }

  const updated = await prisma.participant.update({
    where: {
      userId_conversationId: {
        userId: memberUserId,
        conversationId,
      },
    },
    data: {
      role,
    },
  });

  return updated;
}