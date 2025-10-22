"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import clsx from "clsx";
import { uploadFile } from "@/lib/upload";
import {
  MessageSquarePlus,
  Paperclip,
  Send,
  Pin,
  PinOff,
  Trash2,
  Users,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useAppSelector } from "@/app/redux";
import {
  useGetUserTeamsQuery,
  useGetConversationsQuery,
  useCreateConversationMutation,
  useGetConversationMessagesQuery,
  usePostConversationMessageMutation,
  useGetTeamMessagesQuery,
  useUpdateMessagePinMutation,
  useGetUsersQuery,
  useAcknowledgeMessageMutation,
  useDeleteMessageMutation,
} from "@/state/api";
import {
  ChatMessage,
  Conversation,
  ConversationType,
  MessageStatus,
  TeamMemberRole,
} from "@/app/types/types";

type AttachmentDraft = {
  fileURL: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  thumbnailURL?: string;
  relativeUrl?: string;
};

type ActiveChat =
  | { mode: "conversation"; conversationId: number; teamId?: undefined }
  | { mode: "team"; teamId: number; conversationId?: number }
  | null;

const buildTimeFormatter = (locale: string) =>
  new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:9000";

const ChatPage = () => {
  const t = useTranslations("chat");
  const locale = useLocale();
  const currentUser = useAppSelector((state) => state.auth.user);
  const authToken = useAppSelector((state) => state.auth.token);
  const timeFormatter = useMemo(() => buildTimeFormatter(locale), [locale]);

  const { data: teamsData = [] } = useGetUserTeamsQuery();
  const { data: conversationsData, refetch: refetchConversations } =
    useGetConversationsQuery();
  const { data: users = [] } = useGetUsersQuery(undefined, {
    skip: !currentUser?.userId,
  });
  const [createConversation, { isLoading: isCreatingConversation }] =
    useCreateConversationMutation();
  const [postConversationMessage] = usePostConversationMessageMutation();
  const [updateMessagePin] = useUpdateMessagePinMutation();
  const [acknowledgeMessage] = useAcknowledgeMessageMutation();
  const [deleteMessageMutation] = useDeleteMessageMutation();

  const [activeChat, setActiveChat] = useState<ActiveChat>(null);
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const [draftMessage, setDraftMessage] = useState("");
  const [attachmentDrafts, setAttachmentDrafts] = useState<AttachmentDraft[]>([]);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [conversationType, setConversationType] = useState<ConversationType>(
    ConversationType.DIRECT,
  );
  const [directParticipant, setDirectParticipant] = useState("");
  const [groupParticipants, setGroupParticipants] = useState<number[]>([]);
  const [groupTitle, setGroupTitle] = useState("");
  const [deletingMessageId, setDeletingMessageId] = useState<number | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const activeChatRef = useRef<ActiveChat>(null);
  const teamConversationIdRef = useRef<number | null>(null);

  const conversations = conversationsData?.conversations ?? [];
  const userTeams = teamsData ?? [];
  const availableUsers = users.filter(
    (user) => user.userId !== currentUser?.userId,
  );

  const activeConversationId =
    activeChat?.mode === "conversation"
      ? activeChat.conversationId
      : activeChat?.conversationId ?? null;
  const activeTeamId = activeChat?.mode === "team" ? activeChat.teamId : null;

  const conversationMessagesQuery = useGetConversationMessagesQuery(
    { conversationId: activeConversationId ? String(activeConversationId) : "" },
    { skip: !activeChat || activeChat.mode !== "conversation" },
  );

  const teamMessagesQuery = useGetTeamMessagesQuery(
    { teamId: activeTeamId ? String(activeTeamId) : "" },
    { skip: !activeChat || activeChat.mode !== "team" },
  );

  const baseMessages = useMemo(() => {
    if (activeChat?.mode === "team") {
      return teamMessagesQuery.data?.messages ?? [];
    }
    if (activeChat?.mode === "conversation") {
      return conversationMessagesQuery.data?.messages ?? [];
    }
    return [];
  }, [activeChat, conversationMessagesQuery.data, teamMessagesQuery.data]);

  useEffect(() => {
    setLiveMessages(baseMessages);
  }, [baseMessages]);

  const activeTeamConversationId =
    activeChat?.mode === "team"
      ? teamMessagesQuery.data?.conversationId ?? null
      : null;

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    teamConversationIdRef.current = activeTeamConversationId;
  }, [activeTeamConversationId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [liveMessages, activeChat]);

  useEffect(() => {
    if (activeChat) return;
    if (conversations.length > 0) {
      setActiveChat({
        mode: "conversation",
        conversationId: conversations[0].id,
      });
    } else if (userTeams.length > 0) {
      setActiveChat({ mode: "team", teamId: userTeams[0].id });
    }
  }, [activeChat, conversations, userTeams]);

  useEffect(() => {
    if (!currentUser?.userId) return;

    const socket = io(WS_URL, {
      auth: { userId: currentUser.userId },
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on("newMessage", ({ conversationId, message }) => {
      const active = activeChatRef.current;
      const teamConversationId = teamConversationIdRef.current;
      if (
        active &&
        ((active.mode === "conversation" &&
          conversationId === active.conversationId) ||
          (active.mode === "team" &&
            conversationId &&
            teamConversationId &&
            conversationId === teamConversationId))
      ) {
        setLiveMessages((prev) => {
          const tempId =
            message.metadata && typeof message.metadata === "object"
              ? (message.metadata as Record<string, unknown>).clientTempId
              : undefined;
          const filtered = tempId
            ? prev.filter((existing) =>
                (existing.metadata as Record<string, unknown> | undefined)?.clientTempId !== tempId,
              )
            : prev;
          return [...filtered, message];
        });
      }
    });

    socket.on("messageStatusUpdated", ({ messageId, status }) => {
      setLiveMessages((prev) =>
        prev.map((message) =>
          message.id === messageId ? { ...message, status } : message,
        ),
      );
    });

    socket.on("teamConversationReady", ({ teamId, conversationId }) => {
      const active = activeChatRef.current;
      if (active?.mode === "team" && active.teamId === teamId) {
        setActiveChat({ mode: "team", teamId, conversationId });
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUser?.userId]);

  useEffect(() => {
    if (!currentUser?.userId) return;
    const unread = liveMessages.filter(
      (message) =>
        message.sender.id !== currentUser.userId &&
        message.status !== MessageStatus.READ,
    );
    unread.forEach((message) => {
      socketRef.current?.emit("updateMessageStatus", {
        messageId: message.id,
        status: MessageStatus.READ,
      });
      acknowledgeMessage({
        messageId: String(message.id),
        status: MessageStatus.READ,
      }).catch(() => undefined);
    });
  }, [liveMessages, currentUser?.userId, acknowledgeMessage]);

  const handleSendMessage = () => {
    if (!activeChat) return;
    const trimmed = draftMessage.trim();
    if (!trimmed && attachmentDrafts.length === 0) return;

    const clientTempId = `temp-${Date.now()}`;
    const normalizedAttachments = attachmentDrafts.map((attachment, index) => ({
      id: -(Date.now() + index),
      fileURL: attachment.fileURL,
      fileName: attachment.fileName,
      fileType: attachment.fileType,
      fileSize: attachment.fileSize,
      thumbnailURL: attachment.thumbnailURL,
    }));

    const payload = {
      conversationId:
        activeChat.mode === "conversation" ? activeChat.conversationId : undefined,
      teamId: activeChat.mode === "team" ? activeChat.teamId : undefined,
      content: trimmed,
      attachments: normalizedAttachments,
      metadata: { source: "web", clientTempId },
    };

    const optimisticMessage = {
      id: -Date.now(),
      text: trimmed,
      status: MessageStatus.SENT,
      conversationId: payload.conversationId ?? undefined,
      teamId: payload.teamId ?? undefined,
      senderId: currentUser?.userId ?? 0,
      sender: {
        id: currentUser?.userId ?? 0,
        username: currentUser?.username ?? "You",
        profilePictureUrl: currentUser?.profilePictureUrl ?? undefined,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: normalizedAttachments,
      metadata: { clientTempId },
    } as ChatMessage;

    const finalize = () => {
      setDraftMessage("");
      setAttachmentDrafts([]);
    };

    if (socketRef.current) {
      setLiveMessages((prev) => [...prev, optimisticMessage]);
      socketRef.current.emit("sendMessage", payload);
      finalize();
      return;
    }

    if (activeChat.mode === "conversation") {
      setLiveMessages((prev) => [...prev, optimisticMessage]);
      postConversationMessage({
        conversationId: String(activeChat.conversationId),
        text: trimmed,
        attachments: normalizedAttachments,
        metadata: { source: "web", clientTempId },
      }).catch(() => undefined);
      finalize();
      return;
    }

    finalize();
  };

  const handleToggleGroupParticipant = (userId: number) => {
    setGroupParticipants((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleAddAttachment = (draft: AttachmentDraft) => {
    setAttachmentDrafts((prev) => [...prev, draft]);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachmentDrafts((prev) => prev.filter((_, idx) => idx !== index));
  };

  const uploadAndAttachFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    for (const file of list) {
      try {
        const uploaded = await uploadFile(file, authToken);
        handleAddAttachment({
          fileURL: uploaded.url,
          fileName: uploaded.fileName ?? file.name,
          fileType: uploaded.fileType ?? file.type,
          fileSize: uploaded.fileSize ?? file.size,
          thumbnailURL: uploaded.thumbnailURL ?? undefined,
          relativeUrl: uploaded.relativeUrl,
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to upload attachment", error);
      }
    }
  };

  const handleUploadAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleSelectAttachmentFiles = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { files } = event.target;
    if (!files?.length) {
      return;
    }
    await uploadAndAttachFiles(files);
    event.target.value = "";
  };

  const handleDropAttachments = async (
    event: React.DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    const { files, items } = event.dataTransfer;
    if (files && files.length > 0) {
      await uploadAndAttachFiles(files);
      return;
    }
    if (items && items.length > 0) {
      const url = event.dataTransfer.getData("text/uri-list");
      if (url) {
        handleAddAttachment({ fileURL: url });
      }
    }
  };

  const handlePromptAttachment = () => {
    const url = window.prompt(t("composer.attachmentPrompt"));
    if (!url) return;
    handleAddAttachment({ fileURL: url });
  };

  const handlePinMessage = async (messageId: number) => {
    try {
      const response = await updateMessagePin({
        messageId: String(messageId),
      }).unwrap();
      const updated = response.message;
      setLiveMessages((prev) =>
        prev.map((message) =>
          message.id === updated.id
            ? { ...message, pinnedAt: updated.pinnedAt }
            : message,
        ),
      );
    } catch {
      // ignore
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (messageId <= 0) {
      return;
    }
    setDeletingMessageId(messageId);
    try {
      await deleteMessageMutation({
        messageId: String(messageId),
        teamId:
          activeChat?.mode === "team" ? String(activeChat.teamId) : undefined,
      }).unwrap();
      setLiveMessages((prev) =>
        prev.filter((message) => message.id !== messageId),
      );
      if (activeChat?.mode === "conversation") {
        conversationMessagesQuery.refetch();
      } else if (activeChat?.mode === "team") {
        teamMessagesQuery.refetch();
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to delete message", error);
    } finally {
      setDeletingMessageId(null);
    }
  };

  const handleCreateConversation = async () => {
    try {
      let participantIds: number[] = [];
      if (conversationType === ConversationType.DIRECT) {
        const id = Number(directParticipant);
        if (!id) return;
        participantIds = [id];
      } else {
        if (groupParticipants.length === 0) return;
        participantIds = groupParticipants;
      }

      const response = await createConversation({
        type: conversationType,
        title:
          conversationType === ConversationType.GROUP
            ? groupTitle || undefined
            : undefined,
        participantIds,
      }).unwrap();

      setShowNewConversation(false);
      setDirectParticipant("");
      setGroupParticipants([]);
      setGroupTitle("");
      await refetchConversations();
      setActiveChat({
        mode: "conversation",
        conversationId: response.conversation.id,
      });
    } catch {
      // ignore
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setActiveChat({ mode: "conversation", conversationId: conversation.id });
  };

  const handleSelectTeam = (teamId: number) => {
    setActiveChat({ mode: "team", teamId });
  };

  const pinnedMessage = liveMessages.find((message) => message.pinnedAt);

  const conversationTitle = (conversation: Conversation) => {
    if (conversation.title) {
      return locale === "fa" && conversation.titleFa
        ? conversation.titleFa
        : conversation.title;
    }
    if (conversation.type === ConversationType.DIRECT) {
      const other = conversation.participants.find(
        (participant) => participant.userId !== currentUser?.userId,
      );
      return other?.username ?? t("sidebar.unknownUser");
    }
    return t("sidebar.untitledGroup");
  };

  const conversationPreview = (conversation: Conversation) => {
    if (!conversation.lastMessage) return t("sidebar.emptyConversation");
    return conversation.lastMessage.text || t("sidebar.attachmentOnly");
  };

  const formatTime = (value: Date | string) =>
    timeFormatter.format(new Date(value));

  const activeConversation =
    activeChat?.mode === "conversation"
      ? conversations.find((conv) => conv.id === activeConversationId)
      : null;

  const activeTeam =
    activeChat?.mode === "team"
      ? userTeams.find((team) => team.id === activeTeamId)
      : null;

  const participantsToDisplay = useMemo<Array<{ id: number; name: string; role: string }>>(() => {
    if (activeConversation?.participants) {
      return activeConversation.participants.map((participant) => ({
        id: participant.userId,
        name: participant.username ?? t("sidebar.unknownUser"),
        role: participant.role ?? TeamMemberRole.MEMBER,
      }));
    }

    if (activeTeam?.members) {
      return activeTeam.members.map((member) => ({
        id: member.userId,
        name: member.user?.username ?? t("sidebar.unknownUser"),
        role: member.role ?? TeamMemberRole.MEMBER,
      }));
    }

    return [];
  }, [activeConversation, activeTeam]);

  return (
    <div className="grid h-screen w-full grid-cols-1 bg-white lg:grid-cols-[320px_auto_280px]">
      <aside className="border-b border-gray-200 bg-gray-50 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4">
          <h2 className="text-sm font-semibold text-gray-700">
            {t("sidebar.title")}
          </h2>
          <button
            type="button"
            onClick={() => setShowNewConversation((prev) => !prev)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 transition hover:bg-primary-50 hover:text-primary-600"
            aria-label={t("sidebar.newConversation")}
          >
            <MessageSquarePlus size={16} />
          </button>
        </div>

        {showNewConversation && (
          <div className="border-b border-gray-200 px-4 py-4 text-sm">
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
              <span>{t("composer.newConversation")}</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConversationType(ConversationType.DIRECT)}
                className={clsx(
                  "flex-1 rounded-md border px-2 py-1",
                  conversationType === ConversationType.DIRECT
                    ? "border-primary-500 bg-primary-50 text-primary-600"
                    : "border-gray-300 bg-white text-gray-600",
                )}
              >
                {t("composer.direct")}
              </button>
              <button
                type="button"
                onClick={() => setConversationType(ConversationType.GROUP)}
                className={clsx(
                  "flex-1 rounded-md border px-2 py-1",
                  conversationType === ConversationType.GROUP
                    ? "border-primary-500 bg-primary-50 text-primary-600"
                    : "border-gray-300 bg-white text-gray-600",
                )}
              >
                {t("composer.group")}
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {conversationType === ConversationType.DIRECT ? (
                <select
                  value={directParticipant}
                  onChange={(event) => setDirectParticipant(event.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="">{t("composer.selectPerson")}</option>
                  {availableUsers.map((user) => (
                    <option key={user.userId} value={user.userId}>
                      {user.username} · {user.email}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <input
                    value={groupTitle}
                    onChange={(event) => setGroupTitle(event.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder={t("composer.groupNamePlaceholder")}
                  />
                  <div className="max-h-40 overflow-y-auto rounded-md border border-gray-200">
                    {availableUsers.map((user) => (
                      <label
                        key={user.userId}
                        className="flex items-center gap-2 border-b border-gray-100 px-3 py-2 text-sm last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={groupParticipants.includes(user.userId)}
                          onChange={() => handleToggleGroupParticipant(user.userId)}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600"
                        />
                        <span>{user.username}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={handleCreateConversation}
                disabled={isCreatingConversation}
                className="inline-flex w-full items-center justify-center rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-primary-500 disabled:opacity-50"
              >
                {isCreatingConversation
                  ? t("composer.creating")
                  : t("composer.start")}
              </button>
            </div>
          </div>
        )}

        <div className="px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {t("sidebar.teams")}
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {userTeams.map((team) => (
              <li key={team.id}>
                <button
                  type="button"
                  onClick={() => handleSelectTeam(team.id)}
                  className={clsx(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 transition",
                    activeChat?.mode === "team" && activeChat.teamId === team.id
                      ? "bg-primary-50 text-primary-600"
                      : "text-gray-600 hover:bg-gray-100",
                  )}
                >
                  <span>{team.teamName}</span>
                  <Users size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-gray-200 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {t("sidebar.conversations")}
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                <button
                  type="button"
                  onClick={() => handleSelectConversation(conversation)}
                  className={clsx(
                    "flex w-full flex-col rounded-md px-3 py-2 text-left transition",
                    activeChat?.mode === "conversation" &&
                      activeChat.conversationId === conversation.id
                      ? "bg-primary-50 text-primary-600"
                      : "text-gray-600 hover:bg-gray-100",
                  )}
                >
                  <span className="font-medium">
                    {conversationTitle(conversation)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {conversationPreview(conversation)}
                  </span>
                </button>
              </li>
            ))}
            {conversations.length === 0 && (
              <li className="rounded-md bg-gray-100 px-3 py-2 text-xs text-gray-500">
                {t("sidebar.noConversation")}
              </li>
            )}
          </ul>
        </div>
      </aside>

      <main className="flex flex-col bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              {activeChat?.mode === "conversation"
                ? activeConversation
                  ? conversationTitle(activeConversation)
                  : t("sidebar.noConversation")
                : activeTeam
                ? activeTeam.teamName
                : t("sidebar.noTeam")}
            </h2>
            <p className="text-xs text-gray-500">
              {t("header.updatedAt")}{" "}
              {liveMessages.length
                ? formatTime(liveMessages[liveMessages.length - 1].createdAt)
                : t("header.justNow")}
            </p>
          </div>
        </div>

        {pinnedMessage && (
          <div className="mx-6 mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{t("pinned.title")}</span>
              <button
                type="button"
                onClick={() => handlePinMessage(pinnedMessage.id)}
                className="text-amber-600 transition hover:text-amber-800"
              >
                <PinOff size={16} />
              </button>
            </div>
            <p className="mt-1">{pinnedMessage.text}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="flex flex-col gap-3">
            {liveMessages.map((message) => {
              const isOwn = message.sender.id === currentUser?.userId;
              const showDelete = isOwn && message.id > 0;
              const isDeleting = deletingMessageId === message.id;
              return (
                <div
                  key={message.id}
                  className={clsx(
                    "flex",
                    isOwn ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={clsx(
                      "max-w-[70%] rounded-lg border px-4 py-3 shadow-sm",
                      isOwn
                        ? "border-primary-100 bg-primary-50"
                        : "border-gray-200 bg-white",
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between gap-3 text-xs text-gray-500">
                      <span className="font-semibold text-gray-600">
                        {message.sender.username}
                      </span>
                      <span>{formatTime(message.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-800">{message.text}</p>
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {message.attachments.map((attachment) => (
                          <a
                            key={attachment.id}
                            href={attachment.fileURL}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 hover:border-primary-200 hover:text-primary-600"
                          >
                            <Paperclip size={14} />
                            <span>{attachment.fileName ?? attachment.fileURL}</span>
                          </a>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">
                      <button
                        type="button"
                        onClick={() => handlePinMessage(message.id)}
                        disabled={message.id <= 0}
                        className="inline-flex items-center gap-1 text-gray-400 transition hover:text-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Pin size={12} />
                        {message.pinnedAt
                          ? t("message.unpin")
                          : t("message.pin")}
                      </button>
                      <div className="flex items-center gap-3">
                        {showDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(message.id)}
                            disabled={isDeleting}
                            className="inline-flex items-center gap-1 text-gray-400 transition hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Trash2 size={12} />
                            {t("message.delete")}
                          </button>
                        )}
                        <span>
                          {message.status === MessageStatus.READ
                            ? t("message.status.read")
                            : message.status === MessageStatus.DELIVERED
                            ? t("message.status.delivered")
                            : t("message.status.sent")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-4">
          {attachmentDrafts.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2 text-xs">
              {attachmentDrafts.map((attachment, index) => (
                <span
                  key={`${attachment.fileURL}-${index}`}
                  className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-gray-600"
                >
                  {attachment.fileName ?? attachment.fileURL}
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(index)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <div
            className="flex items-center gap-3 rounded-lg border border-gray-300 px-4 py-3"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDropAttachments}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleSelectAttachmentFiles}
            />
            <button
              type="button"
              onClick={handleUploadAttachmentClick}
              className="text-gray-500 transition hover:text-primary-600"
              aria-label={t("composer.addAttachment")}
            >
              <Paperclip size={18} />
            </button>
            <button
              type="button"
              onClick={handlePromptAttachment}
              className="text-xs font-medium text-gray-500 transition hover:text-primary-600"
            >
              {t("composer.addAttachment")}
            </button>
            <input
              value={draftMessage}
              onChange={(event) => setDraftMessage(event.target.value)}
              placeholder={t("composer.placeholder")}
              className="flex-1 border-none bg-transparent text-sm text-gray-700 focus:outline-none"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <button
              type="button"
              onClick={handleSendMessage}
              className="inline-flex items-center justify-center rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-primary-500 disabled:opacity-50"
              disabled={!draftMessage.trim() && attachmentDrafts.length === 0}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </main>

      <aside className="hidden flex-col border-l border-gray-200 bg-gray-50 px-5 py-4 lg:flex">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">
            {t("info.participants")}
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            {participantsToDisplay.length > 0 ? (
              participantsToDisplay.map((participant) => (
                <li
                  key={participant.id}
                  className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2"
                >
                  <span>{participant.name}</span>
                  <span className="text-xs text-gray-500">
                    {t(`roleLabelsShort.${participant.role}`)}
                  </span>
                </li>
              ))
            ) : (
              <li className="rounded-md bg-gray-100 px-3 py-2 text-xs text-gray-500">
                {t("info.noParticipants")}
              </li>
            )}
          </ul>
        </div>

        <div className="mt-6 rounded-lg border border-dashed border-primary-200 bg-primary-50/60 p-4 text-sm text-primary-800">
          <span className="inline-flex items-center rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-600">
            {t("ai.badge")}
          </span>
          <h4 className="mt-2 text-base font-semibold text-primary-900">
            {t("ai.title")}
          </h4>
          <p className="mt-1 text-sm text-primary-800">
            {t("ai.description")}
          </p>
        </div>
      </aside>
    </div>
  );
};

export default ChatPage;
