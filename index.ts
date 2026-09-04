import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import { clerkMiddleware } from "@clerk/express";
import clerkwebhook from "./controllers/webhooks.js";

dotenv.config();

const app = express();

await connectDB();

app.use(cors());


app.post(
  "/api/clerk",
  express.raw({ type: "application/json" }),
  clerkwebhook
);

app.use(express.json());
app.use(clerkMiddleware());

app.get("/", (_req, res) => {
  res.json({
    message: "E-Commerce API is running",
  });
});

export default app;