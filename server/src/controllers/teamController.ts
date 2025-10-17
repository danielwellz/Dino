import { Request, Response } from 'express';
import { PrismaClient, TeamMemberRole } from '@prisma/client';
import { verifyAccessToken } from '../utils/jwt';
const prisma = new PrismaClient();

// Get all teams that the user is a member of
export const getAllTeams = async (req: Request, res: Response) => {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = verifyAccessToken(token as string);
    
    if (!decoded) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        const teams = await prisma.team.findMany({
            where: {
                members: {
                    some: {
                        userId: Number(decoded.userId)
                    }
                }
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                userId: true,
                                username: true,
                                email: true,
                                profilePictureUrl: true
                            }
                        }
                    }
                },
                projects: {
                    select: {
                        id: true,
                        name: true,
                        status: true
                    }
                }
            }
        });
        
        res.status(200).json(teams);
    } catch (error: any) {
        console.error('Error fetching teams:', error);
        res.status(500).json({ error: 'Failed to fetch teams' });
    }
};

// Add a member to a team
export const addTeamMember = async (req: Request, res: Response) => {
    const { teamId, userId, role } = req.body as {
        teamId: number;
        userId: number;
        role?: TeamMemberRole | string;
    };
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = verifyAccessToken(token as string);
    
    if (!decoded) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        if (!teamId || !userId) {
            return res.status(400).json({ error: 'teamId and userId are required' });
        }

        // Check if the requesting user is a team admin
        // const requestingUserMembership = await prisma.teamMember.findFirst({
        //     where: {
        //         teamId: Number(teamId),
        //         userId: Number(decoded.userId),
        //         role: TeamMemberRole.OWNER
        //     }
        // });

        // if (!requestingUserMembership) {
        //     return res.status(403).json({ error: 'Only team admins can add members' });
        // }

        // Check if user is already a member
        const existingMember = await prisma.teamMember.findFirst({
            where: {
                teamId: Number(teamId),
                userId: Number(userId)
            }
        });

        if (existingMember) {
            return res.status(409).json({ error: 'User is already a team member' });
        }

        const assignedRole = (role && Object.values(TeamMemberRole).includes(role as TeamMemberRole))
            ? role as TeamMemberRole
            : TeamMemberRole.MEMBER;

        // Add the new team member
        const newTeamMember = await prisma.teamMember.create({
            data: {
                teamId: Number(teamId),
                userId: Number(userId),
                role: assignedRole
            },
            include: {
                user: {
                    select: {
                        userId: true,
                        username: true,
                        email: true,
                        profilePictureUrl: true
                    }
                }
            }
        });

        res.status(201).json(newTeamMember);
    } catch (error: any) {
        console.error('Error adding team member:', error);
        res.status(500).json({ error: 'Failed to add team member' });
    }
};

// Remove a member from a team
export const removeTeamMember = async (req: Request, res: Response) => {
    const { teamId, userId: memberUserId } = req.params;
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = verifyAccessToken(token as string);
    
    if (!decoded) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const teamIdNumber = Number(teamId);
        const memberIdNumber = Number(memberUserId);

        if (Number.isNaN(teamIdNumber) || Number.isNaN(memberIdNumber)) {
            return res.status(400).json({ error: 'teamId and memberId must be numbers' });
        }

        // Check if the requesting user is a team admin
        const requestingUserMembership = await prisma.teamMember.findFirst({
            where: {
                teamId: teamIdNumber,
                userId: Number(decoded.userId),
                role: TeamMemberRole.OWNER
            }
        });

        if (!requestingUserMembership) {
            return res.status(403).json({ error: 'Only team admins can remove members' });
        }

        // Prevent removing the last admin
        const adminCount = await prisma.teamMember.count({
            where: {
                teamId: teamIdNumber,
                role: TeamMemberRole.OWNER
            }
        });

        const memberToRemove = await prisma.teamMember.findFirst({
            where: {
                teamId: teamIdNumber,
                userId: memberIdNumber
            }
        });

        if (!memberToRemove) {
            return res.status(404).json({ error: 'Team member not found' });
        }

        if (adminCount === 1 && memberToRemove?.role === TeamMemberRole.OWNER) {
            return res.status(400).json({ error: 'Cannot remove the last admin from the team' });
        }

        // Remove the team member
        await prisma.teamMember.delete({
            where: {
                id: memberToRemove.id
            }
        });

        res.status(200).json({ message: 'Team member removed successfully' });
    } catch (error: any) {
        console.error('Error removing team member:', error);
        res.status(500).json({ error: 'Failed to remove team member' });
    }
};



// update team member role
export const updateTeamMemberRole = async (req: Request, res: Response) => {
    const { teamId, userId: memberUserId } = req.params;
    const { newRole } = req.body as { newRole: TeamMemberRole | string };
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = verifyAccessToken(token as string);
    
    if (!decoded) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const teamIdNumber = Number(teamId);
        const memberIdNumber = Number(memberUserId);

        if (Number.isNaN(teamIdNumber) || Number.isNaN(memberIdNumber)) {
            return res.status(400).json({ error: 'teamId and memberId must be numbers' });
        }

        if (!newRole || !Object.values(TeamMemberRole).includes(newRole as TeamMemberRole)) {
            return res.status(400).json({ error: 'Invalid role selection' });
        }

        // Check if the requesting user is a team admin
        const requestingUserMembership = await prisma.teamMember.findFirst({
            where: {
                teamId: teamIdNumber,
                userId: Number(decoded.userId),
                role: TeamMemberRole.OWNER
            }
        });

        if (!requestingUserMembership) {
            return res.status(403).json({ error: 'Only team admins can update member roles' });
        }

        const memberToUpdate = await prisma.teamMember.findFirst({
            where: {
                teamId: teamIdNumber,
                userId: memberIdNumber
            }
        });

        if (!memberToUpdate) {
            return res.status(404).json({ error: 'Team member not found' });
        }

        // Prevent removing the last admin
        if (memberToUpdate.role === TeamMemberRole.OWNER && newRole !== TeamMemberRole.OWNER) {
            const adminCount = await prisma.teamMember.count({
                where: {
                    teamId: teamIdNumber,
                    role: TeamMemberRole.OWNER
                }
            });

            if (adminCount === 1) {
                return res.status(400).json({ error: 'Cannot remove the last admin from the team' });
            }
        }

        const updatedMember = await prisma.teamMember.update({
            where: {
                id: memberToUpdate.id
            },
            data: {
                role: newRole as TeamMemberRole
            },
            include: {
                user: {
                    select: {
                        userId: true,
                        username: true,
                        email: true,
                        profilePictureUrl: true
                    }
                }
            }
        });

        res.status(200).json(updatedMember);
    } catch (error: any) {
        console.error('Error updating team member role:', error);
        res.status(500).json({ error: 'Failed to update team member role' });
    }
};
