
import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { getAuth } from "@clerk/express";
import User from "../models/User.js";

const router = Router();

// --------------------------------------------------
// CLOUDINARY CONFIGURATION
// --------------------------------------------------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --------------------------------------------------
// IMAGE UPLOAD CONFIGURATION
// --------------------------------------------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, WEBP, and GIF images are allowed"));
    }
  },
});

// Convert Multer errors to useful responses.
const handleAvatarUpload = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  upload.single("image")(req, res, (err: any) => {
    if (err) {
      console.error("MULTER_ERROR:", {
        name: err?.name,
        code: err?.code,
        message: err?.message,
      });

      const tooLarge = err?.code === "LIMIT_FILE_SIZE";

      return res.status(tooLarge ? 413 : 400).json({
        message: tooLarge
          ? "Image must be smaller than 5 MB."
          : err?.message || "Invalid image upload.",
      });
    }

    next();
  });
};

// --------------------------------------------------
// GET /api/users/me
// --------------------------------------------------
router.get("/me", async (req, res) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized. Please sign in.",
      });
    }

    const user = await User.findOne({ clerkId: userId });

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.json(user);
  } catch (err: any) {
    console.error("GET_PROFILE_ERROR:", {
      name: err?.name,
      message: err?.message,
    });

    return res.status(500).json({
      message: "Failed to load profile.",
    });
  }
});

// --------------------------------------------------
// PUT /api/users/me/avatar
// Multipart form-data field: image
// --------------------------------------------------
router.put("/me/avatar", handleAvatarUpload, async (req, res) => {
  try {
    // 1. Verify Clerk authentication.
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized. Please sign in again.",
      });
    }

    // 2. Verify that an image was received.
    if (!req.file) {
      return res.status(400).json({
        message: "No image provided.",
      });
    }

    // 3. Verify Cloudinary configuration without exposing secrets.
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    console.log("AVATAR_UPLOAD_START:", {
      cloudNameConfigured: Boolean(cloudName),
      apiKeyConfigured: Boolean(apiKey),
      apiSecretConfigured: Boolean(apiSecret),
      fileReceived: Boolean(req.file),
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    });

    if (!cloudName || !apiKey || !apiSecret) {
      console.error("CLOUDINARY_CONFIG_ERROR: Missing environment variable");

      return res.status(500).json({
        message: "Image service is not configured correctly.",
      });
    }

    // 4. Upload the image to Cloudinary.
    const uploaded: any = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "avatars",
          public_id: userId,
          overwrite: true,
          invalidate: true,
          resource_type: "image",
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          if (!result?.secure_url) {
            reject(new Error("Cloudinary returned no secure image URL."));
            return;
          }

          resolve(result);
        }
      );

      stream.end(req.file!.buffer);
    });

    console.log("CLOUDINARY_UPLOAD_SUCCESS:", {
      publicId: uploaded.public_id,
      version: uploaded.version,
    });

    // 5. Save the uploaded image URL in MongoDB.
    const imageUrl = `${uploaded.secure_url}?v=${uploaded.version}`;

    const updatedUser = await User.findOneAndUpdate(
      { clerkId: userId },
      { $set: { image: imageUrl } },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      console.error("AVATAR_DATABASE_ERROR: User not found", { userId });

      return res.status(404).json({
        message: "Image uploaded, but the user profile was not found.",
      });
    }

    console.log("AVATAR_UPLOAD_SUCCESS:", { userId });

    return res.status(200).json({
      message: "Profile photo updated successfully.",
      image: updatedUser.image,
      user: updatedUser,
    });
  } catch (err: any) {
    // Log diagnostics without logging credentials or tokens.
    console.error("CLOUDINARY_UPLOAD_FAILURE:", {
      name: err?.name,
      message: err?.message,
      http_code: err?.http_code,
      error: err?.error,
      response: err?.response,
      responseBody: err?.response?.body,
      responseHeaders: err?.response?.headers,
    });

    return res.status(500).json({
      message: "Image upload failed. Check backend logs.",
    });
  }
});

// --------------------------------------------------
// PUT /api/users/me
// Update the current user's name.
// --------------------------------------------------
router.put("/me", async (req, res) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized. Please sign in.",
      });
    }

    const { name } = req.body as { name?: string };

    if (name !== undefined && typeof name !== "string") {
      return res.status(400).json({
        message: "Name must be a string.",
      });
    }

    const update: { name?: string } = {};

    if (name !== undefined) {
      update.name = name.trim();
    }

    const updatedUser = await User.findOneAndUpdate(
      { clerkId: userId },
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.json(updatedUser);
  } catch (err: any) {
    console.error("UPDATE_PROFILE_ERROR:", {
      name: err?.name,
      message: err?.message,
    });

    return res.status(500).json({
      message: "Failed to update profile.",
    });
  }
});

export default router;
