import multer from "multer";
import { loadConfig } from "../config/env.js";

const cfg = loadConfig();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, cfg.uploads.dir),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const safeBase = (file.originalname || "video").replace(/\s+/g, "_");
    cb(null, `${ts}-${safeBase}`);
  }
});

function fileFilter(_req, file, cb) {
  // Prefer video/* but allow octet-stream for CLI uploads
  if (file.mimetype && (file.mimetype.startsWith("video/") || file.mimetype === "application/octet-stream")) {
    return cb(null, true);
  }
  cb(new Error("Only video files are allowed"));
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: cfg.uploads.maxFileSize
  }
});