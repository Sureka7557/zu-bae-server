import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db";
import { clerkMiddleware } from '@clerk/express'

dotenv.config();

const app = express();

await connectDB();

app.use(cors());
app.use(express.json());
app.use(clerkMiddleware())

app.get("/", (_req, res) => {
  res.json({
    message: "E-Commerce API is running",
  });
});

export default app;