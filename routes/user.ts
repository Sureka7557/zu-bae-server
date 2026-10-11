import { Router } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { getAuth } from "@clerk/express";
import User from "../models/User.js";

/**
 * Required env vars:
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 *
 * Install:
 *   npm i multer cloudinary
 *   npm i -D @types/multer
 *
 * Mount in your app:
 *   import userRoutes from "./routes/userRoutes.js";
 *   app.use("/api/users", userRoutes);
 */

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

const router = Router();

/**
 * GET /api/users/me
 * Returns the logged-in user's profile from MongoDB.
 * Creates the DB record if it doesn't exist yet.
 */
router.get("/me", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    let user = await User.findOne({ clerkId: userId });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(user);
  } catch (err) {
    console.error("GET /me error:", err);
    return res.status(500).json({ message: "Failed to load profile" });
  }
});

/**
 * PUT /api/users/me/avatar
 * multipart/form-data with field "image".
 * Uploads to Cloudinary and saves the URL in User.image (MongoDB).
 */
router.put("/me/avatar", upload.single("image"), async (req, res) => {
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

    // Cache-bust so the app doesn't keep showing the old picture
    const imageUrl = `${uploaded.secure_url}?v=${uploaded.version}`;

    const user = await User.findOneAndUpdate(
      { clerkId: userId },
      { image: imageUrl },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json(user);
  } catch (err) {
    console.error("PUT /me/avatar error:", err);
    return res.status(500).json({ message: "Image upload failed" });
  }
});

/**
 * PUT /api/users/me
 * Optional: keep name in sync in MongoDB too.
 */
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