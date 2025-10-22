import express from "express";
import { addTeamMember, deleteTeam, getAllTeams, leaveTeam, removeTeamMember, updateTeamMemberRole } from "../controllers/teamController";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();

router.get("/",authMiddleware,getAllTeams );
router.post("/members",authMiddleware,addTeamMember);
router.delete("/:teamId/members/:userId",authMiddleware,removeTeamMember);
router.patch("/:teamId/members/:userId/role",authMiddleware,updateTeamMemberRole);
router.post("/:teamId/leave", authMiddleware, leaveTeam);
router.delete("/:teamId", authMiddleware, deleteTeam);

export default router;
