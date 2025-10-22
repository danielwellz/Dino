import { randomUUID } from "crypto";
import { Request, Response } from "express";
import {
  ParticipantStatus,
  Prisma,
  PrismaClient,
  TeamMemberRole,
} from "@prisma/client";
import { verifyAccessToken } from "../utils/jwt";

const prisma = new PrismaClient();

const isJsonObject = (value: Prisma.InputJsonValue): value is Prisma.InputJsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";

type OnboardingStageInput = {
  titleEn: string;
  titleFa?: string;
  ownerRole?: TeamMemberRole;
  order?: number;
  metadata?: Prisma.InputJsonValue;
};

type OnboardingParticipantInput = {
  userId?: number;
  email?: string;
  role?: TeamMemberRole;
};

const defaultProjectTypes = [
  {
    key: "multimedia_campaign",
    nameEn: "Multimedia Campaign",
    nameFa: "کمپین چندرسانه‌ای",
    descriptionEn:
      "Coordinate creative, production, and delivery streams across a multimedia initiative.",
    descriptionFa:
      "جریان‌های خلاق، تولید و تحویل را در یک کمپین چندرسانه‌ای هماهنگ کنید.",
  },
  {
    key: "film_production",
    nameEn: "Film / Series Production",
    nameFa: "تولید فیلم و سریال",
    descriptionEn:
      "Plan story development, moodboards, shoots, and post-production across departments.",
    descriptionFa:
      "توسعه داستان، مودبورد، برداشت‌ها و پس‌تولید را میان واحدها برنامه‌ریزی کنید.",
  },
];

const defaultWorkflowTemplates = [
  {
    key: "campaign_launch",
    projectTypeKey: "multimedia_campaign",
    nameEn: "Campaign Launch Essentials",
    nameFa: "الزامات راه‌اندازی کمپین",
    descriptionEn:
      "Discovery, creative, production, and delivery milestones for multi-channel campaigns.",
    descriptionFa:
      "مراحل کشف، خلاقیت، تولید و تحویل برای کمپین‌های چندکاناله.",
    stages: [
      {
        titleEn: "Discovery & Brief Alignment",
        titleFa: "کشف و همسویی با بریف",
        ownerRole: TeamMemberRole.OWNER,
      },
      {
        titleEn: "Creative Concepting",
        titleFa: "ایده‌پردازی خلاقانه",
        ownerRole: TeamMemberRole.ADMIN,
      },
      {
        titleEn: "Production & Reviews",
        titleFa: "تولید و بازبینی‌ها",
      },
      {
        titleEn: "Launch & Performance",
        titleFa: "راه‌اندازی و عملکرد",
      },
    ],
  },
  {
    key: "film_storyboard",
    projectTypeKey: "film_production",
    nameEn: "Film Storyboard Pipeline",
    nameFa: "خط لوله استوری‌بورد فیلم",
    descriptionEn:
      "Structure for scenario writing, storyboard iterations, production, and post.",
    descriptionFa:
      "ساختار نگارش سناریو، نسخه‌های استوری‌بورد، تولید و پس‌تولید.",
    stages: [
      {
        titleEn: "Scenario Drafting",
        titleFa: "نگارش سناریو",
        ownerRole: TeamMemberRole.ADMIN,
      },
      {
        titleEn: "Storyboard Iteration",
        titleFa: "ت iter تکرار استوری‌بورد",
        ownerRole: TeamMemberRole.MEMBER,
      },
      {
        titleEn: "Production",
        titleFa: "تولید",
      },
      {
        titleEn: "Post-production",
        titleFa: "پس تولید",
      },
    ],
  },
];

const sanitizeStageInput = (
  stages: OnboardingStageInput[],
): Prisma.ProjectStageCreateManyInput[] => {
  return stages.map((stage, index) => ({
    projectId: 0, // overwritten later
    titleEn: stage.titleEn.trim(),
    titleFa: (stage.titleFa ?? stage.titleEn).trim(),
    order: stage.order ?? index + 1,
    ownerRole: stage.ownerRole ?? TeamMemberRole.MEMBER,
    metadata: stage.metadata ?? Prisma.JsonNull,
  }));
};

