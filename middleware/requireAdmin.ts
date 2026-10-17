
import type {
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";
import {
  clerkMiddleware,
  createClerkClient,
  getAuth,
} from "@clerk/express";

const getSecretKey = () =>
  process.env.CLERK_SECRET_KEY ||
  process.env.ADMIN_CLERK_SECRET_KEY;

const getPublishableKey = () =>
  process.env.CLERK_PUBLISHABLE_KEY ||
  process.env.ADMIN_CLERK_PUBLISHABLE_KEY;

let adminAuthMw: RequestHandler | undefined;
let adminClient: ReturnType<typeof createClerkClient> | undefined;

const getAdminAuthMw = (): RequestHandler => {
  const secretKey = getSecretKey();
  const publishableKey = getPublishableKey();

  if (!secretKey || !publishableKey) {
    throw new Error("Clerk keys are missing from server configuration");
  }

  adminAuthMw ??= clerkMiddleware({
    secretKey,
    publishableKey,
    authorizedParties: process.env.ADMIN_APP_URL
      ? [process.env.ADMIN_APP_URL]
      : undefined,
  }) as RequestHandler;

  return adminAuthMw;
};

const getAdminClient = () => {
  const secretKey = getSecretKey();

  if (!secretKey) {
    throw new Error("Clerk Secret Key is missing");
  }

  adminClient ??= createClerkClient({ secretKey });
  return adminClient;
};

export const requireAdminAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!getSecretKey() || !getPublishableKey()) {
    return res.status(500).json({
      success: false,
      message: "Clerk authentication is not configured",
    });
  }

  getAdminAuthMw()(req, res, async (err?: unknown) => {
    if (err) {
      console.error("Admin auth failed:", (err as Error).message);
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
          message: "Please sign in again",
        });
      }

      const clerkUser = await getAdminClient().users.getUser(auth.userId);
      const role = (
        clerkUser.publicMetadata as { role?: string } | undefined
      )?.role;

      if (role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Forbidden. Admin access only.",
        });
      }

      next();
    } catch (error: any) {
      console.error("Admin role check failed:", error?.message || error);

      return res.status(500).json({
        success: false,
        message: "Could not verify admin access",
      });
    }
  });
};
