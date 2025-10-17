import { Router } from "express";
import {
  addMoodboardItem,
  addScenarioBlock,
  addStoryboardFrame,
  createMoodboard,
  createScenario,
  createStoryboard,
  listMoodboards,
  listScenarios,
  listStoryboards,
  updateMoodboardItem,
  updateScenarioBlock,
  updateStoryboardFrame,
} from "../controllers/creativeController";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.get("/moodboards", authMiddleware, listMoodboards);
router.post("/moodboards", authMiddleware, createMoodboard);
router.post("/moodboards/:moodboardId/items", authMiddleware, addMoodboardItem);
router.patch(
  "/moodboards/:moodboardId/items/:itemId",
  authMiddleware,
  updateMoodboardItem,
);

router.get("/storyboards", authMiddleware, listStoryboards);
router.post("/storyboards", authMiddleware, createStoryboard);
router.post(
  "/storyboards/:storyboardId/frames",
  authMiddleware,
  addStoryboardFrame,
);
router.patch(
  "/storyboards/:storyboardId/frames/:frameId",
  authMiddleware,
  updateStoryboardFrame,
);

router.get("/scenarios", authMiddleware, listScenarios);
router.post("/scenarios", authMiddleware, createScenario);
router.post("/scenarios/:scenarioId/blocks", authMiddleware, addScenarioBlock);
router.patch(
  "/scenarios/:scenarioId/blocks/:blockId",
  authMiddleware,
  updateScenarioBlock,
);

export default router;
