import { createClerkClient } from "@clerk/express";
import User from "../models/User.js";

// Promotes ADMIN_EMAIL to admin. The account must already exist in the ADMIN
// Clerk app (sign up once on the dashboard's /signup page), then restart the
// server. The MongoDB role is updated too if a matching user exists.
const makeAdmin = async () => {
  try {
    const email = process.env.ADMIN_EMAIL?.trim();
    const secretKey = process.env.ADMIN_CLERK_SECRET_KEY;

    if (!email) {
      console.error("ADMIN_EMAIL is not configured in .env");
      return;
    }
    if (!secretKey) {
      console.error("ADMIN_CLERK_SECRET_KEY is not configured in .env");
      return;
    }

    const adminClerkClient = createClerkClient({ secretKey });

    const clerkUsers = await adminClerkClient.users.getUserList({
      emailAddress: [email],
      limit: 1,
    });

    const clerkUser = clerkUsers.data?.[0];
    if (!clerkUser) {
      console.error(
        `No account for ${email} in the admin Clerk app yet. Sign up on the dashboard first, then restart the server.`
      );
      return;
    }

    const currentRole = (clerkUser.publicMetadata as { role?: string } | undefined)?.role;
    if (currentRole !== "admin") {
      await adminClerkClient.users.updateUserMetadata(clerkUser.id, {
        publicMetadata: { role: "admin" },
      });
      console.log(`${email} is now an admin in the admin Clerk app`);
    }

    // Optional: keep the MongoDB role in sync when the same email exists there.
    const result = await User.updateOne({ email }, { $set: { role: "admin" } });
    if (result.matchedCount > 0) console.log("MongoDB role set to admin");
  } catch (error: any) {
    console.error("Admin promotion failed:", error?.message || error);
    if (error?.errors) console.error("Clerk errors:", error.errors);
  }
};

export default makeAdmin;
