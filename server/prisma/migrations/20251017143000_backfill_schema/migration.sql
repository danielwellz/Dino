-- Ensure enums exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConversationType') THEN
        CREATE TYPE "ConversationType" AS ENUM ('TEAM', 'GROUP', 'DIRECT');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConversationRole') THEN
        CREATE TYPE "ConversationRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MessageStatus') THEN
        CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ParticipantStatus') THEN
        CREATE TYPE "ParticipantStatus" AS ENUM ('INVITED', 'ACCEPTED', 'DECLINED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AssetVisibility') THEN
        CREATE TYPE "AssetVisibility" AS ENUM ('PRIVATE', 'PROJECT', 'TEAM');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MoodboardItemType') THEN
        CREATE TYPE "MoodboardItemType" AS ENUM ('IMAGE', 'VIDEO', 'NOTE', 'EMBED', 'COLOR');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ScenarioBlockType') THEN
        CREATE TYPE "ScenarioBlockType" AS ENUM ('HEADING', 'ACTION', 'DIALOGUE', 'NOTE');
    END IF;
END;
$$;

-- Update Message table
ALTER TABLE "Message"
    ADD COLUMN IF NOT EXISTS "aiSynopsis" TEXT,
    ADD COLUMN IF NOT EXISTS "conversationId" INTEGER,
    ADD COLUMN IF NOT EXISTS "metadata" JSONB,
    ADD COLUMN IF NOT EXISTS "pinnedAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "pinnedById" INTEGER,
    ADD COLUMN IF NOT EXISTS "status" "MessageStatus" NOT NULL DEFAULT 'SENT',
    ADD COLUMN IF NOT EXISTS "type" "ConversationType" NOT NULL DEFAULT 'TEAM',
    ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Message"
    ALTER COLUMN "teamId" DROP NOT NULL,
    ALTER COLUMN "teamMemberId" DROP NOT NULL;

-- Drop obsolete FK/index if present
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Message_teamMemberId_fkey'
    ) THEN
        ALTER TABLE "Message" DROP CONSTRAINT "Message_teamMemberId_fkey";
    END IF;
END;
$$;

DROP INDEX IF EXISTS "Message_teamMemberId_idx";

-- Project table additions
ALTER TABLE "Project"
    ADD COLUMN IF NOT EXISTS "onboardingMetadata" JSONB,
    ADD COLUMN IF NOT EXISTS "onboardingStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    ADD COLUMN IF NOT EXISTS "projectTypeId" INTEGER,
    ADD COLUMN IF NOT EXISTS "workflowTemplateId" INTEGER;

