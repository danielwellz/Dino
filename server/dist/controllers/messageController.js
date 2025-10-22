"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMessage = exports.getTeamMessages = exports.acknowledgeMessage = exports.updateMessagePin = exports.postConversationMessage = exports.getConversationMessages = exports.createConversation = exports.getConversations = void 0;
const client_1 = require("@prisma/client");
const jwt_1 = require("../utils/jwt");
const prisma = new client_1.PrismaClient();
const extractAuthUser = (req) => {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(" ")[1];
    const decoded = (0, jwt_1.verifyAccessToken)(token);
    if (!decoded) {
        return null;
    }
    return Number(decoded.userId);
};
const ensureTeamConversation = (teamId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const conversation = yield prisma.conversation.findFirst({
        where: { teamId, type: client_1.ConversationType.TEAM },
    });
    if (conversation) {
        return conversation;
    }
    const created = yield prisma.conversation.create({
        data: {
            type: client_1.ConversationType.TEAM,
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
});
const mapMessage = (message) => {
    var _a, _b;
    return ({
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
        attachments: (_a = message.attachments) !== null && _a !== void 0 ? _a : [],
        metadata: (_b = message.metadata) !== null && _b !== void 0 ? _b : {},
    });
};
const getConversations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = extractAuthUser(req);
    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const participantRecords = yield prisma.conversationParticipant.findMany({
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
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    res.json({ conversations });
});
exports.getConversations = getConversations;
const createConversation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = extractAuthUser(req);
    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const { type, title, titleFa, participantIds = [], teamId, } = req.body;
    if (type === client_1.ConversationType.TEAM && !teamId) {
        res.status(400).json({ message: "teamId is required for team channels" });
        return;
    }
    let conversation = null;
    if (type === client_1.ConversationType.DIRECT) {
        const directPartner = participantIds[0];
        if (!directPartner) {
            res.status(400).json({ message: "Direct conversations require a partner" });
            return;
        }
        const directCandidates = yield prisma.conversation.findMany({
            where: {
                type: client_1.ConversationType.DIRECT,
                participants: {
                    some: { userId },
                },
            },
            include: {
                participants: true,
            },
        });
        conversation = directCandidates.find((candidate) => {
            if (candidate.participants.length !== 2)
                return false;
            const ids = candidate.participants.map((p) => p.userId).sort();
            return ids.includes(userId) && ids.includes(directPartner);
        });
    }
    if (!conversation) {
        conversation = yield prisma.conversation.create({
            data: {
                type,
                title: title !== null && title !== void 0 ? title : null,
                titleFa: titleFa !== null && titleFa !== void 0 ? titleFa : null,
                teamId: teamId !== null && teamId !== void 0 ? teamId : null,
                createdById: userId,
                participants: {
                    create: [
                        {
                            userId,
                            role: client_1.ConversationRole.OWNER,
                        },
                        ...participantIds
                            .filter((id) => id !== userId)
                            .map((id) => ({
                            userId: id,
                            role: type === client_1.ConversationType.DIRECT
                                ? client_1.ConversationRole.MEMBER
                                : client_1.ConversationRole.ADMIN,
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
});
exports.createConversation = createConversation;
const getConversationMessages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = extractAuthUser(req);
    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const { conversationId } = req.params;
    const conversation = yield prisma.conversation.findUnique({
        where: { id: Number(conversationId) },
        include: {
            participants: true,
        },
    });
    if (!conversation) {
        res.status(404).json({ message: "Conversation not found" });
        return;
    }
    const isParticipant = conversation.participants.some((participant) => participant.userId === userId);
    if (!isParticipant) {
        res.status(403).json({ message: "Forbidden" });
        return;
    }
    const messages = yield prisma.message.findMany({
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
});
exports.getConversationMessages = getConversationMessages;
const postConversationMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = extractAuthUser(req);
    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const { conversationId } = req.params;
    const { text, attachments = [], metadata = {} } = req.body;
    const conversation = yield prisma.conversation.findUnique({
        where: { id: Number(conversationId) },
        include: {
            participants: true,
        },
    });
    if (!conversation) {
        res.status(404).json({ message: "Conversation not found" });
        return;
    }
    const isParticipant = conversation.participants.some((participant) => participant.userId === userId);
    if (!isParticipant) {
        res.status(403).json({ message: "Forbidden" });
        return;
    }
    const metadataPayload = metadata;
    const message = yield prisma.message.create({
        data: {
            text,
            userId,
            conversationId: conversation.id,
            status: client_1.MessageStatus.SENT,
            metadata: metadataPayload,
            attachments: {
                create: attachments.map((attachment) => {
                    var _a, _b, _c, _d;
                    return ({
                        fileURL: attachment.fileURL,
                        fileName: (_a = attachment.fileName) !== null && _a !== void 0 ? _a : null,
                        fileType: (_b = attachment.fileType) !== null && _b !== void 0 ? _b : null,
                        fileSize: (_c = attachment.fileSize) !== null && _c !== void 0 ? _c : null,
                        thumbnailURL: (_d = attachment.thumbnailURL) !== null && _d !== void 0 ? _d : null,
                    });
                }),
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
});
exports.postConversationMessage = postConversationMessage;
const updateMessagePin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = extractAuthUser(req);
    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const { messageId } = req.params;
    const message = yield prisma.message.findUnique({
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
    const isParticipant = (_a = message.conversation) === null || _a === void 0 ? void 0 : _a.participants.some((participant) => participant.userId === userId);
    if (!isParticipant) {
        res.status(403).json({ message: "Forbidden" });
        return;
    }
    const updated = yield prisma.message.update({
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
});
exports.updateMessagePin = updateMessagePin;
const acknowledgeMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = extractAuthUser(req);
    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const { messageId } = req.params;
    const { status } = req.body;
    if (status !== client_1.MessageStatus.DELIVERED && status !== client_1.MessageStatus.READ) {
        res.status(400).json({ message: "Invalid status update." });
        return;
    }
    const safeStatus = status;
    const receipt = yield prisma.messageReceipt.upsert({
        where: {
            messageId_userId: {
                messageId: Number(messageId),
                userId,
            },
        },
        update: {
            status: safeStatus,
            readAt: safeStatus === client_1.MessageStatus.READ ? new Date() : undefined,
            deliveredAt: safeStatus === client_1.MessageStatus.DELIVERED || safeStatus === client_1.MessageStatus.READ
                ? new Date()
                : undefined,
        },
        create: {
            messageId: Number(messageId),
            userId,
            status: safeStatus,
            readAt: safeStatus === client_1.MessageStatus.READ ? new Date() : null,
            deliveredAt: new Date(),
        },
    });
    res.json({ receipt });
});
exports.acknowledgeMessage = acknowledgeMessage;
const getTeamMessages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = extractAuthUser(req);
    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const teamId = Number(req.params.teamId);
    const teamMember = yield prisma.teamMember.findFirst({
        where: { teamId, userId },
    });
    if (!teamMember) {
        res.status(403).json({ message: "Forbidden" });
        return;
    }
    const conversation = yield ensureTeamConversation(teamId, userId);
    yield prisma.conversationParticipant.upsert({
        where: { conversationId_userId: { conversationId: conversation.id, userId } },
        update: {},
        create: { conversationId: conversation.id, userId, role: client_1.ConversationRole.MEMBER },
    });
    const messages = yield prisma.message.findMany({
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
});
exports.getTeamMessages = getTeamMessages;
const deleteMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = extractAuthUser(req);
    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const messageId = Number(req.params.messageId);
    if (Number.isNaN(messageId)) {
        res.status(400).json({ message: "Invalid message id" });
        return;
    }
    const message = yield prisma.message.findUnique({
        where: { id: messageId },
        include: {
            conversation: {
                include: {
                    participants: {
                        where: { userId },
                    },
                },
            },
            team: {
                include: {
                    members: {
                        where: { userId },
                    },
                },
            },
        },
    });
    if (!message) {
        res.status(404).json({ message: "Message not found" });
        return;
    }
    const isSender = message.userId === userId;
    const teamMembership = message.teamId
        ? yield prisma.teamMember.findFirst({
            where: { teamId: message.teamId, userId },
        })
        : null;
    const conversationParticipant = message.conversationId
        ? yield prisma.conversationParticipant.findFirst({
            where: { conversationId: message.conversationId, userId },
        })
        : null;
    const isTeamManager = teamMembership &&
        (teamMembership.role === client_1.TeamMemberRole.OWNER ||
            teamMembership.role === client_1.TeamMemberRole.ADMIN);
    const isConversationManager = (conversationParticipant === null || conversationParticipant === void 0 ? void 0 : conversationParticipant.role) === client_1.ConversationRole.OWNER ||
        (conversationParticipant === null || conversationParticipant === void 0 ? void 0 : conversationParticipant.role) === client_1.ConversationRole.ADMIN;
    if (!isSender && !isTeamManager && !isConversationManager) {
        res.status(403).json({ message: "Forbidden" });
        return;
    }
    yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        yield tx.messageReceipt.deleteMany({ where: { messageId } });
        yield tx.messageAttachment.deleteMany({ where: { messageId } });
        yield tx.message.delete({ where: { id: messageId } });
    }));
    res.status(204).send();
});
exports.deleteMessage = deleteMessage;
