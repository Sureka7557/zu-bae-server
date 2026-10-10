import { createClerkClient } from "@clerk/express";
import User from "../models/User.js";

// Separate client bound to the ADMIN Clerk application's secret key,
// distinct from the default `clerkClient` used for the main app.
const adminClerkClient = createClerkClient({
  secretKey: process.env.ADMIN_CLERK_SECRET_KEY,
});

const makeAdmin = async () => {
  try {
    const email = process.env.ADMIN_EMAIL?.trim();

    if (!email) {
      console.error("ADMIN_EMAIL is not configured in .env");
      return;
    }

    console.log(`Looking for admin user: ${email}`);

    // Find user in MongoDB
    const user = await User.findOne({ email });

    if (!user) {
      console.error(
        `User with email ${email} was not found in MongoDB.`
      );
      return;
    }

    // Find user in the ADMIN Clerk instance using email
    const clerkUsers = await adminClerkClient.users.getUserList({
      emailAddress: [email],
      limit: 1,
    });

    if (!clerkUsers.data || clerkUsers.data.length === 0) {
      console.error(
        `User with email ${email} was not found in the admin Clerk instance.`
      );
      return;
    }

    const clerkUser = clerkUsers.data[0];

    if (!clerkUser) {
      console.error("Admin Clerk user could not be found.");
      return;
    }

    console.log(`Admin Clerk user found: ${clerkUser.id}`);

    // Update MongoDB
    user.role = "admin";

    await user.save();

    console.log("MongoDB role updated to admin");

    // Update admin Clerk instance metadata
    await adminClerkClient.users.updateUserMetadata(clerkUser.id, {
      publicMetadata: {
        role: "admin",
      },
    });

    console.log("Admin Clerk role updated to admin");
    console.log(`${email} is now an admin!`);
  } catch (error: any) {
    console.error(
      "Admin promotion failed:",
      error?.message || error
    );

    if (error?.status) {
      console.error("Status:", error.status);
    }

    if (error?.errors) {
      console.error("Clerk errors:", error.errors);
    }
  }
};

export default makeAdmin;