-- MessageAttachment table
CREATE TABLE IF NOT EXISTS "MessageAttachment" (
    "id" SERIAL PRIMARY KEY,
    "messageId" INTEGER NOT NULL,
    "fileURL" TEXT NOT NULL,
    "thumbnailURL" TEXT,
    "fileName" TEXT,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- MessageReceipt table
CREATE TABLE IF NOT EXISTS "MessageReceipt" (
    "id" SERIAL PRIMARY KEY,
    "messageId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "MessageStatus" NOT NULL,
    "readAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3)
);

-- Conversation table
CREATE TABLE IF NOT EXISTS "Conversation" (
    "id" SERIAL PRIMARY KEY,
    "type" "ConversationType" NOT NULL,
    "title" TEXT,
    "titleFa" TEXT,
    "teamId" INTEGER,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aiContext" JSONB
);

-- ConversationParticipant table
CREATE TABLE IF NOT EXISTS "ConversationParticipant" (
    "id" SERIAL PRIMARY KEY,
    "conversationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" "ConversationRole" NOT NULL DEFAULT 'MEMBER',
    "lastReadAt" TIMESTAMP(3),
    "isMuted" BOOLEAN NOT NULL DEFAULT FALSE
);

-- ProjectType table
CREATE TABLE IF NOT EXISTS "ProjectType" (
    "id" SERIAL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameFa" TEXT NOT NULL,
    "descriptionEn" TEXT,
    "descriptionFa" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProjectType_key_key" ON "ProjectType"("key");

-- WorkflowTemplate table
CREATE TABLE IF NOT EXISTS "WorkflowTemplate" (
    "id" SERIAL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameFa" TEXT NOT NULL,
    "descriptionEn" TEXT,
    "descriptionFa" TEXT,
    "projectTypeId" INTEGER,
    "stages" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "WorkflowTemplate_key_key" ON "WorkflowTemplate"("key");

-- Asset Folder structures
CREATE TABLE IF NOT EXISTS "AssetFolder" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "projectId" INTEGER,
    "teamId" INTEGER,
    "parentId" INTEGER,
    "visibility" "AssetVisibility" NOT NULL DEFAULT 'TEAM',
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "AssetFolder_projectId_idx" ON "AssetFolder"("projectId");
CREATE INDEX IF NOT EXISTS "AssetFolder_teamId_idx" ON "AssetFolder"("teamId");
CREATE INDEX IF NOT EXISTS "AssetFolder_parentId_idx" ON "AssetFolder"("parentId");

CREATE TABLE IF NOT EXISTS "AssetFolderRolePolicy" (
    "id" SERIAL PRIMARY KEY,
    "folderId" INTEGER NOT NULL,
    "role" "TeamMemberRole" NOT NULL DEFAULT 'MEMBER',
    "canUpload" BOOLEAN NOT NULL DEFAULT TRUE,
    "canManage" BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX IF NOT EXISTS "AssetFolderRolePolicy_folderId_role_key"
    ON "AssetFolderRolePolicy"("folderId", "role");

-- Asset tables
CREATE TABLE IF NOT EXISTS "Asset" (
    "id" SERIAL PRIMARY KEY,
    "folderId" INTEGER,
    "projectId" INTEGER,
    "uploadedById" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fileURL" TEXT NOT NULL,
    "previewURL" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "visibility" "AssetVisibility" NOT NULL DEFAULT 'PROJECT',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Asset_projectId_idx" ON "Asset"("projectId");
CREATE INDEX IF NOT EXISTS "Asset_folderId_idx" ON "Asset"("folderId");

CREATE TABLE IF NOT EXISTS "AssetTag" (
    "id" SERIAL PRIMARY KEY,
    "teamId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelFa" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "AssetTag_teamId_key_key" ON "AssetTag"("teamId", "key");

CREATE TABLE IF NOT EXISTS "AssetTagAssignment" (
    "id" SERIAL PRIMARY KEY,
    "assetId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "AssetReference" (
    "id" SERIAL PRIMARY KEY,
    "assetId" INTEGER NOT NULL,
    "messageId" INTEGER,
    "taskId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Moodboard structures
CREATE TABLE IF NOT EXISTS "Moodboard" (
    "id" SERIAL PRIMARY KEY,
    "projectId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isShared" BOOLEAN NOT NULL DEFAULT FALSE,
    "metadata" JSONB,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "MoodboardItem" (
    "id" SERIAL PRIMARY KEY,
    "moodboardId" INTEGER NOT NULL,
    "type" "MoodboardItemType" NOT NULL,
    "contentURL" TEXT,
    "thumbnailURL" TEXT,
    "note" TEXT,
    "positionX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "positionY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "width" DOUBLE PRECISION NOT NULL DEFAULT 160,
    "height" DOUBLE PRECISION NOT NULL DEFAULT 160,
    "metadata" JSONB,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Storyboard/Scenario relationships
CREATE TABLE IF NOT EXISTS "Storyboard" (
    "id" SERIAL PRIMARY KEY,
    "projectId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "StoryboardFrame" (
    "id" SERIAL PRIMARY KEY,
    "storyboardId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "imageURL" TEXT,
    "duration" INTEGER,
    "taskId" INTEGER,
    "metadata" JSONB
);

CREATE UNIQUE INDEX IF NOT EXISTS "StoryboardFrame_storyboardId_order_key"
    ON "StoryboardFrame"("storyboardId", "order");

CREATE TABLE IF NOT EXISTS "ScenarioDocument" (
    "id" SERIAL PRIMARY KEY,
    "projectId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "content" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdById" INTEGER NOT NULL,
    "updatedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ScenarioBlock" (
    "id" SERIAL PRIMARY KEY,
    "scenarioId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "ScenarioBlockType" NOT NULL,
    "heading" TEXT,
    "body" TEXT,
    "metadata" JSONB,
    "linkedTaskId" INTEGER,
    "linkedFrameId" INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS "ScenarioBlock_scenarioId_order_key"
    ON "ScenarioBlock"("scenarioId", "order");

-- Additional tables for onboarding and references
CREATE TABLE IF NOT EXISTS "ProjectStage" (
    "id" SERIAL PRIMARY KEY,
    "projectId" INTEGER NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleFa" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "ownerRole" "TeamMemberRole",
    "metadata" JSONB
);

CREATE TABLE IF NOT EXISTS "ProjectParticipant" (
    "id" SERIAL PRIMARY KEY,
    "projectId" INTEGER NOT NULL,
    "userId" INTEGER,
    "email" TEXT,
    "role" "TeamMemberRole" NOT NULL DEFAULT 'MEMBER',
    "status" "ParticipantStatus" NOT NULL DEFAULT 'INVITED',
    "inviteToken" TEXT,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3)
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProjectParticipant_projectId_userId_key"
    ON "ProjectParticipant"("projectId", "userId");

CREATE UNIQUE INDEX IF NOT EXISTS "ProjectParticipant_projectId_email_key"
    ON "ProjectParticipant"("projectId", "email");

CREATE TABLE IF NOT EXISTS "ProjectInvitation" (
    "id" SERIAL PRIMARY KEY,
    "projectId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "role" "TeamMemberRole" NOT NULL DEFAULT 'MEMBER',
    "token" TEXT NOT NULL,
    "status" "ParticipantStatus" NOT NULL DEFAULT 'INVITED',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "invitedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProjectInvitation_token_key" ON "ProjectInvitation"("token");

-- Foreign keys
ALTER TABLE "Message"
    ADD CONSTRAINT "Message_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Message"
    ADD CONSTRAINT "Message_pinnedById_fkey"
    FOREIGN KEY ("pinnedById") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MessageAttachment"
    ADD CONSTRAINT "MessageAttachment_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MessageReceipt"
    ADD CONSTRAINT "MessageReceipt_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MessageReceipt"
    ADD CONSTRAINT "MessageReceipt_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Conversation"
    ADD CONSTRAINT "Conversation_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Conversation"
    ADD CONSTRAINT "Conversation_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Conversation"
    ADD CONSTRAINT "Conversation_title_teamId_key"
    UNIQUE ("teamId", "title");

ALTER TABLE "ConversationParticipant"
    ADD CONSTRAINT "ConversationParticipant_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConversationParticipant"
    ADD CONSTRAINT "ConversationParticipant_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConversationParticipant"
    ADD CONSTRAINT "ConversationParticipant_conversationId_userId_key"
    UNIQUE ("conversationId", "userId");

ALTER TABLE "WorkflowTemplate"
    ADD CONSTRAINT "WorkflowTemplate_projectTypeId_fkey"
    FOREIGN KEY ("projectTypeId") REFERENCES "ProjectType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Project"
    ADD CONSTRAINT "Project_projectTypeId_fkey"
    FOREIGN KEY ("projectTypeId") REFERENCES "ProjectType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Project"
    ADD CONSTRAINT "Project_workflowTemplateId_fkey"
    FOREIGN KEY ("workflowTemplateId") REFERENCES "WorkflowTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProjectStage"
    ADD CONSTRAINT "ProjectStage_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectParticipant"
    ADD CONSTRAINT "ProjectParticipant_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectParticipant"
    ADD CONSTRAINT "ProjectParticipant_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProjectInvitation"
    ADD CONSTRAINT "ProjectInvitation_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectInvitation"
    ADD CONSTRAINT "ProjectInvitation_invitedById_fkey"
    FOREIGN KEY ("invitedById") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AssetFolder"
    ADD CONSTRAINT "AssetFolder_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AssetFolder"
    ADD CONSTRAINT "AssetFolder_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssetFolder"
    ADD CONSTRAINT "AssetFolder_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssetFolder"
    ADD CONSTRAINT "AssetFolder_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "AssetFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AssetFolderRolePolicy"
    ADD CONSTRAINT "AssetFolderRolePolicy_folderId_fkey"
    FOREIGN KEY ("folderId") REFERENCES "AssetFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Asset"
    ADD CONSTRAINT "Asset_folderId_fkey"
    FOREIGN KEY ("folderId") REFERENCES "AssetFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Asset"
    ADD CONSTRAINT "Asset_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Asset"
    ADD CONSTRAINT "Asset_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssetTag"
    ADD CONSTRAINT "AssetTag_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssetTagAssignment"
    ADD CONSTRAINT "AssetTagAssignment_assetId_fkey"
    FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssetTagAssignment"
    ADD CONSTRAINT "AssetTagAssignment_tagId_fkey"
    FOREIGN KEY ("tagId") REFERENCES "AssetTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssetReference"
    ADD CONSTRAINT "AssetReference_assetId_fkey"
    FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssetReference"
    ADD CONSTRAINT "AssetReference_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AssetReference"
    ADD CONSTRAINT "AssetReference_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Moodboard"
    ADD CONSTRAINT "Moodboard_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Moodboard"
    ADD CONSTRAINT "Moodboard_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MoodboardItem"
    ADD CONSTRAINT "MoodboardItem_moodboardId_fkey"
    FOREIGN KEY ("moodboardId") REFERENCES "Moodboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MoodboardItem"
    ADD CONSTRAINT "MoodboardItem_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Storyboard"
    ADD CONSTRAINT "Storyboard_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Storyboard"
    ADD CONSTRAINT "Storyboard_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StoryboardFrame"
    ADD CONSTRAINT "StoryboardFrame_storyboardId_fkey"
    FOREIGN KEY ("storyboardId") REFERENCES "Storyboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StoryboardFrame"
    ADD CONSTRAINT "StoryboardFrame_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ScenarioDocument"
    ADD CONSTRAINT "ScenarioDocument_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScenarioDocument"
    ADD CONSTRAINT "ScenarioDocument_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScenarioDocument"
    ADD CONSTRAINT "ScenarioDocument_updatedById_fkey"
    FOREIGN KEY ("updatedById") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ScenarioBlock"
    ADD CONSTRAINT "ScenarioBlock_scenarioId_fkey"
    FOREIGN KEY ("scenarioId") REFERENCES "ScenarioDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScenarioBlock"
    ADD CONSTRAINT "ScenarioBlock_linkedTaskId_fkey"
    FOREIGN KEY ("linkedTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ScenarioBlock"
    ADD CONSTRAINT "ScenarioBlock_linkedFrameId_fkey"
    FOREIGN KEY ("linkedFrameId") REFERENCES "StoryboardFrame"("id") ON DELETE SET NULL ON UPDATE CASCADE;
