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

export async function searchConversations(userId: string, query: string) {
  return prisma.conversation.findMany({
    //I want to search for convo with my searchID and whoever else is there, group or direct 
    //but the structure should be me + other guy/people
    where: {
      participants: {
        some: {
          userId
        }
      },
      //find the name of convo, direct or group
      OR: [
        {
          name: {
            contains: query,
            mode: "insensitive"
          }
        },
        {
          participants: {
            some: {
              user: {
                username: {
                  contains: query,
                  mode: "insensitive"
                }
              }
            }
          }
        }
      ]
    },
    include: {
      participants: {
        include: {
          user: true
        }
      }
    },
    take: 10
  });
}