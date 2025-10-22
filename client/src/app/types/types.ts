export type ISODateString = string;

export enum TeamMemberRole {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
  VIEWER = "VIEWER",
}

export enum projectStatus {
  NOT_STARTED = "Not Started",
  PLANNING = "Planning",
  IN_PROGRESS = "In Progress",
  COMPLETED = "Completed",
}

export enum Priority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

export enum TaskStatus {
  TODO = "To Do",
  IN_PROGRESS = "In Progress",
  BLOCKED = "Blocked",
  UNDER_REVIEW = "Under Review",
  COMPLETED = "Completed",
}

export enum AssetVisibility {
  PRIVATE = "PRIVATE",
  PROJECT = "PROJECT",
  TEAM = "TEAM",
}

export enum MoodboardItemType {
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  NOTE = "NOTE",
  EMBED = "EMBED",
  COLOR = "COLOR",
}

export enum ScenarioBlockType {
  HEADING = "HEADING",
  ACTION = "ACTION",
  DIALOGUE = "DIALOGUE",
  NOTE = "NOTE",
}

export enum ConversationType {
  TEAM = "TEAM",
  GROUP = "GROUP",
  DIRECT = "DIRECT",
}

export enum ConversationRole {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
}

export enum MessageStatus {
  SENT = "SENT",
  DELIVERED = "DELIVERED",
  READ = "READ",
}

export enum ParticipantStatus {
  INVITED = "INVITED",
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
}

export interface User {
  userId: number;
  email: string;
  username: string;
  password?: string | null;
  googleId?: string | null;
  profilePictureUrl?: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  teams?: TeamMember[];
  attachments?: Attachment[];
  comments?: Comment[];
  assignedTasks?: Task[];
  authoredTasks?: Task[];
  taskAssignments?: TaskAssignment[];
}

export interface Team {
  id: number;
  teamName: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  members?: TeamMember[];
  projects?: Project[];
}

export interface TeamMember {
  id: number;
  userId: number;
  teamId: number;
  role: TeamMemberRole | string;
  joinedAt: ISODateString;
  user: User;
  team?: Team;
}

export interface ProjectType {
  id: number;
  key: string;
  nameEn: string;
  nameFa: string;
  descriptionEn?: string | null;
  descriptionFa?: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  workflows?: WorkflowTemplate[];
}

export type OnboardingStageDefinition = {
  titleEn: string;
  titleFa: string;
  ownerRole?: TeamMemberRole | string | null;
  order?: number | null;
  metadata?: Record<string, unknown> | null;
};

