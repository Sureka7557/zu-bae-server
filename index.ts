import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import connectDB from "./config/db.js";
import user from "./routes/user.js"
import { clerkMiddleware } from "@clerk/express";
import { requireAdminAuth } from "./middleware/requireAdmin.js";
import clerkwebhook from "./controllers/webhooks.js";
import makeAdmin from "./scripts/makeAdmin.js";
import cartRoutes from "./routes/cartRoutes.js"
import productRoutes from "./routes/productRoutes.js";
import OrderRouter from "./routes/orderRoutes.js";
import AddressRouter from "./routes/addressRoutes.js";
import AdminRouter from "./routes/adminRoutes.js";

dotenv.config();

const app = express();


await connectDB();

app.use(
  cors({
    origin: [
      "http://localhost:5173", // Admin dashboard
      "http://localhost:8081", // Expo / React Native web if used
       "https://your-admin-dashboard.vercel.app",
    ],
    credentials: true,
  })
);

app.post(
  "/api/clerk",
  express.raw({
    type: "application/json",
  }),
  clerkwebhook
);

app.use(express.json());


app.use(clerkMiddleware());


app.use(
  "/api/products",
  productRoutes
);
app.use(
  "/api/carts",
  cartRoutes
);
app.use(
  "/api/orders", 
  OrderRouter
);
app.use(
  "/api/address",
  AddressRouter
);
app.use(
  "/api/admin",
  requireAdminAuth,
  AdminRouter
)
app.use("/api/users", user);
app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "E-Commerce API is running",
  });
});


await makeAdmin();


export default app;