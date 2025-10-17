import {
  Comment,
  ChatMessage,
  Conversation,
  MessageStatus,
  Project,
  ProjectInvitation,
  ProjectParticipant,
  ProjectStage,
  ProjectType,
  MessageReceipt,
  AssetFolder,
  Asset,
  AssetTag,
  AssetVisibility,
  Moodboard,
  MoodboardItem,
  MoodboardItemType,
  Storyboard,
  StoryboardFrame,
  ScenarioDocument,
  ScenarioBlock,
  ScenarioBlockType,
  Task,
  TaskAssignment,
  TaskDependency,
  Team,
  TeamMember,
  User,
  WorkflowTemplate,
  OnboardingStageDefinition,
} from "@/app/types/types";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { logOut, setCredentials } from "./authSlice";
import { RootState } from "@/app/redux";
import dotenv from "dotenv";

type CreateProjectPayload = {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  projectTypeKey?: string;
  workflowTemplateKey?: string;
  stages?: {
    order: number;
    titleEn: string;
    titleFa: string;
    ownerRole?: string | null;
    metadata?: Record<string, unknown> | null;
  }[];
  participants?: ({ userId: number; role: string } | { email: string; role: string })[];
  sendInvites?: boolean;
  metadata?: Record<string, unknown> | null;
};

type CreateProjectResponse = {
  message?: string;
  project: Project;
  invitations?: {
    email: string;
    role: string;
    token: string;
    url: string;
  }[];
};

dotenv.config();

const resolveBaseUrl = () => {
  if (typeof window === "undefined") {
    return (
      process.env.NEXT_INTERNAL_API_BASE_URL ??
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      "http://localhost:8000"
    );
  }
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
};

const baseQuery = fetchBaseQuery({
  baseUrl: resolveBaseUrl(),
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
});
const baseQueryWithReauth = async (
  args: any,
  api: any,
  extraOptions: any
): Promise<any> => {
  // Perform the initial query
  let result = await baseQuery(args, api, extraOptions);

  // If the status is 403 (Forbidden), attempt to refresh the token
  if (result?.error?.status === 403) {
    console.log("sending refresh token");

    // Send the refresh token to get a new access token
    const refreshResult = await baseQuery(
      { url: "/api/refresh/token", method: "GET", credentials: "include" },
      api,
      extraOptions
    );

    if (refreshResult?.data) {
      // Assuming refreshResult.data contains the new token (and possibly other data)
      const newToken = (refreshResult?.data as { accessToken: string })
        ?.accessToken;
      const user = (api.getState() as RootState).auth.user;

      if (user && newToken) {
        // Dispatch the new token and user to update credentials
        api.dispatch(setCredentials({ user, token: newToken }));
      } else {
        // Handle the case where user or token is not available
        console.error("User or new token is missing");
        api.dispatch(logOut());
      }

      // Retry the original query with the new access token
      result = await baseQuery(args, api, extraOptions);
    } else {
      // If refreshing the token fails, log the user out
      api.dispatch(logOut());
    }
  }

  return result;
};

