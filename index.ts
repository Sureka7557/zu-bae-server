// Must be the first import so every module below sees the .env values.
import "dotenv/config";

import express from "express";
import type { NextFunction, Request, Response } from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";

import connectDB from "./config/db.js";
import user from "./routes/user.js";
import { requireAdminAuth } from "./middleware/requireAdmin.js";
import clerkwebhook from "./controllers/webhooks.js";
import makeAdmin from "./scripts/makeAdmin.js";
import cartRoutes from "./routes/cartRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import OrderRouter from "./routes/orderRoutes.js";
import AddressRouter from "./routes/addressRoutes.js";
import AdminRouter from "./routes/adminRoutes.js";
import reviewsRouter from "./routes/reviews.js";

const app = express();

await connectDB();

const allowedOrigins = [
  "http://localhost:5173", // Admin dashboard (Vite)
  "http://localhost:8081", // Expo / React Native web
  process.env.ADMIN_APP_URL,
  ...(process.env.CORS_ORIGINS?.split(",") ?? []),
]
  .map((o) => o?.trim())
  .filter((o): o is string => Boolean(o));

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Clerk webhook needs the raw body, so it goes before express.json().
app.post("/api/clerk", express.raw({ type: "application/json" }), clerkwebhook);

app.use(express.json());

// Main (customer) Clerk app. Admin routes re-verify against the admin app.
app.use(clerkMiddleware());

app.use("/api/products", productRoutes);
app.use("/api/carts", cartRoutes);
app.use("/api/orders", OrderRouter);
app.use("/api/address", AddressRouter);
app.use("/api/admin", requireAdminAuth, AdminRouter);
app.use("/api/users", user);
app.use("/api/reviews", reviewsRouter);

app.get("/", (_req, res) => {
  res.json({ success: true, message: "E-Commerce API is running" });
});

// JSON errors (e.g. image too large, wrong file type) instead of an HTML page.
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err?.name === "MulterError" ? 400 : err?.status ?? 500;
  res.status(status).json({ success: false, message: err?.message || "Server error" });
});

await makeAdmin();

// Vercel runs the exported app itself; locally we need to listen.
const PORT = Number(process.env.PORT) || 5000;
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
}

export default app;
