import { prisma } from "../config/db.js";


export async function createMessage({
    conversationId,
    senderId,
    content,
    type,
    fileUrl
} : {
    conversationId: string,
    senderId: string,
    content: string,
    type: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "FILE",
    fileUrl?: string,
}){
    if(type === "TEXT" && !content){
        throw new Error("Content is required for text messages");
    }
    if(type !== "TEXT" && !fileUrl){
        throw new Error("File URL is required for non-text messages");
    }

    const message = await prisma.message.create({
        data: {
            conversationId,
            senderId,
            content,
            type,
            fileUrl: fileUrl ?? null
        },
        //notice here double include is needed to get the participants of the conversation along with the message,
        // because we need to know the participants to send real-time updates to them.
        include: {
            conversation: {
                include: {
                    participants: true
                }
            }
        }
    })

    const statuses = message.conversation.participants
    .filter(p => p.userId !== senderId)
    //basically only the non-sender participants get the status of SENT, 
    // the sender doesn't need a status because they know they sent it.
    .map(p => ({
        messageId: message.id,
        userId: p.userId,
        status: "SENT" as const,
    }));

    if (statuses.length) { 
        await prisma.messageStatus.createMany({ 
            data: statuses 
        }); 
    }
    return message;
}