export interface WorkflowTemplate {
  id: number;
  key: string;
  nameEn: string;
  nameFa: string;
  descriptionEn?: string | null;
  descriptionFa?: string | null;
  projectTypeId?: number | null;
  stages: OnboardingStageDefinition[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
  projectType?: ProjectType | null;
}

export interface ProjectStage {
  id?: number;
  projectId?: number;
  titleEn: string;
  titleFa: string;
  order: number;
  ownerRole?: TeamMemberRole | string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ProjectParticipant {
  id?: number;
  projectId?: number;
  userId?: number | null;
  email?: string | null;
  role: TeamMemberRole | string;
  status?: ParticipantStatus | string;
  inviteToken?: string | null;
  invitedAt?: ISODateString;
  respondedAt?: ISODateString | null;
  user?: User | null;
}

export interface ProjectInvitation {
  id: number;
  projectId: number;
  email: string;
  role: TeamMemberRole | string;
  token: string;
  status: ParticipantStatus | string;
  expiresAt: ISODateString;
  createdAt: ISODateString;
  invitedById?: number | null;
}

export interface Project {
  id: number;
  name: string;
  description?: string | null;
  startDate?: ISODateString | null;
  endDate?: ISODateString | null;
  status: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  teamId: number;
  team?: Team;
  tasks?: Task[];
  bestCaseDuration?: number | null;
  worstCaseDuration?: number | null;
  expectedDuration?: number | null;
  projectTypeId?: number | null;
  workflowTemplateId?: number | null;
  projectType?: ProjectType | null;
  workflowTemplate?: WorkflowTemplate | null;
  participants?: ProjectParticipant[];
  stages?: ProjectStage[];
  metadata?: Record<string, unknown> | null;
  invitations?: {
    email: string;
    role: string;
    token: string;
    url: string;
  }[];
}

export interface Task {
  id: number;
  title: string;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  tags?: string | null;
  startDate?: ISODateString | null;
  dueDate?: ISODateString | null;
  points?: number | null;
  projectId: number;
  project?: Pick<Project, "id" | "name">;
  authorUserId: number;
  assignedUserId?: number | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  degree?: number | null;
  duration?: number | null;
  earliestStart?: number | null;
  earliestFinish?: number | null;
  latestStart?: number | null;
  latestFinish?: number | null;
  slack?: number | null;
  isCriticalPath?: boolean;
  attachments?: Attachment[];
  comments?: Comment[];
  taskAssignments?: TaskAssignment[];
  dependencies?: number[];
  dependents?: number[];
  author?: User;
  assignee?: User | null;
  metadata?: Record<string, unknown> | null;
}

export interface TaskDependency {
  id: number;
  dependentTaskId: number;
  prerequisiteTaskId: number;
  createdAt: ISODateString;
  dependentTask?: Task;
  prerequisiteTask?: Task;
}

export interface TaskAssignment {
  id: number;
  userId: number;
  taskId: number;
  task?: Task;
  user: User;
  role?: TeamMemberRole | string | null;
}

export interface Attachment {
  id: number;
  fileURL: string;
  fileName?: string | null;
  fileType?: string | null;
  taskId?: number | null;
  uploadedById?: number | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  task?: Task;
  uploadedBy?: User;
  metadata?: Record<string, unknown> | null;
}

export interface Comment {
  id: number;
  text: string;
  taskId: number;
  userId: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  task?: Task;
  user?: User;
}

export interface MessageReceipt {
  id?: number;
  messageId: number;
  userId: number;
  status: MessageStatus | string;
  readAt?: ISODateString | null;
  deliveredAt?: ISODateString | null;
}

export interface ChatAttachment {
  id?: number;
  fileURL: string;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface ChatMessage {
  id: number;
  text: string;
  status: MessageStatus | string;
  conversationId?: number | null;
  teamId?: number | null;
  senderId: number;
  sender: {
    id: number;
    username: string;
    profilePictureUrl?: string | null;
    role?: TeamMemberRole | string | null;
  };
  createdAt: ISODateString;
  updatedAt?: ISODateString | null;
  attachments?: ChatAttachment[];
  pinnedAt?: ISODateString | null;
  metadata?: Record<string, unknown> | null;
  receipts?: MessageReceipt[];
}

export interface Message {
  id: number;
  text: string;
  createdAt: ISODateString;
  senderId: number;
  senderName: string;
  senderAvatar?: string | null;
  teamId: number;
}

export interface ConversationParticipant {
  id: number;
  conversationId: number;
  userId: number;
  role: ConversationRole | string;
  joinedAt?: ISODateString | null;
  username?: string;
  user?: User | null;
}

export interface Conversation {
  id: number;
  type: ConversationType | string;
  teamId?: number | null;
  title?: string | null;
  titleFa?: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  participants: ConversationParticipant[];
  lastMessage?: ChatMessage | null;
  metadata?: Record<string, unknown> | null;
}

export interface AssetTag {
  id: number;
  teamId: number;
  key: string;
  labelEn: string;
  labelFa?: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  description?: string | null;
}

export interface AssetTagAssignment {
  id: number;
  assetId: number;
  tagId: number;
  tag: AssetTag;
}

export interface AssetFolder {
  id: number;
  name: string;
  description?: string | null;
  projectId: number;
  teamId?: number | null;
  parentId?: number | null;
  visibility: AssetVisibility | string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  children?: AssetFolder[];
  metadata?: Record<string, unknown> | null;
  permissions?: {
    canUpload?: boolean;
    canManage?: boolean;
    [key: string]: unknown;
  } | null;
  assetCount?: number | null;
}

export interface AssetAutoTagSuggestion {
  key: string;
  confidence?: number;
}

export interface Asset {
  id: number;
  folderId?: number | null;
  projectId: number;
  uploadedById?: number | null;
  name: string;
  description?: string | null;
  fileURL: string;
  previewURL?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  visibility: AssetVisibility | string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  folder?: AssetFolder | null;
  uploader?: User | null;
  tags?: AssetTagAssignment[];
  autoTags?: {
    suggestions?: AssetAutoTagSuggestion[];
    warnings?: string[];
  } | null;
  linkCount?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface AssetTagSummary {
  id: number;
  count: number;
  tag: AssetTag;
}

export interface Moodboard {
  id: number;
  projectId: number;
  title: string;
  description?: string | null;
  isShared?: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  metadata?: Record<string, unknown> | null;
  items?: MoodboardItem[];
}

export interface MoodboardItem {
  id: number;
  moodboardId: number;
  type: MoodboardItemType | string;
  contentURL?: string | null;
  thumbnailURL?: string | null;
  note?: string | null;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  metadata?: Record<string, unknown> | null;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
  createdById?: number | null;
}

export interface Storyboard {
  id: number;
  projectId: number;
  title: string;
  description?: string | null;
  createdById?: number | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  frames?: StoryboardFrame[];
  metadata?: Record<string, unknown> | null;
}

export interface StoryboardFrame {
  id: number;
  storyboardId: number;
  order: number;
  title?: string | null;
  description?: string | null;
  imageURL?: string | null;
  duration?: number | null;
  taskId?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface ScenarioDocument {
  id: number;
  projectId: number;
  title: string;
  summary?: string | null;
  content?: Record<string, unknown> | null;
  status: string;
  createdById: number;
  updatedById?: number | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  metadata?: Record<string, unknown> | null;
  blocks?: ScenarioBlock[];
}

export interface ScenarioBlock {
  id: number;
  scenarioId: number;
  order: number;
  type: ScenarioBlockType | string;
  heading?: string | null;
  body?: string | null;
  metadata?: Record<string, unknown> | null;
  linkedTaskId?: number | null;
  linkedFrameId?: number | null;
}

export interface MessageReceiptSummary {
  messageId: number;
  readBy: number[];
  deliveredTo: number[];
}

export interface ApiError {
  data?: { message?: string; error?: string };
  error?: string;
  status?: number;
}
