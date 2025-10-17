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
exports.initMessageSocket = initMessageSocket;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const joinConversationRoom = (socket, conversationId) => {
    socket.join(`conversation_${conversationId}`);
};
const leaveConversationRoom = (socket, conversationId) => {
    socket.leave(`conversation_${conversationId}`);
};
const ensureTeamConversation = (teamId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const existing = yield prisma.conversation.findFirst({
        where: {
            teamId,
            type: client_1.ConversationType.TEAM,
        },
    });
    if (existing) {
        return existing.id;
    }
    const created = yield prisma.conversation.create({
        data: {
            teamId,
            type: client_1.ConversationType.TEAM,
            createdById: userId,
            title: "Team Space",
            titleFa: "فضای تیم",
        },
    });
    return created.id;
});
function initMessageSocket(io) {
    io.on("connection", (socket) => {
        const userId = Number(socket.handshake.auth.userId);
        if (!userId) {
            socket.disconnect();
            return;
        }
        socket.on("joinConversation", (conversationId) => __awaiter(this, void 0, void 0, function* () {
            const participant = yield prisma.conversationParticipant.findFirst({
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
        }));
        socket.on("leaveConversation", (conversationId) => {
            leaveConversationRoom(socket, conversationId);
        });
        socket.on("joinTeam", (teamId) => __awaiter(this, void 0, void 0, function* () {
            const membership = yield prisma.teamMember.findFirst({
                where: { teamId, userId },
                include: { team: true },
            });
            if (!membership) {
                socket.emit("error", { message: "Not a member of this team." });
                return;
            }
            const conversationId = yield ensureTeamConversation(teamId, userId);
            joinConversationRoom(socket, conversationId);
            socket.emit("teamConversationReady", {
                teamId,
                conversationId,
            });
        }));
        socket.on("sendMessage", (payload) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { conversationId: providedConversationId, teamId, content, attachments = [], metadata = {}, } = payload;
                let conversationId = providedConversationId;
                if (!conversationId && teamId) {
                    const teamMembership = yield prisma.teamMember.findFirst({
                        where: { teamId, userId },
                    });
                    if (!teamMembership) {
                        throw new Error("User is not a member of this team");
                    }
                    conversationId = yield ensureTeamConversation(teamId, userId);
                }
                if (!conversationId) {
                    throw new Error("Conversation ID is required.");
                }
                const participant = yield prisma.conversationParticipant.findFirst({
                    where: {
                        conversationId,
                        userId,
                    },
                });
                if (!participant) {
                    throw new Error("User is not a participant of this conversation");
                }
                const metadataPayload = metadata;
                const message = yield prisma.message.create({
                    data: {
                        text: content,
                        userId,
                        conversationId,
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
                        metadata: (_a = message.metadata) !== null && _a !== void 0 ? _a : {},
                    },
                });
            }
            catch (error) {
                socket.emit("error", {
                    message: error instanceof Error ? error.message : "Failed to send message",
                });
            }
        }));
        socket.on("updateMessageStatus", (payload) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { messageId, status } = payload;
                if (status !== client_1.MessageStatus.DELIVERED && status !== client_1.MessageStatus.READ) {
                    throw new Error("Unsupported status update");
                }
                const safeStatus = status;
                const message = yield prisma.message.findUnique({
                    where: { id: messageId },
                    include: { conversation: true },
                });
                if (!message || !message.conversationId) {
                    throw new Error("Message not found");
                }
                yield prisma.messageReceipt.upsert({
                    where: {
                        messageId_userId: {
                            messageId,
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
                        messageId,
                        userId,
                        status: safeStatus,
                        readAt: safeStatus === client_1.MessageStatus.READ ? new Date() : null,
                        deliveredAt: new Date(),
                    },
                });
                io.to(`conversation_${message.conversationId}`).emit("messageStatusUpdated", {
                    messageId,
                    userId,
                    status: safeStatus,
                });
            }
            catch (error) {
                socket.emit("error", {
                    message: error instanceof Error ? error.message : "Failed to update message status",
                });
            }
        }));
        socket.on("disconnect", () => {
            // noop but available for logging/debugging if needed
        });
    });
}
