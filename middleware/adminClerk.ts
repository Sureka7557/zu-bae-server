import { clerkMiddleware } from "@clerk/express";

// Re-verifies the request against the separate ADMIN Clerk application,
// instead of the main app's Clerk instance used everywhere else.
// Mount this ahead of `protect` on admin-only routers.
export const adminClerkMiddleware = clerkMiddleware({
  secretKey: process.env.ADMIN_CLERK_SECRET_KEY,
  publishableKey: process.env.ADMIN_CLERK_PUBLISHABLE_KEY,
});