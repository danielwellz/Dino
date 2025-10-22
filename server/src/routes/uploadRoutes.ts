import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { authMiddleware } from "../middleware/auth";
import { handleFileUpload } from "../controllers/uploadController";

const router = express.Router();

const uploadsRoot = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsRoot);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const extension = path.extname(file.originalname);
    cb(null, `${unique}${extension}`);
  },
});

const uploader = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.post("/", authMiddleware, uploader.single("file"), handleFileUpload);

export default router;