const seedOnboardingCatalog = async () => {
  for (const type of defaultProjectTypes) {
    await prisma.projectType.upsert({
      where: { key: type.key },
      update: {
        nameEn: type.nameEn,
        nameFa: type.nameFa,
        descriptionEn: type.descriptionEn,
        descriptionFa: type.descriptionFa,
      },
      create: {
        key: type.key,
        nameEn: type.nameEn,
        nameFa: type.nameFa,
        descriptionEn: type.descriptionEn,
        descriptionFa: type.descriptionFa,
      },
    });
  }

  for (const template of defaultWorkflowTemplates) {
    const projectType = await prisma.projectType.findUnique({
      where: { key: template.projectTypeKey },
    });

    await prisma.workflowTemplate.upsert({
      where: { key: template.key },
      update: {
        nameEn: template.nameEn,
        nameFa: template.nameFa,
        descriptionEn: template.descriptionEn,
        descriptionFa: template.descriptionFa,
        projectTypeId: projectType?.id ?? null,
        stages: template.stages,
      },
      create: {
        key: template.key,
        nameEn: template.nameEn,
        nameFa: template.nameFa,
        descriptionEn: template.descriptionEn,
        descriptionFa: template.descriptionFa,
        projectTypeId: projectType?.id ?? null,
        stages: template.stages,
      },
    });
  }
};

const sendInvitationEmailStub = async (email: string, link: string) => {
  // eslint-disable-next-line no-console
  console.log(
    `[Email Stub] Invitation for ${email} -> ${link}. (Replace with real mailer)`,
  );
};

const buildProjectInclude = () =>
  ({
    projectType: true,
    workflowTemplate: true,
    stages: { orderBy: { order: "asc" } },
    participants: true,
    invitations: true,
    team: {
      include: {
        members: {
          include: {
            user: {
              select: {
                userId: true,
                username: true,
                email: true,
                profilePictureUrl: true,
              },
            },
          },
        },
      },
    },
  }) satisfies Prisma.ProjectInclude;

const extractAuthUser = (req: Request) => {
  const token = req.headers.authorization?.split(" ")[1];
  const decoded = verifyAccessToken(token as string);
  if (!decoded) {
    return null;
  }
  return Number(decoded.userId);
};

export const getProjectOnboardingMeta = async (
  req: Request,
  res: Response,
) => {
  const userId = extractAuthUser(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized: User not authenticated" });
    return;
  }

  await seedOnboardingCatalog();

  const types = await prisma.projectType.findMany({
    include: { workflows: true },
    orderBy: { createdAt: "asc" },
  });

  res.status(200).json({
    projectTypes: types,
  });
};

