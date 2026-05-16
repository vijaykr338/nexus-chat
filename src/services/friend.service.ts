import { prisma } from "../config/db.js";

const userSelect = {
  id: true,
  username: true,
  email: true,
};

const requestInclude = {
  sender: { select: userSelect },
  receiver: { select: userSelect },
};

export async function sendFriendRequest({
  senderId,
  receiverId,
}: {
  senderId: string;
  receiverId: string;
}) {
  if (senderId === receiverId) {
    throw new Error("You cannot send a friend request to yourself");
  }

  const receiver = await prisma.user.findUnique({
    where: { id: receiverId },
    select: userSelect,
  });

  if (!receiver) {
    throw new Error("User not found");
  }

  const [direct, reverse] = await Promise.all([
    prisma.friendRequest.findUnique({
      where: {
        senderId_receiverId: {
          senderId,
          receiverId,
        },
      },
      include: requestInclude,
    }),
    prisma.friendRequest.findUnique({
      where: {
        senderId_receiverId: {
          senderId: receiverId,
          receiverId: senderId,
        },
      },
      include: requestInclude,
    }),
  ]);

  if (direct?.status === "PENDING") {
    return direct;
  }

  if (direct?.status === "ACCEPTED" || reverse?.status === "ACCEPTED") {
    throw new Error("You are already friends");
  }

  if (reverse?.status === "PENDING") {
    throw new Error("User already sent you a request");
  }

  if (direct?.status === "REJECTED") {
    return prisma.friendRequest.update({
      where: { id: direct.id },
      data: { status: "PENDING" },
      include: requestInclude,
    });
  }

  return prisma.friendRequest.create({
    data: {
      senderId,
      receiverId,
      status: "PENDING",
    },
    include: requestInclude,
  });
}

export async function getFriendRequests(userId: string) {
  const [incoming, outgoing] = await Promise.all([
    prisma.friendRequest.findMany({
      where: {
        receiverId: userId,
        status: "PENDING",
      },
      include: requestInclude,
      orderBy: { createdAt: "desc" },
    }),
    prisma.friendRequest.findMany({
      where: {
        senderId: userId,
        status: "PENDING",
      },
      include: requestInclude,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { incoming, outgoing };
}

export async function acceptFriendRequest({
  requestId,
  currentUserId,
}: {
  requestId: string;
  currentUserId: string;
}) {
  const request = await prisma.friendRequest.findUnique({
    where: { id: requestId },
    include: requestInclude,
  });

  if (!request) {
    throw new Error("Friend request not found");
  }

  if (request.receiverId !== currentUserId) {
    throw new Error("Not authorized to accept this request");
  }

  if (request.status !== "PENDING") {
    throw new Error("Friend request already handled");
  }

  return prisma.friendRequest.update({
    where: { id: requestId },
    data: { status: "ACCEPTED" },
    include: requestInclude,
  });
}

export async function rejectFriendRequest({
  requestId,
  currentUserId,
}: {
  requestId: string;
  currentUserId: string;
}) {
  const request = await prisma.friendRequest.findUnique({
    where: { id: requestId },
    include: requestInclude,
  });

  if (!request) {
    throw new Error("Friend request not found");
  }

  if (request.receiverId !== currentUserId) {
    throw new Error("Not authorized to reject this request");
  }

  if (request.status !== "PENDING") {
    throw new Error("Friend request already handled");
  }

  return prisma.friendRequest.update({
    where: { id: requestId },
    data: { status: "REJECTED" },
    include: requestInclude,
  });
}

export async function getFriends(userId: string) {
  const accepted = await prisma.friendRequest.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    include: requestInclude,
    orderBy: { createdAt: "desc" },
  });

  const friends = accepted
    .map((request) => (request.senderId === userId ? request.receiver : request.sender))
    .filter((friend, index, self) => self.findIndex((entry) => entry.id === friend.id) === index);

  return friends;
}
