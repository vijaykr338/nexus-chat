import type { Request, Response } from "express";
import cloudinary from "../config/cloudinary.js";

export async function uploadFile(req: Request, res: Response) {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Convert buffer → base64
    const base64 = file.buffer.toString("base64");
    const dataURI = `data:${file.mimetype};base64,${base64}`;

    const isImage = file.mimetype.startsWith("image/");
    const isVideo = file.mimetype.startsWith("video/");
    const isAudio = file.mimetype.startsWith("audio/");

    // Cloudinary serves documents like PDF more reliably via raw delivery.
    const resourceType = isImage
      ? "image"
      : isVideo || isAudio
        ? "video"
        : "raw";

    const result = await cloudinary.uploader.upload(dataURI, {
      resource_type: resourceType
    });

    res.json({
      url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
}