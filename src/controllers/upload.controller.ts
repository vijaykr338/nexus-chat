import type { Request, Response } from "express";
import cloudinary from "../config/cloudinary.js";
import { logger } from "../utils/logger.js";

export async function uploadFile(req: Request, res: Response) {
  const file = req.file;

  if (!file) {
    logger.warn("upload_no_file", { path: req.path, ip: req.ip });
    return res.status(400).json({ error: "No file uploaded" });
  }

  const meta = {
    originalName: (file as any).originalname,
    mimeType: file.mimetype,
    size: (file as any).size ?? (file as any).buffer?.length,
    route: req.path,
    userId: (req as any).user?.id,
  };

  logger.info("upload_start", meta);

  try {
    // Convert buffer → base64
    const base64 = file.buffer.toString("base64");
    const dataURI = `data:${file.mimetype};base64,${base64}`;

    const isImage = file.mimetype.startsWith("image/");
    const isVideo = file.mimetype.startsWith("video/");
    const isAudio = file.mimetype.startsWith("audio/");

    // Cloudinary serves documents like PDF more reliably via raw delivery.
    const resourceType = isImage ? "image" : isVideo || isAudio ? "video" : "raw";

    const result = await cloudinary.uploader.upload(dataURI, {
      resource_type: resourceType,
    });

    logger.info("upload_success", {
      ...meta,
      publicId: result.public_id,
      url: result.secure_url,
      resourceType: result.resource_type,
    });

    res.json({
      url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
    });
  } catch (err: any) {
    logger.error("upload_error", { ...meta, error: err?.message ?? String(err) });
    res.status(500).json({ error: "Upload failed" });
  }
}