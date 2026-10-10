import type { Request, Response, NextFunction } from "express";
import { createClerkClient } from "@clerk/express";

// Same admin-instance client used in makeAdmin.ts — keep them in sync.
const adminClerkClient = createClerkClient({
  secretKey: process.env.ADMIN_CLERK_SECRET_KEY,
});

export const requireAdminAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Verifies the incoming request's session token against the ADMIN
    // Clerk instance specifically (not the default app's instance).
    const requestState = await adminClerkClient.authenticateRequest(req, {
      authorizedParties: process.env.ADMIN_APP_URL
        ? [process.env.ADMIN_APP_URL]
        : undefined,
    });

    if (!requestState.isSignedIn) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized — please sign in",
      });
    }

    const auth = requestState.toAuth();
    const role = (auth.sessionClaims?.metadata as { role?: string } | undefined)
      ?.role;

    if (role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Forbidden — admin access only",
      });
    }

    // Attach for downstream handlers if needed
    (req as any).auth = auth;

    next();
  } catch (error: any) {
    console.error("Admin auth failed:", error?.message || error);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired session",
    });
  }
};