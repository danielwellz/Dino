import { Request, Response } from "express";
import {
  ConversationRole,
  ConversationType,
  MessageStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { verifyAccessToken } from "../utils/jwt";

const prisma = new PrismaClient();

const extractAuthUser = (req: Request) => {
  const token = req.headers.authorization?.split(" ")[1];
  const decoded = verifyAccessToken(token as string);
  if (!decoded) {
    return null;
  }
  return Number(decoded.userId);
};

const ensureTeamConversation = async (teamId: number, userId: number) => {
  const conversation = await prisma.conversation.findFirst({
    where: { teamId, type: ConversationType.TEAM },
  });

  if (conversation) {
    return conversation;
  }

  const created = await prisma.conversation.create({
    data: {
      type: ConversationType.TEAM,
      teamId,
      createdById: userId,
      title: "Team Space",
      titleFa: "فضای تیم",
      participants: {
        create: [],
      },
    },
  });

  return created;
};

const mapMessage = (message: any) => ({
  id: message.id,
  text: message.text,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
  sender: {
    id: message.user.userId,
    username: message.user.username,
    avatar: message.user.profilePictureUrl,
  },
  status: message.status,
  pinnedAt: message.pinnedAt,
  pinnedById: message.pinnedById,
  aiSynopsis: message.aiSynopsis,
  attachments: message.attachments ?? [],
  metadata: message.metadata ?? {},
});

export const getConversations = async (req: Request, res: Response) => {
  const userId = extractAuthUser(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const participantRecords = await prisma.conversationParticipant.findMany({
    where: { userId },
    include: {
      conversation: {
        include: {
          participants: {
            include: {
              user: {
                select: {
                  userId: true,
                  username: true,
                  profilePictureUrl: true,
                },
              },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
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
          },
        },
      },
    },
  });

  const conversations = participantRecords
    .map((record) => {
      const conversation = record.conversation;
      return {
        id: conversation.id,
        type: conversation.type,
        title: conversation.title,
        titleFa: conversation.titleFa,
        teamId: conversation.teamId,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        participants: conversation.participants.map((participant) => ({
          userId: participant.userId,
          role: participant.role,
          username: participant.user.username,
          avatar: participant.user.profilePictureUrl,
        })),
        lastMessage: conversation.messages[0]
          ? mapMessage(conversation.messages[0])
          : null,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

  res.json({ conversations });
};

export const createConversation = async (req: Request, res: Response) => {
  const userId = extractAuthUser(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const {
    type,
    title,
    titleFa,
    participantIds = [],
    teamId,
  } = req.body as {
    type: ConversationType;
    title?: string;
    titleFa?: string;
    participantIds?: number[];
    teamId?: number;
  };

  if (type === ConversationType.TEAM && !teamId) {
    res.status(400).json({ message: "teamId is required for team channels" });
    return;
  }

  let conversation: any = null;

  if (type === ConversationType.DIRECT) {
    const directPartner = participantIds[0];
    if (!directPartner) {
      res.status(400).json({ message: "Direct conversations require a partner" });
      return;
    }

    const directCandidates = await prisma.conversation.findMany({
      where: {
        type: ConversationType.DIRECT,
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: true,
      },
    });

    conversation = directCandidates.find((candidate) => {
      if (candidate.participants.length !== 2) return false;
      const ids = candidate.participants.map((p) => p.userId).sort();
      return ids.includes(userId) && ids.includes(directPartner);
    });
  }

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        type,
        title: title ?? null,
        titleFa: titleFa ?? null,
        teamId: teamId ?? null,
        createdById: userId,
        participants: {
          create: [
            {
              userId,
              role: ConversationRole.OWNER,
            },
            ...participantIds
              .filter((id) => id !== userId)
              .map((id) => ({
                userId: id,
                role:
                  type === ConversationType.DIRECT
                    ? ConversationRole.MEMBER
                    : ConversationRole.ADMIN,
              })),
          ],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                userId: true,
                username: true,
                profilePictureUrl: true,
              },
            },
          },
        },
      },
    });
  }

  res.status(201).json({ conversation });
};

