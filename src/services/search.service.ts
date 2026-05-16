import { prisma } from "../config/db.js";

export async function searchUsers(query: string) {
    //insensitive basically ignores the case of the letters, so "vijay" and "Vijay" would be treated the same
    //also if you dont find anything, dont crash, just return empty array, so that frontend can handle it gracefully
  return prisma.user.findMany({
    where: {
      username: {
        contains: query,
        mode: "insensitive"
      }
    },
    take: 10
  });
}

export async function searchConversations(
  userId: string,
  query: string,
  type?: "DIRECT" | "GROUP",
) {
  const normalizedQuery = query.trim();

  return prisma.conversation.findMany({
    // Direct conversations should stay user-scoped, but group discovery can be global.
    where: {
      ...(type ? { type } : {}),
      ...(type === "GROUP"
        ? {
            name: {
              startsWith: normalizedQuery,
              mode: "insensitive",
            },
          }
        : {
            OR: [
              {
                name: {
                  contains: normalizedQuery,
                  mode: "insensitive",
                },
              },
              {
                participants: {
                  some: {
                    user: {
                      username: {
                        contains: normalizedQuery,
                        mode: "insensitive",
                      },
                    },
                  },
                },
              },
            ],
          }),
      ...(type !== "GROUP"
        ? {
            participants: {
              some: {
                userId,
              },
            },
          }
        : {}),
    },
    include: {
      participants: {
        include: {
          user: true,
        },
      },
    },
    take: 10,
  });
}