import type { Request, Response, NextFunction } from "express";
import { clerkClient } from "@clerk/express";
import User from "../models/User.js";

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = await req.auth();

    if (!userId) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }

    let user = await User.findOne({ clerkId: userId });

    // The Clerk webhook can't reach localhost, and it can lag on first sign-up.
    // Create the user on demand instead of letting req.user be null.
    if (!user) {
      const cu = await clerkClient.users.getUser(userId);
      const email =
        cu.primaryEmailAddress?.emailAddress ?? cu.emailAddresses[0]?.emailAddress;

      try {
        user = await User.findOneAndUpdate(
          { clerkId: userId },
          {
            $setOnInsert: {
              clerkId: userId,
              email,
              name: `${cu.firstName ?? ""} ${cu.lastName ?? ""}`.trim(),
              image: cu.imageUrl,
            },
          },
          { upsert: true, new: true }
        );
      } catch (err: any) {
        if (err?.code === 11000) {
          return res.status(409).json({
            success: false,
            message: "An account with this email already exists",
          });
        }
        throw err;
      }
    }

    req.user = user!;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    res.status(500).json({ success: false, message: "Authentication failed" });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "User role is not authorized to access this route",
      });
    }
    next();
  };
};