export const getConversationMessages = async (
  req: Request,
  res: Response,
) => {
  const userId = extractAuthUser(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { conversationId } = req.params;
  const conversation = await prisma.conversation.findUnique({
    where: { id: Number(conversationId) },
    include: {
      participants: true,
    },
  });

  if (!conversation) {
    res.status(404).json({ message: "Conversation not found" });
    return;
  }

  const isParticipant = conversation.participants.some(
    (participant) => participant.userId === userId,
  );
  if (!isParticipant) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: Number(conversationId) },
    orderBy: { createdAt: "asc" },
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

  res.json({
    messages: messages.map(mapMessage),
  });
};

export const postConversationMessage = async (
  req: Request,
  res: Response,
) => {
  const userId = extractAuthUser(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { conversationId } = req.params;
  const { text, attachments = [], metadata = {} } = req.body as {
    text: string;
    attachments?: {
      fileURL: string;
      fileName?: string;
      fileType?: string;
      fileSize?: number;
      thumbnailURL?: string;
    }[];
    metadata?: Record<string, unknown>;
  };

  const conversation = await prisma.conversation.findUnique({
    where: { id: Number(conversationId) },
    include: {
      participants: true,
    },
  });

  if (!conversation) {
    res.status(404).json({ message: "Conversation not found" });
    return;
  }

  const isParticipant = conversation.participants.some(
    (participant) => participant.userId === userId,
  );

  if (!isParticipant) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const metadataPayload: Prisma.InputJsonValue = metadata as Prisma.InputJsonValue;

  const message = await prisma.message.create({
    data: {
      text,
      userId,
      conversationId: conversation.id,
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

  res.status(201).json({ message: mapMessage(message) });
};

export const updateMessagePin = async (req: Request, res: Response) => {
  const userId = extractAuthUser(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { messageId } = req.params;
  const message = await prisma.message.findUnique({
    where: { id: Number(messageId) },
    include: {
      conversation: {
        include: {
          participants: true,
        },
      },
    },
  });

  if (!message) {
    res.status(404).json({ message: "Message not found" });
    return;
  }

  const isParticipant = message.conversation?.participants.some(
    (participant) => participant.userId === userId,
  );
  if (!isParticipant) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const updated = await prisma.message.update({
    where: { id: message.id },
    data: {
      pinnedAt: message.pinnedAt ? null : new Date(),
      pinnedById: message.pinnedAt ? null : userId,
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

  res.json({ message: mapMessage(updated) });
};

export const acknowledgeMessage = async (req: Request, res: Response) => {
  const userId = extractAuthUser(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { messageId } = req.params;
  const { status } = req.body as { status: MessageStatus };

  if (status !== MessageStatus.DELIVERED && status !== MessageStatus.READ) {
    res.status(400).json({ message: "Invalid status update." });
    return;
  }

  const safeStatus =
    status as (typeof MessageStatus.DELIVERED | typeof MessageStatus.READ);

  const receipt = await prisma.messageReceipt.upsert({
    where: {
      messageId_userId: {
        messageId: Number(messageId),
        userId,
      },
    },
    update: {
      status: safeStatus,
      readAt: safeStatus === MessageStatus.READ ? new Date() : undefined,
      deliveredAt:
        safeStatus === MessageStatus.DELIVERED || safeStatus === MessageStatus.READ
          ? new Date()
          : undefined,
    },
    create: {
      messageId: Number(messageId),
      userId,
      status: safeStatus,
      readAt: safeStatus === MessageStatus.READ ? new Date() : null,
      deliveredAt: new Date(),
    },
  });

  res.json({ receipt });
};

export const getTeamMessages = async (req: Request, res: Response) => {
  const userId = extractAuthUser(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const teamId = Number(req.params.teamId);
  const teamMember = await prisma.teamMember.findFirst({
    where: { teamId, userId },
  });

  if (!teamMember) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const conversation = await ensureTeamConversation(teamId, userId);

  await prisma.conversationParticipant.upsert({
    where: { conversationId_userId: { conversationId: conversation.id, userId } },
    update: {},
    create: { conversationId: conversation.id, userId, role: ConversationRole.MEMBER },
  });

  const messages = await prisma.message.findMany({
    where: {
      conversationId: conversation.id,
    },
    orderBy: { createdAt: "asc" },
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

  res.json({
    conversationId: conversation.id,
    messages: messages.map(mapMessage),
  });
};

