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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectTeamMembers = exports.getProjectDependencies = exports.deleteProject = exports.createProjectInvitation = exports.getProjectOnboardingDetails = exports.getProjectById = exports.createProject = exports.getProjects = exports.getProjectOnboardingMeta = void 0;
const crypto_1 = require("crypto");
const client_1 = require("@prisma/client");
const jwt_1 = require("../utils/jwt");
const prisma = new client_1.PrismaClient();
const isJsonObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const FRONTEND_URL = (_a = process.env.FRONTEND_URL) !== null && _a !== void 0 ? _a : "http://localhost:3000";
const defaultProjectTypes = [
    {
        key: "multimedia_campaign",
        nameEn: "Multimedia Campaign",
        nameFa: "کمپین چندرسانه‌ای",
        descriptionEn: "Coordinate creative, production, and delivery streams across a multimedia initiative.",
        descriptionFa: "جریان‌های خلاق، تولید و تحویل را در یک کمپین چندرسانه‌ای هماهنگ کنید.",
    },
    {
        key: "film_production",
        nameEn: "Film / Series Production",
        nameFa: "تولید فیلم و سریال",
        descriptionEn: "Plan story development, moodboards, shoots, and post-production across departments.",
        descriptionFa: "توسعه داستان، مودبورد، برداشت‌ها و پس‌تولید را میان واحدها برنامه‌ریزی کنید.",
    },
];
const defaultWorkflowTemplates = [
    {
        key: "campaign_launch",
        projectTypeKey: "multimedia_campaign",
        nameEn: "Campaign Launch Essentials",
        nameFa: "الزامات راه‌اندازی کمپین",
        descriptionEn: "Discovery, creative, production, and delivery milestones for multi-channel campaigns.",
        descriptionFa: "مراحل کشف، خلاقیت، تولید و تحویل برای کمپین‌های چندکاناله.",
        stages: [
            {
                titleEn: "Discovery & Brief Alignment",
                titleFa: "کشف و همسویی با بریف",
                ownerRole: client_1.TeamMemberRole.OWNER,
            },
            {
                titleEn: "Creative Concepting",
                titleFa: "ایده‌پردازی خلاقانه",
                ownerRole: client_1.TeamMemberRole.ADMIN,
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
        descriptionEn: "Structure for scenario writing, storyboard iterations, production, and post.",
        descriptionFa: "ساختار نگارش سناریو، نسخه‌های استوری‌بورد، تولید و پس‌تولید.",
        stages: [
            {
                titleEn: "Scenario Drafting",
                titleFa: "نگارش سناریو",
                ownerRole: client_1.TeamMemberRole.ADMIN,
            },
            {
                titleEn: "Storyboard Iteration",
                titleFa: "ت iter تکرار استوری‌بورد",
                ownerRole: client_1.TeamMemberRole.MEMBER,
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
const sanitizeStageInput = (stages) => {
    return stages.map((stage, index) => {
        var _a, _b, _c, _d;
        return ({
            projectId: 0, // overwritten later
            titleEn: stage.titleEn.trim(),
            titleFa: ((_a = stage.titleFa) !== null && _a !== void 0 ? _a : stage.titleEn).trim(),
            order: (_b = stage.order) !== null && _b !== void 0 ? _b : index + 1,
            ownerRole: (_c = stage.ownerRole) !== null && _c !== void 0 ? _c : client_1.TeamMemberRole.MEMBER,
            metadata: (_d = stage.metadata) !== null && _d !== void 0 ? _d : client_1.Prisma.JsonNull,
        });
    });
};
const seedOnboardingCatalog = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    for (const type of defaultProjectTypes) {
        yield prisma.projectType.upsert({
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
        const projectType = yield prisma.projectType.findUnique({
            where: { key: template.projectTypeKey },
        });
        yield prisma.workflowTemplate.upsert({
            where: { key: template.key },
            update: {
                nameEn: template.nameEn,
                nameFa: template.nameFa,
                descriptionEn: template.descriptionEn,
                descriptionFa: template.descriptionFa,
                projectTypeId: (_a = projectType === null || projectType === void 0 ? void 0 : projectType.id) !== null && _a !== void 0 ? _a : null,
                stages: template.stages,
            },
            create: {
                key: template.key,
                nameEn: template.nameEn,
                nameFa: template.nameFa,
                descriptionEn: template.descriptionEn,
                descriptionFa: template.descriptionFa,
                projectTypeId: (_b = projectType === null || projectType === void 0 ? void 0 : projectType.id) !== null && _b !== void 0 ? _b : null,
                stages: template.stages,
            },
        });
    }
});
const sendInvitationEmailStub = (email, link) => __awaiter(void 0, void 0, void 0, function* () {
    // eslint-disable-next-line no-console
    console.log(`[Email Stub] Invitation for ${email} -> ${link}. (Replace with real mailer)`);
});
const buildProjectInclude = () => ({
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
});
const extractAuthUser = (req) => {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(" ")[1];
    const decoded = (0, jwt_1.verifyAccessToken)(token);
    if (!decoded) {
        return null;
    }
    return Number(decoded.userId);
};
const getProjectOnboardingMeta = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = extractAuthUser(req);
    if (!userId) {
        res.status(401).json({ message: "Unauthorized: User not authenticated" });
        return;
    }
    yield seedOnboardingCatalog();
    const types = yield prisma.projectType.findMany({
        include: { workflows: true },
        orderBy: { createdAt: "asc" },
    });
    res.status(200).json({
        projectTypes: types,
    });
});
exports.getProjectOnboardingMeta = getProjectOnboardingMeta;
const getProjects = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = extractAuthUser(req);
    if (!userId) {
        res.status(401).json({ message: "Unauthorized: User not authenticated" });
        return;
    }
    try {
        const projects = yield prisma.project.findMany({
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
    }
    catch (error) {
        res
            .status(500)
            .json({ message: "error retrieving projects", error: error.message });
    }
});
exports.getProjects = getProjects;
const createProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, description, startDate, endDate, status = "PLANNING", role = client_1.TeamMemberRole.OWNER, projectTypeKey, workflowTemplateKey, workflowTemplateId, stages = [], participants = [], sendInvites = false, metadata = {}, } = req.body;
        const userId = extractAuthUser(req);
        if (!userId) {
            res.status(401).json({ message: "Unauthorized: User not authenticated" });
            return;
        }
        const user = yield prisma.user.findUnique({
            where: { userId },
        });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        yield seedOnboardingCatalog();
        const projectType = projectTypeKey
            ? yield prisma.projectType.findUnique({ where: { key: projectTypeKey } })
            : null;
        const workflowTemplate = workflowTemplateKey
            ? yield prisma.workflowTemplate.findUnique({
                where: { key: workflowTemplateKey },
            })
            : workflowTemplateId
                ? yield prisma.workflowTemplate.findUnique({
                    where: { id: Number(workflowTemplateId) },
                })
                : null;
        const resolvedStages = stages.length > 0
            ? sanitizeStageInput(stages)
            : (workflowTemplate === null || workflowTemplate === void 0 ? void 0 : workflowTemplate.stages)
                ? sanitizeStageInput(workflowTemplate.stages)
                : [];
        const projectResult = yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            const team = yield tx.team.create({
                data: {
                    teamName: `${name} Team`,
                },
            });
            const ownerMembership = yield tx.teamMember.create({
                data: {
                    userId,
                    teamId: team.id,
                    role,
                },
                include: {
                    user: true,
                },
            });
            const baseMetadata = isJsonObject(metadata) ? metadata : {};
            const projectMetadata = Object.assign(Object.assign({}, baseMetadata), { projectTypeKey: (_a = projectType === null || projectType === void 0 ? void 0 : projectType.key) !== null && _a !== void 0 ? _a : null, workflowTemplateKey: (_b = workflowTemplate === null || workflowTemplate === void 0 ? void 0 : workflowTemplate.key) !== null && _b !== void 0 ? _b : null });
            const project = yield tx.project.create({
                data: {
                    name,
                    description,
                    startDate: startDate ? new Date(startDate) : null,
                    endDate: endDate ? new Date(endDate) : null,
                    status,
                    teamId: team.id,
                    projectTypeId: (_c = projectType === null || projectType === void 0 ? void 0 : projectType.id) !== null && _c !== void 0 ? _c : null,
                    workflowTemplateId: (_d = workflowTemplate === null || workflowTemplate === void 0 ? void 0 : workflowTemplate.id) !== null && _d !== void 0 ? _d : null,
                    onboardingStatus: "COMPLETED",
                    onboardingMetadata: projectMetadata,
                },
            });
            if (resolvedStages.length > 0) {
                yield tx.projectStage.createMany({
                    data: resolvedStages.map((stage) => (Object.assign(Object.assign({}, stage), { projectId: project.id }))),
                });
            }
            const pendingInvitations = [];
            for (const participant of participants) {
                if (participant.userId) {
                    const participantUser = yield tx.user.findUnique({
                        where: { userId: Number(participant.userId) },
                    });
                    if (!participantUser) {
                        continue;
                    }
                    yield tx.teamMember.upsert({
                        where: {
                            userId_teamId: {
                                teamId: team.id,
                                userId: participantUser.userId,
                            },
                        },
                        update: {
                            role: (_e = participant.role) !== null && _e !== void 0 ? _e : client_1.TeamMemberRole.MEMBER,
                        },
                        create: {
                            teamId: team.id,
                            userId: participantUser.userId,
                            role: (_f = participant.role) !== null && _f !== void 0 ? _f : client_1.TeamMemberRole.MEMBER,
                        },
                    });
                    yield tx.projectParticipant.create({
                        data: {
                            projectId: project.id,
                            userId: participantUser.userId,
                            role: (_g = participant.role) !== null && _g !== void 0 ? _g : client_1.TeamMemberRole.MEMBER,
                            status: client_1.ParticipantStatus.ACCEPTED,
                        },
                    });
                }
                else if (participant.email) {
                    const token = (0, crypto_1.randomUUID)();
                    yield tx.projectParticipant.create({
                        data: {
                            projectId: project.id,
                            email: participant.email.toLowerCase(),
                            role: (_h = participant.role) !== null && _h !== void 0 ? _h : client_1.TeamMemberRole.MEMBER,
                            status: client_1.ParticipantStatus.INVITED,
                            inviteToken: token,
                        },
                    });
                    const invitation = yield tx.projectInvitation.create({
                        data: {
                            projectId: project.id,
                            email: participant.email.toLowerCase(),
                            role: (_j = participant.role) !== null && _j !== void 0 ? _j : client_1.TeamMemberRole.MEMBER,
                            token,
                            status: client_1.ParticipantStatus.INVITED,
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
        }));
        if (sendInvites) {
            yield Promise.all(projectResult.pendingInvitations.map((invite) => sendInvitationEmailStub(invite.email, invite.url)));
        }
        const hydratedProject = yield prisma.project.findUnique({
            where: { id: projectResult.project.id },
            include: buildProjectInclude(),
        });
        res.status(201).json({
            message: "Project created successfully",
            project: hydratedProject,
            invitations: projectResult.pendingInvitations,
        });
    }
    catch (error) {
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
});
exports.createProject = createProject;
const getProjectById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = extractAuthUser(req);
    if (!userId) {
        res.status(401).json({ message: "Unauthorized: User not authenticated" });
        return;
    }
    const { projectId } = req.params;
    try {
        const project = yield prisma.project.findUnique({
            where: { id: Number(projectId) },
            include: buildProjectInclude(),
        });
        if (!project) {
            res.status(404).json({ message: "Project not found" });
            return;
        }
        const isMember = yield prisma.teamMember.findFirst({
            where: { teamId: project.teamId, userId },
        });
        if (!isMember) {
            res
                .status(403)
                .json({ message: "Forbidden: User is not part of this project team" });
            return;
        }
        res.json(project);
    }
    catch (error) {
        res
            .status(500)
            .json({ message: "error retrieving project", error: error.message });
    }
});
exports.getProjectById = getProjectById;
const getProjectOnboardingDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = extractAuthUser(req);
    if (!userId) {
        res.status(401).json({ message: "Unauthorized: User not authenticated" });
        return;
    }
    const { projectId } = req.params;
    const project = yield prisma.project.findUnique({
        where: { id: Number(projectId) },
        include: buildProjectInclude(),
    });
    if (!project) {
        res.status(404).json({ message: "Project not found" });
        return;
    }
    const isMember = yield prisma.teamMember.findFirst({
        where: { teamId: project.teamId, userId },
    });
    if (!isMember) {
        res
            .status(403)
            .json({ message: "Forbidden: User is not part of this project team" });
        return;
    }
    res.json(project);
});
exports.getProjectOnboardingDetails = getProjectOnboardingDetails;
const createProjectInvitation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = extractAuthUser(req);
    if (!userId) {
        res.status(401).json({ message: "Unauthorized: User not authenticated" });
        return;
    }
    const { projectId } = req.params;
    const { email, role = client_1.TeamMemberRole.MEMBER, sendEmail = true } = req.body;
    const project = yield prisma.project.findUnique({
        where: { id: Number(projectId) },
    });
    if (!project) {
        res.status(404).json({ message: "Project not found" });
        return;
    }
    const membership = yield prisma.teamMember.findFirst({
        where: { teamId: project.teamId, userId },
    });
    if (!membership) {
        res
            .status(403)
            .json({ message: "Forbidden: You are not part of this project team" });
        return;
    }
    const token = (0, crypto_1.randomUUID)();
    const invitation = yield prisma.projectInvitation.create({
        data: {
            projectId: project.id,
            email: email.toLowerCase(),
            role,
            token,
            status: client_1.ParticipantStatus.INVITED,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
            invitedById: userId,
        },
    });
    yield prisma.projectParticipant.create({
        data: {
            projectId: project.id,
            email: email.toLowerCase(),
            role,
            status: client_1.ParticipantStatus.INVITED,
            inviteToken: token,
        },
    });
    const link = `${FRONTEND_URL}/invitations/${token}`;
    if (sendEmail) {
        yield sendInvitationEmailStub(email, link);
    }
    res.status(201).json({
        invitation,
        link,
    });
});
exports.createProjectInvitation = createProjectInvitation;
const deleteProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { projectId } = req.params;
    try {
        const project = yield prisma.project.findUnique({
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
        const teamMember = yield prisma.teamMember.findFirst({
            where: {
                userId,
                teamId: project.teamId,
                role: client_1.TeamMemberRole.OWNER,
            },
        });
        if (!teamMember) {
            res.status(403).json({
                message: "Forbidden: Only the project owner can delete this project",
            });
            return;
        }
        yield prisma.project.delete({ where: { id: Number(projectId) } });
        res.json({ message: "project deleted successfully" });
    }
    catch (error) {
        res
            .status(500)
            .json({ message: "error deleting project", error: error.message });
    }
});
exports.deleteProject = deleteProject;
const getProjectDependencies = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { projectId } = req.params;
        const tasks = yield prisma.task.findMany({
            where: { projectId: Number(projectId) },
        });
        const taskIds = tasks.map((task) => task.id);
        const dependencies = yield prisma.taskDependency.findMany({
            where: {
                dependentTaskId: { in: taskIds },
                prerequisiteTaskId: { in: taskIds },
            },
        });
        res.json(dependencies);
    }
    catch (error) {
        res.status(500).json({
            message: "error retrieving project dependencies",
            error: error.message,
        });
    }
});
exports.getProjectDependencies = getProjectDependencies;
const getProjectTeamMembers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { projectId } = req.params;
    const userId = extractAuthUser(req);
    if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    try {
        const project = yield prisma.project.findUnique({
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
        const isMember = project.team.members.some((member) => member.userId === userId);
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
    }
    catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error fetching project team members:", error);
        res.status(500).json({ error: "Failed to fetch project team members" });
    }
});
exports.getProjectTeamMembers = getProjectTeamMembers;
