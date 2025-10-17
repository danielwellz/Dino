import express from "express";
import {
  getTeamMessages,
  getConversations,
  createConversation,
  getConversationMessages,
  postConversationMessage,
  updateMessagePin,
  acknowledgeMessage,
} from "../controllers/messageController";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();

router.get("/", authMiddleware, getConversations);
router.post("/", authMiddleware, createConversation);
router.get("/team/:teamId", authMiddleware, getTeamMessages);
router.get("/:conversationId/messages", authMiddleware, getConversationMessages);
router.post(
  "/:conversationId/messages",
  authMiddleware,
  postConversationMessage,
);
router.post("/messages/:messageId/pin", authMiddleware, updateMessagePin);
router.post(
  "/messages/:messageId/receipt",
  authMiddleware,
  acknowledgeMessage,
);

export default router;
