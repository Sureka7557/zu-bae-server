
import { Router } from "express";
import { getAuth } from "@clerk/express";
import User from "../models/User.js";

const router = Router();

// --------------------------------------------------
// GET /api/users/me
// Load the signed-in user's MongoDB profile.
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
        message: "User profile not found.",
      });
    }

    return res.status(200).json(user);
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
// PUT /api/users/me/avatar-url
// Save the already-uploaded Clerk avatar URL to MongoDB.
// JSON body: { "image": "https://..." }
// --------------------------------------------------
router.put("/me/avatar-url", async (req, res) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized. Please sign in.",
      });
    }

    const { image } = req.body as { image?: string };

    if (typeof image !== "string" || !image.trim()) {
      return res.status(400).json({
        message: "Avatar image URL is required.",
      });
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(image);
    } catch {
      return res.status(400).json({
        message: "Invalid avatar URL.",
      });
    }

    // Accept HTTPS image URLs hosted by Clerk.
    const hostname = parsedUrl.hostname.toLowerCase();

    const isClerkHost =
      hostname === "img.clerk.com" ||
      hostname.endsWith(".clerk.accounts.dev") ||
      hostname === "clerk.accounts.dev" ||
      hostname.endsWith(".clerk.com");

    if (parsedUrl.protocol !== "https:" || !isClerkHost) {
      return res.status(400).json({
        message: "A valid Clerk HTTPS avatar URL is required.",
      });
    }

    const updatedUser = await User.findOneAndUpdate(
      { clerkId: userId },
      {
        $set: {
          image: parsedUrl.toString(),
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedUser) {
      return res.status(404).json({
        message:
          "User profile not found in MongoDB. Create the user record first.",
      });
    }

    console.log("AVATAR_URL_DATABASE_SUCCESS:", { userId });

    return res.status(200).json({
      message: "Avatar URL saved to MongoDB successfully.",
      image: updatedUser.image,
      user: updatedUser,
    });
  } catch (err: any) {
    console.error("AVATAR_URL_DATABASE_ERROR:", {
      name: err?.name,
      message: err?.message,
    });

    return res.status(500).json({
      message: "Failed to save avatar URL to the database.",
    });
  }
});

// --------------------------------------------------
// PUT /api/users/me
// Update the signed-in user's name in MongoDB.
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
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedUser) {
      return res.status(404).json({
        message: "User profile not found.",
      });
    }

    return res.status(200).json(updatedUser);
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
