import { Router } from "express";
import { requireAdminAuth } from "../middleware/requireAdmin.js";
import { getDashboardStats } from "../controllers/adminControllers.js";

const router = Router();

router.get("/stats", requireAdminAuth, getDashboardStats);

export default router;