export const api = createApi({
  baseQuery: baseQueryWithReauth,
  reducerPath: "api",
  tagTypes: [
    "Projects",
    "ProjectMeta",
    "Tasks",
    "Teams",
    "Users",
    "Dependencies",
    "Messages",
    "Comments",
    "Conversations",
    "AssetFolders",
    "Assets",
    "AssetTags",
    "Moodboards",
    "Storyboards",
    "Scenarios",
  ],

  /**
   * Defines API endpoints for performing various operations related to teams, users, projects, and tasks.
   * Each endpoint is built using RTK Query's `build` object, which provides methods for creating queries and mutations.
   * Queries are used to fetch data and can provide or invalidate cache tags, while mutations are used to modify data and invalidate cache tags.
   */

  endpoints: (build) => ({
    getProjectOnboardingMeta: build.query<
      { projectTypes: ProjectType[] },
      void
    >({
      query: () => ({
        url: `/api/projects/meta`,
        method: "GET",
      }),
      providesTags: ["ProjectMeta"],
    }),
    getProjectOnboardingDetails: build.query<Project, { projectId: string }>({
      query: ({ projectId }) => ({
        url: `/api/projects/${projectId}/onboarding`,
        method: "GET",
      }),
      providesTags: (result, error, { projectId }) => [
        { type: "Projects", id: Number(projectId) },
      ],
    }),
    createProject: build.mutation<
      {
        message: string;
        project: Project;
        invitations: { email: string; role: string; token: string; url: string }[];
      },
      {
        name: string;
        description?: string;
        startDate?: string;
        endDate?: string;
        status?: string;
        projectTypeKey?: string;
        workflowTemplateKey?: string;
        workflowTemplateId?: number;
        stages?: OnboardingStageDefinition[];
        participants?: { userId?: number; email?: string; role?: string }[];
        sendInvites?: boolean;
        metadata?: Record<string, unknown>;
      }
    >({
      query: (body) => ({
        url: `/api/projects`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Projects"],
    }),
    createProjectInvitation: build.mutation<
      { invitation: ProjectInvitation; link: string },
      { projectId: string; email: string; role?: string; sendEmail?: boolean }
    >({
      query: ({ projectId, ...body }) => ({
        url: `/api/projects/${projectId}/invitations`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: "Projects", id: Number(projectId) },
      ],
    }),
    getConversations: build.query<{ conversations: Conversation[] }, void>({
      query: () => ({
        url: `/api/messages`,
        method: "GET",
      }),
      providesTags: ["Conversations"],
    }),
    createConversation: build.mutation<
      { conversation: Conversation },
      {
        type: Conversation["type"];
        title?: string;
        titleFa?: string;
        participantIds?: number[];
        teamId?: number;
      }
    >({
      query: (body) => ({
        url: `/api/messages`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Conversations"],
    }),
    getAssetFolders: build.query<
      {
        folders: AssetFolder[];
        summary: { totalFolders: number; totalAssets: number };
      },
      { projectId: string }
    >({
      query: ({ projectId }) => ({
        url: `/api/assets/folders`,
        method: "GET",
        params: { projectId },
      }),
      providesTags: (result, error, { projectId }) => {
        const baseTag = {
          type: "AssetFolders" as const,
          id: `LIST-${projectId}`,
        };
        if (!result) {
          return [baseTag];
        }

        const collectIds = (nodes: AssetFolder[]): number[] => {
          const stack = [...nodes];
          const ids: number[] = [];
          while (stack.length) {
            const node = stack.pop();
            if (!node) continue;
            ids.push(node.id);
            if (node.children?.length) {
              stack.push(...node.children);
            }
          }
          return ids;
        };

        return [
          ...collectIds(result.folders).map((id) => ({
            type: "AssetFolders" as const,
            id,
          })),
          baseTag,
        ];
      },
    }),
    createAssetFolder: build.mutation<
      { folder: AssetFolder },
      {
        projectId: number;
        name: string;
        description?: string;
        parentId?: number;
        visibility?: AssetVisibility;
      }
    >({
      query: (body) => ({
        url: `/api/assets/folders`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: "AssetFolders", id: `LIST-${projectId}` },
      ],
    }),
    getAssets: build.query<
      { assets: Asset[] },
      { projectId: string }
    >({
      query: ({ projectId }) => ({
        url: `/api/assets`,
        method: "GET",
        params: { projectId },
      }),
      providesTags: (result, error, { projectId }) =>
        result
          ? [
              ...result.assets.map(({ id }) => ({
                type: "Assets" as const,
                id,
              })),
              { type: "Assets" as const, id: `LIST-${projectId}` },
            ]
          : [{ type: "Assets" as const, id: `LIST-${projectId}` }],
    }),
    createAsset: build.mutation<
      {
        asset: Asset;
        ai: {
          status: string;
          suggestions: { key: string; confidence: number }[];
        };
      },
      {
        projectId: number;
        name: string;
        fileURL: string;
        description?: string;
        previewURL?: string;
        mimeType?: string;
        size?: number;
        folderId?: number;
        tags?: string[];
      }
    >({
      query: (body) => ({
        url: `/api/assets`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { projectId, folderId }) => {
        const tags = [
          { type: "Assets" as const, id: `LIST-${projectId}` },
          { type: "AssetFolders" as const, id: `LIST-${projectId}` },
        ];
        if (folderId) {
          tags.push({ type: "AssetFolders" as const, id: String(folderId) });
        }
        return tags;
      },
    }),
    getAssetTags: build.query<{ tags: AssetTag[] }, { teamId: string }>(
      {
        query: ({ teamId }) => ({
          url: `/api/assets/tags`,
          method: "GET",
          params: { teamId },
        }),
        providesTags: (result, error, { teamId }) =>
          result
            ? [
                ...result.tags.map(({ id }) => ({
                  type: "AssetTags" as const,
                  id,
                })),
                { type: "AssetTags" as const, id: `LIST-${teamId}` },
              ]
            : [{ type: "AssetTags" as const, id: `LIST-${teamId}` }],
      },
    ),
    createAssetTag: build.mutation<
      { tag: AssetTag },
      { key: string; labelEn: string; labelFa?: string; teamId: number }
    >({
      query: (body) => ({
        url: `/api/assets/tags`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { teamId }) => [
        { type: "AssetTags", id: `LIST-${teamId}` },
      ],
    }),    getConversationMessages: build.query<
      { messages: ChatMessage[] },
      { conversationId: string }
    >({
      query: ({ conversationId }) => ({
        url: `/api/messages/${conversationId}/messages`,
        method: "GET",
      }),
      providesTags: (result, error, { conversationId }) =>
        result
          ? [
              ...result.messages.map(({ id }) => ({
                type: "Messages" as const,
                id,
              })),
              { type: "Messages" as const, id: `LIST-${conversationId}` },
            ]
          : [{ type: "Messages" as const, id: `LIST-${conversationId}` }],
    }),
    postConversationMessage: build.mutation<
      { message: ChatMessage },
      {
        conversationId: string;
        text: string;
        attachments?: {
          fileURL: string;
          fileName?: string;
          fileType?: string;
          fileSize?: number;
          thumbnailURL?: string;
        }[];
        metadata?: Record<string, unknown>;
      }
    >({
      query: ({ conversationId, ...body }) => ({
        url: `/api/messages/${conversationId}/messages`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { conversationId }) => [
        { type: "Messages", id: `LIST-${conversationId}` },
      ],
    }),
    getMoodboards: build.query<{ moodboards: Moodboard[] }, { projectId: string }>(
      {
        query: ({ projectId }) => ({
          url: `/api/creative/moodboards`,
          method: "GET",
          params: { projectId },
        }),
        providesTags: (result, error, { projectId }) =>
          result
            ? [
                ...result.moodboards.map(({ id }) => ({
                  type: "Moodboards" as const,
                  id,
                })),
                { type: "Moodboards" as const, id: `LIST-${projectId}` },
              ]
            : [{ type: "Moodboards" as const, id: `LIST-${projectId}` }],
      },
    ),
    createMoodboard: build.mutation<
      { moodboard: Moodboard },
      { projectId: number; title: string; description?: string; isShared?: boolean }
    >({
      query: (body) => ({
        url: `/api/creative/moodboards`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: "Moodboards", id: `LIST-${projectId}` },
      ],
    }),
    addMoodboardItem: build.mutation<
      { item: MoodboardItem },
      {
        moodboardId: number;
        type: MoodboardItemType;
        contentURL?: string;
        thumbnailURL?: string;
        note?: string;
        positionX?: number;
        positionY?: number;
        width?: number;
        height?: number;
        metadata?: Record<string, unknown>;
      }
    >({
      query: ({ moodboardId, ...body }) => ({
        url: `/api/creative/moodboards/${moodboardId}/items`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result) =>
        result ? [{ type: "Moodboards", id: result.item.moodboardId }] : [],
    }),
    updateMoodboardItem: build.mutation<
      { item: MoodboardItem },
      {
        moodboardId: number;
        itemId: number;
        positionX?: number;
        positionY?: number;
        width?: number;
        height?: number;
        note?: string;
        metadata?: Record<string, unknown>;
      }
    >({
      query: ({ moodboardId, itemId, ...body }) => ({
        url: `/api/creative/moodboards/${moodboardId}/items/${itemId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result) =>
        result ? [{ type: "Moodboards", id: result.item.moodboardId }] : [],
    }),
    getStoryboards: build.query<{ storyboards: Storyboard[] }, { projectId: string }>(
      {
        query: ({ projectId }) => ({
          url: `/api/creative/storyboards`,
          method: "GET",
          params: { projectId },
        }),
        providesTags: (result, error, { projectId }) =>
          result
            ? [
                ...result.storyboards.map(({ id }) => ({
                  type: "Storyboards" as const,
                  id,
                })),
                { type: "Storyboards" as const, id: `LIST-${projectId}` },
              ]
            : [{ type: "Storyboards" as const, id: `LIST-${projectId}` }],
      },
    ),
    createStoryboard: build.mutation<
      { storyboard: Storyboard },
      { projectId: number; title: string; description?: string }
    >({
      query: (body) => ({
        url: `/api/creative/storyboards`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: "Storyboards", id: `LIST-${projectId}` },
      ],
    }),
    addStoryboardFrame: build.mutation<
      { frame: StoryboardFrame },
      {
        storyboardId: number;
        title?: string;
        description?: string;
        imageURL?: string;
        taskId?: number;
        duration?: number;
        metadata?: Record<string, unknown>;
      }
    >({
      query: ({ storyboardId, ...body }) => ({
        url: `/api/creative/storyboards/${storyboardId}/frames`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result) =>
        result ? [{ type: "Storyboards", id: result.frame.storyboardId }] : [],
    }),
    updateStoryboardFrame: build.mutation<
      { frame: StoryboardFrame },
      {
        storyboardId: number;
        frameId: number;
        order?: number;
        title?: string;
        description?: string;
        imageURL?: string;
        duration?: number;
        taskId?: number | null;
        metadata?: Record<string, unknown>;
      }
    >({
      query: ({ storyboardId, frameId, ...body }) => ({
        url: `/api/creative/storyboards/${storyboardId}/frames/${frameId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result) =>
        result ? [{ type: "Storyboards", id: result.frame.storyboardId }] : [],
    }),
    getScenarios: build.query<{ scenarios: ScenarioDocument[] }, { projectId: string }>(
      {
        query: ({ projectId }) => ({
          url: `/api/creative/scenarios`,
          method: "GET",
          params: { projectId },
        }),
        providesTags: (result, error, { projectId }) =>
          result
            ? [
                ...result.scenarios.map(({ id }) => ({
                  type: "Scenarios" as const,
                  id,
                })),
                { type: "Scenarios" as const, id: `LIST-${projectId}` },
              ]
            : [{ type: "Scenarios" as const, id: `LIST-${projectId}` }],
      },
    ),
    createScenario: build.mutation<
      { scenario: ScenarioDocument },
      { projectId: number; title: string; summary?: string }
    >({
      query: (body) => ({
        url: `/api/creative/scenarios`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: "Scenarios", id: `LIST-${projectId}` },
      ],
    }),
    addScenarioBlock: build.mutation<
      { block: ScenarioBlock },
      {
        scenarioId: number;
        type: ScenarioBlockType;
        heading?: string;
        body?: string;
        linkedTaskId?: number;
        linkedFrameId?: number;
        metadata?: Record<string, unknown>;
      }
    >({
      query: ({ scenarioId, ...body }) => ({
        url: `/api/creative/scenarios/${scenarioId}/blocks`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result) =>
        result ? [{ type: "Scenarios", id: result.block.scenarioId }] : [],
    }),
    updateScenarioBlock: build.mutation<
      { block: ScenarioBlock },
      {
        scenarioId: number;
        blockId: number;
        heading?: string;
        body?: string;
        linkedTaskId?: number | null;
        linkedFrameId?: number | null;
        metadata?: Record<string, unknown>;
      }
    >({
      query: ({ scenarioId, blockId, ...body }) => ({
        url: `/api/creative/scenarios/${scenarioId}/blocks/${blockId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result) =>
        result ? [{ type: "Scenarios", id: result.block.scenarioId }] : [],
    }),
    updateMessagePin: build.mutation<
      { message: ChatMessage },
      { messageId: string }
    >({
      query: ({ messageId }) => ({
        url: `/api/messages/messages/${messageId}/pin`,
        method: "POST",
      }),
      invalidatesTags: (result) =>
        result ? [{ type: "Messages", id: result.message.id }] : [],
    }),
    acknowledgeMessage: build.mutation<
      { receipt: MessageReceipt },
      { messageId: string; status: MessageStatus }
    >({
      query: ({ messageId, status }) => ({
        url: `/api/messages/messages/${messageId}/receipt`,
        method: "POST",
        body: { status },
      }),
    }),
    // get team messages
    getTeamMessages: build.query<
      { conversationId: number; messages: ChatMessage[] },
      { teamId: string }
    >({
      query: ({ teamId }) => ({
        url: `/api/messages/team/${teamId}`,
        method: "GET",
      }),
      providesTags: (result, error, { teamId }) =>
        result
          ? [
              ...result.messages.map(({ id }) => ({
                type: "Messages" as const,
                id,
              })),
              { type: "Messages" as const, id: `LIST-${teamId}` },
            ]
          : [{ type: "Messages" as const, id: `LIST-${teamId}` }],
    }),
    // remove user from task
    removeUserFromTask: build.mutation<
      TaskAssignment,
      { taskId: string; userId: string }
    >({
      query: ({ taskId, userId }) => ({
        url: `/api/tasks/${taskId}/users/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: (Result) => [{ type: "Tasks", id: Result?.taskId }],
    }),
    // assign user to task
    assignUserToTask: build.mutation<
      TaskAssignment,
      { taskId: string; userId: string }
    >({
      query: ({ taskId, userId }) => ({
        url: `/api/tasks/assign/task`,
        method: "POST",
        body: { taskId, userId },
      }),
      invalidatesTags: ["Tasks", "Users"],
    }),
    // get task assignees
    getTaskAssignees: build.query<TeamMember[], { taskId: string }>({
      query: ({ taskId }) => ({
        url: `/api/tasks/${taskId}/assignees`,
        method: "GET",
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ userId }) => ({
                type: "Users" as const,
                userId,
              })),
              { type: "Users" as const, id: "LIST" },
            ]
          : [{ type: "Users" as const, id: "LIST" }],
    }),

    // get project team members
    getProjectTeamMembers: build.query<TeamMember[], { projectId: string }>({
      query: ({ projectId }) => ({
        url: `/api/projects/${projectId}/team`,
        method: "GET",
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ userId }) => ({
                type: "Users" as const,
                userId,
              })),
              { type: "Users" as const, id: "LIST" },
            ]
          : [{ type: "Users" as const, id: "LIST" }],
    }),
    // update team member role
    updateTeamMemberRole: build.mutation<
      User,
      { teamId: string; userId: string; newRole: string }
    >({
      query: ({ teamId, userId, newRole }) => ({
        url: `/api/teams/${teamId}/members/${userId}/role`,
        method: "PATCH",
        body: { newRole },
      }),
      invalidatesTags: ["Teams"],
    }),
    // remove team member
    removeTeamMember: build.mutation<User, { teamId: string; userId: string }>({
      query: ({ teamId, userId }) => ({
        url: `/api/teams/${teamId}/members/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Teams"],
    }),
    // get user teams and team members
    getUserTeams: build.query<Team[], void>({
      query: () => ({
        url: "/api/teams",
        method: "GET",
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Teams" as const, id })),
              { type: "Teams" as const, id: "LIST" },
            ]
          : [{ type: "Teams" as const, id: "LIST" }],
    }),
    // add team member to project team
    addTeamMember: build.mutation<
      User,
      { teamId: string; userId: string; role?: string }
    >({
      query: ({ teamId, userId, role }) => ({
        url: "/api/teams/members",
        method: "POST",
        body: { teamId, userId, role },
      }),
      invalidatesTags: ["Teams"],
    }),
    // signup user
    signUpUser: build.mutation<
      { token: string; user: User },
      { username: string; email: string; password: string }
    >({
      query: ({ username, email, password }) => ({
        url: "/api/auth/signup",
        method: "POST",
        body: { username, email, password },
        invalidatesTags: ["Users"],
      }),
    }),

    // login user
    login: build.mutation<
      { token: string; user: User },
      { email: string; password: string }
    >({
      query: ({ email, password }) => ({
        url: "/api/auth/login",
        method: "POST",
        body: { email, password },
      }),
    }),

    // get all users
    getUsers: build.query<User[], void>({
      query: () => ({
        url: "/api/users",
        method: "GET",
        providesTags: ["Users"],
      }),
    }),

    // logout user
    logout: build.mutation<void, void>({
      query: () => ({
        url: "/api/auth/logout",
        method: "POST",
      }),
      invalidatesTags: ["Projects", "Tasks"],
    }),
    // get authenticated user
    getAuthenticatedUser: build.query<{ token: string; user: User }, void>({
      query: () => ({
        url: "/api/users/authenticated",
        method: "POST",
      }),
    }),
    // Get all projects
    getProjects: build.query<Project[], void>({
      query: () => "/api/projects",
      providesTags: ["Projects"],
    }),
    // Get a project by id
    getProjectById: build.query<Project, { projectId: string }>({
      query: ({ projectId }) => ({
        url: `/api/projects/${projectId}`,
        method: "GET",
      }),
      providesTags: ["Projects"],
    }),
    // Delete a project
    deleteProject: build.mutation<Project, { projectId: string }>({
      query: ({ projectId }) => ({
        url: `/api/projects/${projectId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Projects"],
    }),

    // get user tasks
    getUserTasks: build.query<Task[], void>({
      query: () => ({
        url: "/api/tasks/",
        method: "GET",
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Tasks" as const, id })),
              { type: "Tasks" as const, id: "LIST" },
            ]
          : [{ type: "Tasks" as const, id: "LIST" }],
    }),

    // Get tasks for a project
    getProjectTasks: build.query<Task[], { projectId: string }>({
      query: ({ projectId }) => ({
        url: `/api/tasks/${projectId}`,
        method: "GET",
      }),
      providesTags: (result, error, { projectId }) =>
        // if you have an array of tasks, tag them all plus the â€œLISTâ€ for this project
        result
          ? [
              ...result.map((t) => ({ type: "Tasks" as const, id: t.id })),
              { type: "Tasks" as const, id: `LIST-${projectId}` },
            ]
          : [{ type: "Tasks" as const, id: `LIST-${projectId}` }],
    }),
    // Create a new task for a project
    createTask: build.mutation<Task, Partial<Task>>({
      query: (task) => ({
        url: `/api/tasks/${task.projectId}`,
        method: "POST",
        body: task,
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: "Tasks" as const, id: `LIST-${projectId}` },
        ...(result ? [{ type: "Tasks" as const, id: result.id }] : []),
      ],
    }),
    // Update task status for a project
    updateTaskStatus: build.mutation<Task, { taskId: string; status: string }>({
      query: ({ taskId, status }) => ({
        url: `/api/tasks/${taskId}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: (result, error, { taskId }) => [
        { type: "Tasks", id: taskId },
      ],
    }),
    // Delete a task
    deleteTask: build.mutation<Task, { taskId: string; projectId: string }>({
      query: ({ taskId, projectId }) => ({
        url: `/api/tasks/${taskId}`,
        method: "DELETE",
        body: { projectId },
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: "Tasks", id: `LIST-${projectId}` },
      ],
    }),
    // Get project tasks dependencies
    getProjectDependencies: build.query<
      TaskDependency[],
      { projectId: string }
    >({
      query: ({ projectId }) => ({
        url: `/api/projects/${projectId}/tasks/dependencies`,
        method: "GET",
      }),
      providesTags: ["Dependencies"],
    }),

    // add comment to task
  addCommentToTask: build.mutation<void, { taskId: string; content: string }>({
  query: ({ taskId, content }) => ({
    url: `/api/tasks/${taskId}/comment`,
    method: "POST",
    body: { content },
  }),
  invalidatesTags: (result, error, { taskId }) => [
    { type: "Comments", id: taskId }, // âœ… triggers refetch of getTaskComments
  ],
}),

  // get task comments
  getTaskComments: build.query<Comment[], { taskId: string }>({
  query: ({ taskId }) => ({
    url: `/api/tasks/${taskId}/comments`,
    method: "GET",
  }),
  providesTags: (result, error, { taskId }) =>
    result
      ? [
          ...result.map((c) => ({ type: "Comments" as const, id: c.id })),
          { type: "Comments" as const, id: taskId },
        ]
      : [{ type: "Comments" as const, id: taskId }],
}),

    // Reschedule task and its dependents
    rescheduleTask: build.mutation<void,{ projectId: string; taskId: string; newStartDate: string; newDueDate: string }>({
  query: ({ projectId,taskId, newStartDate, newDueDate }) => ({
    url: `/api/tasks/${taskId}/reschedule`,
    method: "POST",
    body: { projectId,newStartDate, newDueDate },
  }),
  // invalidate both the project list and this specific task
  invalidatesTags: (result, error, { projectId, taskId }) => [
    { type: "Tasks", id: `LIST-${projectId}` },
    { type: "Tasks", id: taskId },
  ],}),

  // add task dependency
  addTaskDependency: build.mutation<TaskDependency, { taskId: string; source: string; target: string }>({
    query: ({ taskId, source, target }) => ({
      url: `/api/tasks/${taskId}/dependency`,
      method: "POST",
      body: { source, target },
    }),
    invalidatesTags: (result, error, { taskId }) => [
      { type: "Tasks", id: taskId },
      { type: "Dependencies", id: `LIST-${taskId}` },
    ],
  }),
  }),
  
});

export const {
  useAddTaskDependencyMutation,
  useGetTaskCommentsQuery,
  useAddCommentToTaskMutation,
  useRescheduleTaskMutation,
  useGetTeamMessagesQuery,
  useGetTaskAssigneesQuery,
  useAssignUserToTaskMutation,
  useRemoveUserFromTaskMutation,
  useGetProjectTeamMembersQuery,
  useUpdateTeamMemberRoleMutation,
  useRemoveTeamMemberMutation,
  useAddTeamMemberMutation,
  useGetUsersQuery,
  useGetUserTeamsQuery,
  useGetUserTasksQuery,
  useGetProjectsQuery,
  useCreateProjectMutation,
  useGetProjectOnboardingMetaQuery,
  useGetProjectOnboardingDetailsQuery,
  useCreateProjectInvitationMutation,
  useGetAssetFoldersQuery,
  useCreateAssetFolderMutation,
  useGetAssetsQuery,
  useCreateAssetMutation,
  useGetAssetTagsQuery,
  useCreateAssetTagMutation,
  useGetMoodboardsQuery,
  useCreateMoodboardMutation,
  useAddMoodboardItemMutation,
  useUpdateMoodboardItemMutation,
  useGetStoryboardsQuery,
  useCreateStoryboardMutation,
  useAddStoryboardFrameMutation,
  useUpdateStoryboardFrameMutation,
  useGetScenariosQuery,
  useCreateScenarioMutation,
  useAddScenarioBlockMutation,
  useUpdateScenarioBlockMutation,
  useGetProjectTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskStatusMutation,
  useGetProjectByIdQuery,
  useDeleteTaskMutation,
  useDeleteProjectMutation,
  useGetProjectDependenciesQuery,
  useLogoutMutation,
  useLoginMutation,
  useGetAuthenticatedUserQuery,
  useSignUpUserMutation,
  useGetConversationsQuery,
  useCreateConversationMutation,
  useGetConversationMessagesQuery,
  usePostConversationMessageMutation,
  useUpdateMessagePinMutation,
  useAcknowledgeMessageMutation,
} = api;