export const getProjects = async (req: Request, res: Response) => {
  const userId = extractAuthUser(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized: User not authenticated" });
    return;
  }

  try {
    const projects = await prisma.project.findMany({
      where: {
        team: {
          members: {
            some: {
              userId,
            },
          },
        },
      },
      include: {
        projectType: true,
        workflowTemplate: true,
        stages: {
          orderBy: { order: "asc" },
        },
        participants: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(projects);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "error retrieving projects", error: error.message });
  }
};

export const createProject = async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      startDate,
      endDate,
      status = "PLANNING",
      projectTypeKey,
      workflowTemplateKey,
      workflowTemplateId,
      stages = [],
      participants = [],
      sendInvites = false,
      metadata = {} as Prisma.InputJsonValue,
    } = req.body as {
      name: string;
      description?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
      projectTypeKey?: string;
      workflowTemplateKey?: string;
      workflowTemplateId?: number;
      stages?: OnboardingStageInput[];
      participants?: OnboardingParticipantInput[];
      sendInvites?: boolean;
      metadata?: Prisma.InputJsonValue;
    };

    const userId = extractAuthUser(req);
    if (!userId) {
      res.status(401).json({ message: "Unauthorized: User not authenticated" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { userId },
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    await seedOnboardingCatalog();

    const projectType = projectTypeKey
      ? await prisma.projectType.findUnique({ where: { key: projectTypeKey } })
      : null;

    const workflowTemplate = workflowTemplateKey
      ? await prisma.workflowTemplate.findUnique({
          where: { key: workflowTemplateKey },
        })
      : workflowTemplateId
      ? await prisma.workflowTemplate.findUnique({
          where: { id: Number(workflowTemplateId) },
        })
      : null;

    const resolvedStages =
      stages.length > 0
        ? sanitizeStageInput(stages)
        : workflowTemplate?.stages
        ? sanitizeStageInput(workflowTemplate.stages as OnboardingStageInput[])
        : [];

    const projectResult = await prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: {
          teamName: `${name} Team`,
        },
      });

      const ownerMembership = await tx.teamMember.create({
        data: {
          userId,
          teamId: team.id,
          role: TeamMemberRole.OWNER,
        },
        include: {
          user: true,
        },
      });

      const baseMetadata = isJsonObject(metadata) ? metadata : {};
      const projectMetadata = {
        ...baseMetadata,
        projectTypeKey: projectType?.key ?? null,
        workflowTemplateKey: workflowTemplate?.key ?? null,
      } as Prisma.InputJsonValue;

      const project = await tx.project.create({
        data: {
          name,
          description,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          status,
          teamId: team.id,
          projectTypeId: projectType?.id ?? null,
          workflowTemplateId: workflowTemplate?.id ?? null,
          onboardingStatus: "COMPLETED",
          onboardingMetadata: projectMetadata,
        },
      });

      await tx.projectParticipant.create({
        data: {
          projectId: project.id,
          userId,
          role: TeamMemberRole.OWNER,
          status: ParticipantStatus.ACCEPTED,
        },
      });

      if (resolvedStages.length > 0) {
        await tx.projectStage.createMany({
          data: resolvedStages.map((stage) => ({
            ...stage,
            projectId: project.id,
          })),
        });
      }

      const pendingInvitations: {
        email: string;
        role: string;
        token: string;
        url: string;
      }[] = [];

      for (const participant of participants) {
        if (
          (participant.userId && Number(participant.userId) === userId) ||
          (participant.email &&
            user.email &&
            participant.email.toLowerCase() === user.email.toLowerCase())
        ) {
          // Skip the creator – already connected as owner
          // eslint-disable-next-line no-continue
          continue;
        }
        if (participant.userId) {
          const participantUser = await tx.user.findUnique({
            where: { userId: Number(participant.userId) },
          });

          if (!participantUser) {
            continue;
          }

          await tx.teamMember.upsert({
            where: {
              userId_teamId: {
                teamId: team.id,
                userId: participantUser.userId,
              },
            },
            update: {
              role: participant.role ?? TeamMemberRole.MEMBER,
            },
            create: {
              teamId: team.id,
              userId: participantUser.userId,
              role: participant.role ?? TeamMemberRole.MEMBER,
            },
          });

          await tx.projectParticipant.create({
            data: {
              projectId: project.id,
              userId: participantUser.userId,
              role: participant.role ?? TeamMemberRole.MEMBER,
              status: ParticipantStatus.ACCEPTED,
            },
          });
        } else if (participant.email) {
          const token = randomUUID();
          await tx.projectParticipant.create({
            data: {
              projectId: project.id,
              email: participant.email.toLowerCase(),
              role: participant.role ?? TeamMemberRole.MEMBER,
              status: ParticipantStatus.INVITED,
              inviteToken: token,
            },
          });

          const invitation = await tx.projectInvitation.create({
            data: {
              projectId: project.id,
              email: participant.email.toLowerCase(),
              role: participant.role ?? TeamMemberRole.MEMBER,
              token,
              status: ParticipantStatus.INVITED,
              expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14), // 14 days
              invitedById: userId,
            },
          });

          pendingInvitations.push({
            email: invitation.email,
            role: invitation.role,
            token: invitation.token,
            url: `${FRONTEND_URL}/invitations/${invitation.token}`,
          });
        }
      }

      return {
        project,
        team,
        ownerMembership,
        pendingInvitations,
      };
    });

    if (sendInvites) {
      await Promise.all(
        projectResult.pendingInvitations.map((invite) =>
          sendInvitationEmailStub(invite.email, invite.url),
        ),
      );
    }

    const hydratedProject = await prisma.project.findUnique({
      where: { id: projectResult.project.id },
      include: buildProjectInclude(),
    });

    res.status(201).json({
      message: "Project created successfully",
      project: hydratedProject,
      invitations: projectResult.pendingInvitations,
    });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error("Error creating project:", error);

    if (error.code === "P2002") {
      res.status(409).json({
        message: "A project with this name already exists",
        error: error.message,
      });
      return;
    }

    res.status(500).json({
      message: "Error creating project",
      error: error.message,
    });
  }
};

export const getProjectById = async (req: Request, res: Response) => {
  const userId = extractAuthUser(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized: User not authenticated" });
    return;
  }

  const { projectId } = req.params;

  try {
    const project = await prisma.project.findUnique({
      where: { id: Number(projectId) },
      include: buildProjectInclude(),
    });

    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    const isMember = await prisma.teamMember.findFirst({
      where: { teamId: project.teamId, userId },
    });

    if (!isMember) {
      res
        .status(403)
        .json({ message: "Forbidden: User is not part of this project team" });
      return;
    }

    res.json(project);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "error retrieving project", error: error.message });
  }
};

