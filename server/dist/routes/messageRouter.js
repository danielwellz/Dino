"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const messageController_1 = require("../controllers/messageController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get("/", auth_1.authMiddleware, messageController_1.getConversations);
router.post("/", auth_1.authMiddleware, messageController_1.createConversation);
router.get("/team/:teamId", auth_1.authMiddleware, messageController_1.getTeamMessages);
router.get("/:conversationId/messages", auth_1.authMiddleware, messageController_1.getConversationMessages);
router.post("/:conversationId/messages", auth_1.authMiddleware, messageController_1.postConversationMessage);
router.post("/messages/:messageId/pin", auth_1.authMiddleware, messageController_1.updateMessagePin);
router.post("/messages/:messageId/receipt", auth_1.authMiddleware, messageController_1.acknowledgeMessage);
exports.default = router;
