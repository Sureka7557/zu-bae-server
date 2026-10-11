import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { getAuth } from "@clerk/express";
import User from "../models/User.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

// Returns multer errors (file too large, wrong type) as clean 400 responses
const handleAvatarUpload = (req: Request, res: Response, next: NextFunction) => {
  upload.single("image")(req, res, (err: any) => {
    if (err) {
      console.error("MULTER_ERROR:", err?.message);
      return res.status(400).json({
        message:
          err?.code === "LIMIT_FILE_SIZE"
            ? "Image must be smaller than 5 MB"
            : err?.message || "Invalid upload",
      });
    }
    next();
  });
};

const router = Router();

// GET /api/users/me
router.get("/me", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findOne({ clerkId: userId });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(user);
  } catch (err) {
    console.error("GET /me error:", err);
    return res.status(500).json({ message: "Failed to load profile" });
  }
});

// PUT /api/users/me/avatar  (multipart/form-data, field name: "image")
router.put("/me/avatar", handleAvatarUpload, async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    if (!req.file) {
      return res.status(400).json({ message: "No image provided" });
    }

    const uploaded: any = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: "avatars",
            public_id: userId,
            overwrite: true,
            invalidate: true,
            resource_type: "image",
          },
          (error, result) => (error ? reject(error) : resolve(result))
        )
        .end(req.file!.buffer);
    });

    const imageUrl = `${uploaded.secure_url}?v=${uploaded.version}`;

    const user = await User.findOneAndUpdate(
      { clerkId: userId },
      { image: imageUrl },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json(user);
  } catch (err: any) {
    console.error("AVATAR_UPLOAD_DEBUG:", {
      name: err?.name,
      message: err?.message,
      http_code: err?.http_code,
      cloudinaryError: err?.error?.message,
      stack: err?.stack,
    });

    return res.status(500).json({
      message: err?.message || "Image upload failed",
    });
  }
});

// PUT /api/users/me
router.put("/me", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { name } = req.body as { name?: string };

    const user = await User.findOneAndUpdate(
      { clerkId: userId },
      { ...(name !== undefined && { name: name.trim() }) },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json(user);
  } catch (err) {
    console.error("PUT /me error:", err);
    return res.status(500).json({ message: "Failed to update profile" });
  }
});

export default router;