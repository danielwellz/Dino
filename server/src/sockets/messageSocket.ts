import { Server as IOServer, Socket } from "socket.io";
import {
  ConversationType,
  MessageStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client";

const prisma = new PrismaClient();

type SendMessagePayload = {
  conversationId?: number;
  teamId?: number;
  content: string;
  attachments?: {
    fileURL: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    thumbnailURL?: string;
  }[];
  metadata?: Record<string, unknown>;
};

type StatusPayload = {
  messageId: number;
  status: MessageStatus;
};

const joinConversationRoom = (socket: Socket, conversationId: number) => {
  socket.join(`conversation_${conversationId}`);
};

const leaveConversationRoom = (socket: Socket, conversationId: number) => {
  socket.leave(`conversation_${conversationId}`);
};

const ensureTeamConversation = async (teamId: number, userId: number) => {
  const existing = await prisma.conversation.findFirst({
    where: {
      teamId,
      type: ConversationType.TEAM,
    },
  });

  if (existing) {
    return existing.id;
  }

  const created = await prisma.conversation.create({
    data: {
      teamId,
      type: ConversationType.TEAM,
      createdById: userId,
      title: "Team Space",
      titleFa: "فضای تیم",
    },
  });
  return created.id;
};

export function initMessageSocket(io: IOServer) {
  io.on("connection", (socket: Socket) => {
    const userId = Number(socket.handshake.auth.userId);
    if (!userId) {
      socket.disconnect();
      return;
    }

    socket.on("joinConversation", async (conversationId: number) => {
      const participant = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId,
          userId,
        },
      });

      if (!participant) {
        socket.emit("error", { message: "Not a participant of conversation." });
        return;
      }

      joinConversationRoom(socket, conversationId);
    });

    socket.on("leaveConversation", (conversationId: number) => {
      leaveConversationRoom(socket, conversationId);
    });

    socket.on("joinTeam", async (teamId: number) => {
      const membership = await prisma.teamMember.findFirst({
        where: { teamId, userId },
        include: { team: true },
      });

      if (!membership) {
        socket.emit("error", { message: "Not a member of this team." });
        return;
      }

      const conversationId = await ensureTeamConversation(teamId, userId);
      joinConversationRoom(socket, conversationId);
      socket.emit("teamConversationReady", {
        teamId,
        conversationId,
      });
    });

    socket.on("sendMessage", async (payload: SendMessagePayload) => {
      try {
        const {
          conversationId: providedConversationId,
          teamId,
          content,
          attachments = [],
          metadata = {},
        } = payload;

        let conversationId = providedConversationId;

        if (!conversationId && teamId) {
          const teamMembership = await prisma.teamMember.findFirst({
            where: { teamId, userId },
          });

          if (!teamMembership) {
            throw new Error("User is not a member of this team");
          }

          conversationId = await ensureTeamConversation(teamId, userId);
        }

        if (!conversationId) {
          throw new Error("Conversation ID is required.");
        }

        const participant = await prisma.conversationParticipant.findFirst({
          where: {
            conversationId,
            userId,
          },
        });

        if (!participant) {
          throw new Error("User is not a participant of this conversation");
        }

        const metadataPayload: Prisma.InputJsonValue = metadata as Prisma.InputJsonValue;

        const message = await prisma.message.create({
          data: {
            text: content,
            userId,
            conversationId,
            status: MessageStatus.SENT,
            metadata: metadataPayload,
            attachments: {
              create: attachments.map((attachment) => ({
                fileURL: attachment.fileURL,
                fileName: attachment.fileName ?? null,
                fileType: attachment.fileType ?? null,
                fileSize: attachment.fileSize ?? null,
                thumbnailURL: attachment.thumbnailURL ?? null,
              })),
            },
          },
          include: {
            user: {
              select: {
                userId: true,
                username: true,
                profilePictureUrl: true,
              },
            },
            attachments: true,
          },
        });

        io.to(`conversation_${conversationId}`).emit("newMessage", {
          conversationId,
          message: {
            id: message.id,
            text: message.text,
            createdAt: message.createdAt,
            updatedAt: message.updatedAt,
            status: message.status,
            sender: {
              id: message.user.userId,
              username: message.user.username,
              avatar: message.user.profilePictureUrl,
            },
            attachments: message.attachments,
            metadata: message.metadata ?? {},
          },
        });
      } catch (error: any) {
        socket.emit("error", {
          message: error instanceof Error ? error.message : "Failed to send message",
        });
      }
    });

    socket.on("updateMessageStatus", async (payload: StatusPayload) => {
      try {
        const { messageId, status } = payload;

        if (status !== MessageStatus.DELIVERED && status !== MessageStatus.READ) {
          throw new Error("Unsupported status update");
        }

        const safeStatus = status;

        const message = await prisma.message.findUnique({
          where: { id: messageId },
          include: { conversation: true },
        });

        if (!message || !message.conversationId) {
          throw new Error("Message not found");
        }

        await prisma.messageReceipt.upsert({
          where: {
            messageId_userId: {
              messageId,
              userId,
            },
          },
          update: {
            status: safeStatus,
            readAt: safeStatus === MessageStatus.READ ? new Date() : undefined,
            deliveredAt: safeStatus === MessageStatus.DELIVERED || safeStatus === MessageStatus.READ
                ? new Date()
                : undefined,
          },
          create: {
            messageId,
            userId,
            status: safeStatus,
            readAt: safeStatus === MessageStatus.READ ? new Date() : null,
            deliveredAt: new Date(),
          },
        });

        io.to(`conversation_${message.conversationId}`).emit("messageStatusUpdated", {
          messageId,
          userId,
          status: safeStatus,
        });
      } catch (error: any) {
        socket.emit("error", {
          message:
            error instanceof Error ? error.message : "Failed to update message status",
        });
      }
    });

    socket.on("disconnect", () => {
      // noop but available for logging/debugging if needed
    });
  });
}