export const getProjectOnboardingDetails = async (
  req: Request,
  res: Response,
) => {
  const userId = extractAuthUser(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized: User not authenticated" });
    return;
  }

  const { projectId } = req.params;

  const project = await prisma.project.findUnique({
    where: { id: Number(projectId) },
    include: buildProjectInclude(),
  });

  if (!project) {
    res.status(404).json({ message: "Project not found" });
    return;
  }

  const isMember = await prisma.teamMember.findFirst({
    where: { teamId: project.teamId, userId },
  });

  if (!isMember) {
    res
      .status(403)
      .json({ message: "Forbidden: User is not part of this project team" });
    return;
  }

  res.json(project);
};

export const createProjectInvitation = async (
  req: Request,
  res: Response,
) => {
  const userId = extractAuthUser(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized: User not authenticated" });
    return;
  }

  const { projectId } = req.params;
  const { email, role = TeamMemberRole.MEMBER, sendEmail = true } = req.body as {
    email: string;
    role?: TeamMemberRole;
    sendEmail?: boolean;
  };

  const project = await prisma.project.findUnique({
    where: { id: Number(projectId) },
  });

  if (!project) {
    res.status(404).json({ message: "Project not found" });
    return;
  }

  const membership = await prisma.teamMember.findFirst({
    where: { teamId: project.teamId, userId },
  });

  if (!membership) {
    res
      .status(403)
      .json({ message: "Forbidden: You are not part of this project team" });
    return;
  }

  const token = randomUUID();

  const invitation = await prisma.projectInvitation.create({
    data: {
      projectId: project.id,
      email: email.toLowerCase(),
      role,
      token,
      status: ParticipantStatus.INVITED,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      invitedById: userId,
    },
  });

  await prisma.projectParticipant.create({
    data: {
      projectId: project.id,
      email: email.toLowerCase(),
      role,
      status: ParticipantStatus.INVITED,
      inviteToken: token,
    },
  });

  const link = `${FRONTEND_URL}/invitations/${token}`;
  if (sendEmail) {
    await sendInvitationEmailStub(email, link);
  }

  res.status(201).json({
    invitation,
    link,
  });
};

export const deleteProject = async (req: Request, res: Response) => {
  const { projectId } = req.params;

  try {
    const project = await prisma.project.findUnique({
      where: { id: Number(projectId) },
      select: { teamId: true },
    });

    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    const userId = extractAuthUser(req);
    if (!userId) {
      res.status(401).json({ message: "Unauthorized: User not authenticated" });
      return;
    }

    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId,
        teamId: project.teamId,
        role: TeamMemberRole.OWNER,
      },
    });

    if (!teamMember) {
      res.status(403).json({
        message: "Forbidden: Only the project owner can delete this project",
      });
      return;
    }

    await prisma.project.delete({ where: { id: Number(projectId) } });
    res.json({ message: "project deleted successfully" });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "error deleting project", error: error.message });
  }
};

export const getProjectDependencies = async (
  req: Request,
  res: Response,
) => {
  try {
    const { projectId } = req.params;
    const tasks = await prisma.task.findMany({
      where: { projectId: Number(projectId) },
    });

    const taskIds = tasks.map((task) => task.id);

    const dependencies = await prisma.taskDependency.findMany({
      where: {
        dependentTaskId: { in: taskIds },
        prerequisiteTaskId: { in: taskIds },
      },
    });
    res.json(dependencies);
  } catch (error: any) {
    res.status(500).json({
      message: "error retrieving project dependencies",
      error: error.message,
    });
  }
};

export const getProjectTeamMembers = async (
  req: Request,
  res: Response,
) => {
  const { projectId } = req.params;
  const userId = extractAuthUser(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: Number(projectId) },
      include: {
        team: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    userId: true,
                    username: true,
                    email: true,
                    profilePictureUrl: true,
                  },
                },
              },
            },
          },
        },
        participants: true,
      },
    });

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const isMember = project.team.members.some(
      (member) => member.userId === userId,
    );

    if (!isMember) {
      res
        .status(403)
        .json({ error: "You must be a team member to view this information" });
      return;
    }

    res.status(200).json({
      teamMembers: project.team.members,
      projectParticipants: project.participants,
    });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error("Error fetching project team members:", error);
    res.status(500).json({ error: "Failed to fetch project team members" });
  }
};

