import {
  MoodboardItemType,
  Prisma,
  PrismaClient,
  ScenarioBlockType,
} from "@prisma/client";
import { Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";

const prisma = new PrismaClient();

const extractUserId = (req: Request) => {
  const token = req.headers.authorization?.split(" ")[1];
  const decoded = verifyAccessToken(token as string);
  if (!decoded) {
    return null;
  }
  return Number(decoded.userId);
};

const ensureProjectMember = async (projectId: number, userId: number) => {
  return prisma.teamMember.findFirst({
    where: {
      team: {
        projects: { some: { id: projectId } },
      },
      userId,
    },
  });
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const mergeJsonValue = (
  existing: Prisma.JsonValue | null | undefined,
  incoming?: Record<string, unknown>,
): Prisma.InputJsonValue | undefined => {
  if (incoming == null) {
    return undefined;
  }
  const base = isRecord(existing) ? existing : {};
  return { ...base, ...incoming } as Prisma.InputJsonValue;
};

const ensureMoodboardItemType = (value: string): MoodboardItemType | null =>
  Object.values(MoodboardItemType).includes(value as MoodboardItemType)
    ? (value as MoodboardItemType)
    : null;

const ensureScenarioBlockType = (value: string): ScenarioBlockType | null =>
  Object.values(ScenarioBlockType).includes(value as ScenarioBlockType)
    ? (value as ScenarioBlockType)
    : null;

export const listMoodboards = async (req: Request, res: Response) => {
  const userId = extractUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const projectId = Number(req.query.projectId);
  if (!projectId) {
    res.status(400).json({ message: "projectId is required" });
    return;
  }

  const membership = await ensureProjectMember(projectId, userId);
  if (!membership) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const moodboards = await prisma.moodboard.findMany({
    where: { projectId },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({ moodboards });
};

export const createMoodboard = async (req: Request, res: Response) => {
  const userId = extractUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { projectId, title, description, isShared = true } = req.body as {
    projectId: number;
    title: string;
    description?: string;
    isShared?: boolean;
  };

  if (!projectId || !title) {
    res.status(400).json({ message: "projectId and title are required" });
    return;
  }

  const membership = await ensureProjectMember(projectId, userId);
  if (!membership) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const moodboard = await prisma.moodboard.create({
    data: {
      title,
      description,
      projectId,
      createdById: userId,
      isShared,
    },
  });

  res.status(201).json({ moodboard });
};

export const addMoodboardItem = async (req: Request, res: Response) => {
  const userId = extractUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { moodboardId } = req.params;
  const {
    type,
    contentURL,
    thumbnailURL,
    note,
    positionX,
    positionY,
    width,
    height,
    metadata,
  } =
    req.body as {
      type: string;
      contentURL?: string;
      thumbnailURL?: string;
      note?: string;
      positionX?: number;
      positionY?: number;
      width?: number;
      height?: number;
      metadata?: Record<string, unknown>;
    };

  const moodboard = await prisma.moodboard.findUnique({
    where: { id: Number(moodboardId) },
  });

  if (!moodboard) {
    res.status(404).json({ message: "Moodboard not found" });
    return;
  }

  const membership = await ensureProjectMember(moodboard.projectId, userId);
  if (!membership) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const itemType = ensureMoodboardItemType(type);
  if (!itemType) {
    res.status(400).json({ message: "Invalid moodboard item type." });
    return;
  }

  const itemMetadata = (
    metadata ?? { paletteHint: "AI palette suggestions coming soon." }
  ) as Prisma.InputJsonValue;

  const item = await prisma.moodboardItem.create({
    data: {
      moodboardId: moodboard.id,
      type: itemType,
      contentURL,
      thumbnailURL,
      note,
      positionX: positionX ?? 0,
      positionY: positionY ?? 0,
      createdById: userId,
      width: width ?? 160,
      height: height ?? 160,
      metadata: itemMetadata,
    },
  });

  if (item.type === MoodboardItemType.IMAGE && item.contentURL) {
    const existingAsset = await prisma.asset.findFirst({
      where: {
        projectId: moodboard.projectId,
        fileURL: item.contentURL,
      },
    });

    if (!existingAsset) {
      const metadataRecord = isRecord(item.metadata) ? item.metadata : {};
      const assetName =
        typeof metadataRecord.fileName === "string"
          ? metadataRecord.fileName
          : `Moodboard asset ${item.id}`;
      const assetMime =
        typeof metadataRecord.fileType === "string"
          ? metadataRecord.fileType
          : null;
      const assetSize =
        typeof metadataRecord.fileSize === "number"
          ? Math.round(metadataRecord.fileSize)
          : null;
      const relativeUrl =
        typeof metadataRecord.relativeUrl === "string"
          ? metadataRecord.relativeUrl
          : null;

      await prisma.asset.create({
        data: {
          name: assetName,
          description: "Imported from moodboard upload",
          fileURL: item.contentURL,
          previewURL: item.thumbnailURL ?? item.contentURL,
          mimeType: assetMime ?? undefined,
          size: assetSize ?? undefined,
          projectId: moodboard.projectId,
          uploadedById: userId,
          metadata: {
            source: "moodboard",
            moodboardId: moodboard.id,
            moodboardItemId: item.id,
            relativeUrl,
          } as Prisma.InputJsonValue,
        },
      });
    }
  }

  res.status(201).json({ item });
};

export const updateMoodboardItem = async (req: Request, res: Response) => {
  const userId = extractUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { moodboardId, itemId } = req.params;
  const {
    positionX,
    positionY,
    width,
    height,
    note,
    metadata,
  } = req.body as {
    positionX?: number;
    positionY?: number;
    width?: number;
    height?: number;
    note?: string;
    metadata?: Record<string, unknown>;
  };

  const moodboard = await prisma.moodboard.findUnique({
    where: { id: Number(moodboardId) },
    include: { project: true },
  });

  if (!moodboard) {
    res.status(404).json({ message: "Moodboard not found" });
    return;
  }

  const membership = await ensureProjectMember(moodboard.projectId, userId);
  if (!membership) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const item = await prisma.moodboardItem.findUnique({
    where: { id: Number(itemId) },
  });

  if (!item || item.moodboardId !== moodboard.id) {
    res.status(404).json({ message: "Moodboard item not found" });
    return;
  }

  const updatedMetadata = mergeJsonValue(item.metadata, metadata);

  const updatedItem = await prisma.moodboardItem.update({
    where: { id: item.id },
    data: {
      positionX: positionX ?? item.positionX,
      positionY: positionY ?? item.positionY,
      width: width ?? item.width,
      height: height ?? item.height,
      note: note ?? item.note,
      ...(updatedMetadata ? { metadata: updatedMetadata } : {}),
    },
  });

  res.json({ item: updatedItem });
};

export const listStoryboards = async (req: Request, res: Response) => {
  const userId = extractUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const projectId = Number(req.query.projectId);
  if (!projectId) {
    res.status(400).json({ message: "projectId is required" });
    return;
  }

  const membership = await ensureProjectMember(projectId, userId);
  if (!membership) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const storyboards = await prisma.storyboard.findMany({
    where: { projectId },
    include: { frames: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  res.json({ storyboards });
};

export const createStoryboard = async (req: Request, res: Response) => {
  const userId = extractUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { projectId, title, description } = req.body as {
    projectId: number;
    title: string;
    description?: string;
  };

  if (!projectId || !title) {
    res.status(400).json({ message: "projectId and title are required" });
    return;
  }

  const membership = await ensureProjectMember(projectId, userId);
  if (!membership) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const storyboard = await prisma.storyboard.create({
    data: {
      projectId,
      title,
      description,
      createdById: userId,
    },
  });

  res.status(201).json({ storyboard });
};

export const addStoryboardFrame = async (req: Request, res: Response) => {
  const userId = extractUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { storyboardId } = req.params;
  const { title, description, imageURL, taskId, duration, metadata } =
    req.body as {
      title?: string;
      description?: string;
      imageURL?: string;
      taskId?: number;
      duration?: number;
      metadata?: Record<string, unknown>;
    };

  const storyboard = await prisma.storyboard.findUnique({
    where: { id: Number(storyboardId) },
    include: { project: true, frames: true },
  });

  if (!storyboard) {
    res.status(404).json({ message: "Storyboard not found" });
    return;
  }

  const membership = await ensureProjectMember(storyboard.projectId, userId);
  if (!membership) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const nextOrder = (storyboard.frames?.length ?? 0) + 1;

  const frame = await prisma.storyboardFrame.create({
    data: {
      storyboardId: storyboard.id,
      order: nextOrder,
      title,
      description,
      imageURL,
      taskId: taskId ?? null,
      duration: duration ?? null,
      metadata: ({
        aiSynopsis: "Story assist coming soon.",
        ...(metadata ?? {}),
      } as Prisma.InputJsonValue),
    },
  });

  res.status(201).json({ frame });
};

export const updateStoryboardFrame = async (req: Request, res: Response) => {
  const userId = extractUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { storyboardId, frameId } = req.params;
  const {
    order,
    title,
    description,
    imageURL,
    duration,
    taskId,
    metadata,
  } = req.body as {
    order?: number;
    title?: string;
    description?: string;
    imageURL?: string;
    duration?: number;
    taskId?: number | null;
    metadata?: Record<string, unknown>;
  };

  const storyboard = await prisma.storyboard.findUnique({
    where: { id: Number(storyboardId) },
    include: { project: true, frames: { orderBy: { order: "asc" } } },
  });

  if (!storyboard) {
    res.status(404).json({ message: "Storyboard not found" });
    return;
  }

  const membership = await ensureProjectMember(storyboard.projectId, userId);
  if (!membership) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const targetFrame = storyboard.frames.find(
    (frame) => frame.id === Number(frameId),
  );

  if (!targetFrame) {
    res.status(404).json({ message: "Storyboard frame not found" });
    return;
  }

  const updatedFrame = await prisma.$transaction(async (tx) => {
    if (order && order !== targetFrame.order) {
      const safeOrder = Math.max(
        1,
        Math.min(order, storyboard.frames.length),
      );
      const framesWithoutTarget = storyboard.frames
        .filter(
          (frame): frame is typeof storyboard.frames[number] =>
            frame.id !== targetFrame.id,
        )
        .sort((a, b) => a.order - b.order);

      const reordered: typeof framesWithoutTarget = [
        ...framesWithoutTarget.slice(0, safeOrder - 1),
        targetFrame,
        ...framesWithoutTarget.slice(safeOrder - 1),
      ];

      await Promise.all(
        reordered.map((frame, index) =>
          tx.storyboardFrame.update({
            where: { id: frame.id },
            data: { order: index + 1 },
          }),
        ),
      );
    }

    const mergedMetadata = mergeJsonValue(targetFrame.metadata, metadata);

    return tx.storyboardFrame.update({
      where: { id: targetFrame.id },
      data: {
        title: title ?? targetFrame.title,
        description: description ?? targetFrame.description,
        imageURL: imageURL ?? targetFrame.imageURL,
        duration: duration ?? targetFrame.duration,
        taskId: taskId === undefined ? targetFrame.taskId : taskId,
        ...(mergedMetadata ? { metadata: mergedMetadata } : {}),
      },
    });
  });

  res.json({ frame: updatedFrame });
};

export const listScenarios = async (req: Request, res: Response) => {
  const userId = extractUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const projectId = Number(req.query.projectId);
  if (!projectId) {
    res.status(400).json({ message: "projectId is required" });
    return;
  }

  const membership = await ensureProjectMember(projectId, userId);
  if (!membership) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const scenarios = await prisma.scenarioDocument.findMany({
    where: { projectId },
    include: { blocks: { orderBy: { order: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });

  res.json({ scenarios });
};

export const createScenario = async (req: Request, res: Response) => {
  const userId = extractUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { projectId, title, summary } = req.body as {
    projectId: number;
    title: string;
    summary?: string;
  };

  if (!projectId || !title) {
    res.status(400).json({ message: "projectId and title are required" });
    return;
  }

  const membership = await ensureProjectMember(projectId, userId);
  if (!membership) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const scenario = await prisma.scenarioDocument.create({
    data: {
      projectId,
      title,
      summary,
      createdById: userId,
      updatedById: userId,
      content: {
        aiAssistant: "Script assistant coming soon.",
      },
    },
  });

  res.status(201).json({ scenario });
};

export const addScenarioBlock = async (req: Request, res: Response) => {
  const userId = extractUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { scenarioId } = req.params;
  const {
    type,
    heading,
    body,
    linkedTaskId,
    linkedFrameId,
    metadata,
  } = req.body as {
    type: string;
    heading?: string;
    body?: string;
    linkedTaskId?: number;
    linkedFrameId?: number;
    metadata?: Record<string, unknown>;
  };

  const scenario = await prisma.scenarioDocument.findUnique({
    where: { id: Number(scenarioId) },
    include: { project: true, blocks: true },
  });

  if (!scenario) {
    res.status(404).json({ message: "Scenario not found" });
    return;
  }

  const membership = await ensureProjectMember(scenario.projectId, userId);
  if (!membership) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const nextOrder = (scenario.blocks?.length ?? 0) + 1;

  const blockType = ensureScenarioBlockType(type);
  if (!blockType) {
    res.status(400).json({ message: "Invalid scenario block type." });
    return;
  }

  const blockMetadata: Prisma.InputJsonValue = ({
    aiSuggestion: "Narrative assistant coming soon.",
    ...(metadata ?? {}),
  }) as Prisma.InputJsonValue;

  const block = await prisma.scenarioBlock.create({
    data: {
      scenarioId: scenario.id,
      order: nextOrder,
      type: blockType,
      heading,
      body,
      linkedTaskId: linkedTaskId ?? null,
      linkedFrameId: linkedFrameId ?? null,
      metadata: blockMetadata,
    },
  });

  res.status(201).json({ block });
};

export const updateScenarioBlock = async (req: Request, res: Response) => {
  const userId = extractUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { scenarioId, blockId } = req.params;
  const {
    heading,
    body,
    metadata,
    linkedTaskId,
    linkedFrameId,
  } = req.body as {
    heading?: string;
    body?: string;
    metadata?: Record<string, unknown>;
    linkedTaskId?: number | null;
    linkedFrameId?: number | null;
  };

  const scenario = await prisma.scenarioDocument.findUnique({
    where: { id: Number(scenarioId) },
    include: { project: true },
  });

  if (!scenario) {
    res.status(404).json({ message: "Scenario not found" });
    return;
  }

  const membership = await ensureProjectMember(scenario.projectId, userId);
  if (!membership) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const block = await prisma.scenarioBlock.findUnique({
    where: { id: Number(blockId) },
  });

  if (!block || block.scenarioId !== scenario.id) {
    res.status(404).json({ message: "Scenario block not found" });
    return;
  }

  const mergedMetadata = mergeJsonValue(block.metadata, metadata);

  const updatedBlock = await prisma.scenarioBlock.update({
    where: { id: block.id },
    data: {
      heading: heading ?? block.heading,
      body: body ?? block.body,
      linkedTaskId:
        linkedTaskId === undefined ? block.linkedTaskId : linkedTaskId,
      linkedFrameId:
        linkedFrameId === undefined ? block.linkedFrameId : linkedFrameId,
      ...(mergedMetadata ? { metadata: mergedMetadata } : {}),
    },
  });

  res.json({ block: updatedBlock });
};
