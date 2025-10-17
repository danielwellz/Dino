import { Router } from "express";
import {
  createAssetFolder,
  createAssetRecord,
  createAssetTag,
  listAssetFolders,
  listAssetTags,
  listAssets,
} from "../controllers/assetController";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.get("/folders", authMiddleware, listAssetFolders);
router.post("/folders", authMiddleware, createAssetFolder);
router.get("/", authMiddleware, listAssets);
router.post("/", authMiddleware, createAssetRecord);
router.get("/tags", authMiddleware, listAssetTags);
router.post("/tags", authMiddleware, createAssetTag);

export default router;
