import { Request, Response } from "express";

export const handleFileUpload = (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ message: "No file provided" });
    return;
  }

  const relativeUrl = `/uploads/${req.file.filename}`;

  res.status(201).json({
    url: relativeUrl,
    fileName: req.file.originalname,
    fileType: req.file.mimetype ?? null,
    fileSize: req.file.size ?? null,
  });
};
