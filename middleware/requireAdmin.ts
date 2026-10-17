import type { Request, Response, NextFunction, RequestHandler } from "express";
import { clerkMiddleware, createClerkClient, getAuth } from "@clerk/express";

/**
 * Verifies the Bearer token sent by the admin dashboard against the separate
 * ADMIN Clerk application, then checks that the user has role "admin".
 *
 * Everything is created lazily so it never runs before dotenv has loaded.
 */

let adminAuthMw: RequestHandler | undefined;
let adminClient: ReturnType<typeof createClerkClient> | undefined;

const getAdminAuthMw = (): RequestHandler => {
  adminAuthMw ??= clerkMiddleware({
    secretKey: process.env.ADMIN_CLERK_SECRET_KEY,
    publishableKey: process.env.ADMIN_CLERK_PUBLISHABLE_KEY,
    authorizedParties: process.env.ADMIN_APP_URL
      ? [process.env.ADMIN_APP_URL]
      : undefined,
  }) as RequestHandler;
  return adminAuthMw;
};

const getAdminClient = () => {
  adminClient ??= createClerkClient({
    secretKey: process.env.ADMIN_CLERK_SECRET_KEY,
  });
  return adminClient;
};

// Used only when the session token doesn't carry the role claim.
const roleCache = new Map<string, { role?: string; expires: number }>();
const ROLE_TTL_MS = 60_000;

const lookupRole = async (userId: string): Promise<string | undefined> => {
  const hit = roleCache.get(userId);
  if (hit && hit.expires > Date.now()) return hit.role;

  const user = await getAdminClient().users.getUser(userId);
  const role = (user.publicMetadata as { role?: string } | undefined)?.role;
  roleCache.set(userId, { role, expires: Date.now() + ROLE_TTL_MS });
  return role;
};

export const requireAdminAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!process.env.ADMIN_CLERK_SECRET_KEY || !process.env.ADMIN_CLERK_PUBLISHABLE_KEY) {
    console.error("ADMIN_CLERK_SECRET_KEY / ADMIN_CLERK_PUBLISHABLE_KEY are not set");
    return res.status(500).json({
      success: false,
      message: "Admin authentication is not configured on the server",
    });
  }

  getAdminAuthMw()(req, res, async (err?: unknown) => {
    if (err) {
      console.error("Admin auth failed:", (err as Error)?.message ?? err);
      return res.status(401).json({
        success: false,
        message: "Invalid or expired session",
      });
    }

    try {
      const auth = getAuth(req as any);

      if (!auth.userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized. Please sign in.",
        });
      }

      // 1) role from the session token (needs the custom claim), 2) fall back
      // to reading the user's public metadata from the admin Clerk app.
      let role = (auth.sessionClaims?.metadata as { role?: string } | undefined)?.role;
      if (!role) role = await lookupRole(auth.userId);

      if (role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Forbidden. Admin access only.",
        });
      }

      next();
    } catch (e: any) {
      console.error("Admin role check failed:", e?.message ?? e);
      return res.status(500).json({
        success: false,
        message: "Could not verify admin access",
      });
    }
  });
};
