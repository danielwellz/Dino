import {
  AssetVisibility,
  Prisma,
  PrismaClient,
  TeamMemberRole,
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

const ensureTeamMember = async (teamId: number, userId: number) => {
  return prisma.teamMember.findFirst({
    where: {
      teamId,
      userId,
    },
  });
};

const canManageFolder = (
  role: TeamMemberRole,
  policies: {
    role: TeamMemberRole;
    canUpload: boolean;
    canEdit: boolean;
    canDelete: boolean;
  }[],
) => {
  const policy = policies.find((policy) => policy.role === role);
  if (!policy) {
    return {
      canUpload: role !== TeamMemberRole.VIEWER,
      canEdit: role === TeamMemberRole.OWNER || role === TeamMemberRole.ADMIN,
      canDelete: role === TeamMemberRole.OWNER,
    };
  }
  return {
    canUpload: policy.canUpload,
    canEdit: policy.canEdit,
    canDelete: policy.canDelete,
  };
};

export const listAssetFolders = async (req: Request, res: Response) => {
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

  const folders = await prisma.assetFolder.findMany({
    where: {
      projectId,
    },
    include: {
      rolePolicies: true,
      assets: {
        include: {
          tags: {
            include: { tag: true },
          },
          uploadedBy: {
            select: {
              userId: true,
              username: true,
              profilePictureUrl: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  type FolderWithRelations = Prisma.AssetFolderGetPayload<{
    include: {
      rolePolicies: true;
      assets: {
        include: {
          tags: { include: { tag: true } };
          uploadedBy: {
            select: {
              userId: true;
              username: true;
              profilePictureUrl: true;
            };
          };
        };
        orderBy: { createdAt: "desc" };
      };
    };
  }>;

  type FolderNode = FolderWithRelations & {
    permissions: ReturnType<typeof canManageFolder>;
    assetCount: number;
    children: FolderNode[];
  };

  const folderMap = new Map<number, FolderNode>();
  const rootFolders: FolderNode[] = [];
  let totalAssets = 0;

  folders.forEach((folder) => {
    totalAssets += folder.assets.length;
    const node: FolderNode = {
      ...folder,
      permissions: canManageFolder(
        membership.role as TeamMemberRole,
        folder.rolePolicies,
      ),
      assetCount: folder.assets.length,
      children: [] as any[],
    };
    folderMap.set(folder.id, node);
  });

  folderMap.forEach((node) => {
    if (node.parentId && folderMap.has(node.parentId)) {
      const parent = folderMap.get(node.parentId);
      if (parent) {
        parent.children.push(node);
      }
    } else {
      rootFolders.push(node);
    }
  });

  res.json({
    folders: rootFolders,
    summary: {
      totalFolders: folders.length,
      totalAssets,
    },
  });
};

export const createAssetFolder = async (req: Request, res: Response) => {
  const userId = extractUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { name, description, parentId, projectId, visibility } = req.body as {
    name: string;
    description?: string;
    parentId?: number;
    projectId: number;
    visibility?: AssetVisibility;
  };

  if (!projectId || !name) {
    res
      .status(400)
      .json({ message: "projectId and name are required to create folder" });
    return;
  }

  const membership = await ensureProjectMember(projectId, userId);
  if (!membership) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const parent =
    parentId != null
      ? await prisma.assetFolder.findUnique({ where: { id: parentId } })
      : null;

  if (parentId && !parent) {
    res.status(404).json({ message: "Parent folder not found" });
    return;
  }

  const folder = await prisma.assetFolder.create({
    data: {
      name,
      description,
      parentId: parentId ?? null,
      projectId,
      teamId: membership.teamId,
      createdById: userId,
      visibility: visibility ?? AssetVisibility.TEAM,
    },
  });

  const defaultPolicies = [
    {
      folderId: folder.id,
      role: TeamMemberRole.OWNER,
      canUpload: true,
      canEdit: true,
      canDelete: true,
    },
    {
      folderId: folder.id,
      role: TeamMemberRole.ADMIN,
      canUpload: true,
      canEdit: true,
      canDelete: true,
    },
    {
      folderId: folder.id,
      role: TeamMemberRole.MEMBER,
      canUpload: true,
      canEdit: false,
      canDelete: false,
    },
    {
      folderId: folder.id,
      role: TeamMemberRole.VIEWER,
      canUpload: false,
      canEdit: false,
      canDelete: false,
    },
  ];

  await prisma.assetFolderRolePolicy.createMany({
    data: defaultPolicies,
    skipDuplicates: true,
  });

  const folderWithPolicies = await prisma.assetFolder.findUnique({
    where: { id: folder.id },
    include: {
      rolePolicies: true,
      parent: { select: { id: true, name: true } },
      children: {
        select: { id: true, name: true },
      },
    },
  });

  res.status(201).json({ folder: folderWithPolicies });
};

export const listAssets = async (req: Request, res: Response) => {
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

  const assets = await prisma.asset.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
      folder: true,
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      uploadedBy: {
        select: {
          userId: true,
          username: true,
          profilePictureUrl: true,
        },
      },
      references: true,
    },
  });

  const enrichedAssets = assets.map((asset) => ({
    ...asset,
    linkCount: asset.references?.length ?? 0,
  }));

  res.json({ assets: enrichedAssets });
};

export const createAssetRecord = async (req: Request, res: Response) => {
  const userId = extractUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const {
    name,
    description,
    fileURL,
    previewURL,
    mimeType,
    size,
    folderId,
    projectId,
    tags = [],
  } = req.body as {
    name: string;
    description?: string;
    fileURL: string;
    previewURL?: string;
    mimeType?: string;
    size?: number;
    folderId?: number;
    projectId: number;
    tags?: string[];
  };

  if (!name || !fileURL || !projectId) {
    res
      .status(400)
      .json({ message: "name, fileURL and projectId are required" });
    return;
  }

  const membership = await ensureProjectMember(projectId, userId);
  if (!membership) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  let folder = null;
  if (folderId) {
    folder = await prisma.assetFolder.findUnique({
      where: { id: folderId },
      include: { rolePolicies: true },
    });
    if (!folder) {
      res.status(404).json({ message: "Folder not found" });
      return;
    }
    const permissions = canManageFolder(membership.role, folder.rolePolicies);
    if (!permissions.canUpload) {
      res.status(403).json({ message: "Upload not permitted for your role" });
      return;
    }
  }

  const autoTagPlaceholder = {
    status: "comingSoon",
    suggestions: [
      { key: "colorPalette", confidence: 0.1 },
      { key: "needsReview", confidence: 0.1 },
    ],
  };

  const asset = await prisma.asset.create({
    data: {
      name,
      description,
      fileURL,
      previewURL,
      mimeType,
      size,
      folderId: folderId ?? null,
      projectId,
      uploadedById: userId,
      autoTags: autoTagPlaceholder,
      metadata: {},
      tags: {
        create: await Promise.all(
          tags.map(async (tagKey) => {
            let tag = await prisma.assetTag.findUnique({
              where: { key: tagKey },
            });
            if (!tag) {
              tag = await prisma.assetTag.create({
                data: {
                  key: tagKey,
                  labelEn: tagKey,
                  labelFa: tagKey,
                  teamId: membership.teamId,
                },
              });
            }
            return {
              tagId: tag.id,
            };
          }),
        ),
      },
    },
    include: {
      tags: {
        include: { tag: true },
      },
    },
  });

  res.status(201).json({ asset, ai: autoTagPlaceholder });
};

export const createAssetTag = async (req: Request, res: Response) => {
  const userId = extractUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { key, labelEn, labelFa, teamId } = req.body as {
    key: string;
    labelEn: string;
    labelFa?: string;
    teamId: number;
  };

  if (!key || !labelEn || !teamId) {
    res.status(400).json({ message: "key, labelEn and teamId are required" });
    return;
  }

  const membership = await ensureTeamMember(teamId, userId);
  if (!membership) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const tag = await prisma.assetTag.upsert({
    where: { key },
    update: {
      labelEn,
      labelFa: labelFa ?? labelEn,
    },
    create: {
      key,
      labelEn,
      labelFa: labelFa ?? labelEn,
      teamId,
    },
  });

  res.status(201).json({ tag });
};

export const listAssetTags = async (req: Request, res: Response) => {
  const userId = extractUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const teamId = Number(req.query.teamId);
  if (!teamId) {
    res.status(400).json({ message: "teamId is required" });
    return;
  }

  const membership = await ensureTeamMember(teamId, userId);
  if (!membership) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const tags = await prisma.assetTag.findMany({
    where: { teamId },
    orderBy: { labelEn: "asc" },
  });

  res.json({ tags });
};
