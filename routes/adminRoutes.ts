import { Router } from "express";
import upload from "../middleware/upload.js";
import Review from "../models/Review.js";

import {
  getDashboardStats,
  getAdminProducts,
  updateAdminProduct,
  getAdminCategories,
  getAdminOrders,
  updateAdminOrderStatus,
  getAdminCustomers,
} from "../controllers/adminControllers.js";

import {
  createProduct,
  deleteProduct,
  updateProductStock,
} from "../controllers/productControllers.js";

// This router is mounted behind requireAdminAuth in server/index.ts.
// Every endpoint below therefore requires admin authorization.
const router = Router();

// GET /api/admin/reviews
router.get("/reviews", async (_req, res) => {
  try {
    const reviews = await Review.find({})
    .sort({ createdAt: -1 })
    .lean();

    return res.status(200).json({
      success: true,
      reviews,
    });
  } catch (error) {
    console.error("GET_ADMIN_REVIEWS_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer reviews.",
    });
  }
});

// Dashboard statistics
router.get("/stats", getDashboardStats);

// Products
router.get("/products", getAdminProducts);
router.post("/products", upload.array("images", 5), createProduct);
router.put("/products/:id", upload.array("images", 5), updateAdminProduct);
router.patch("/products/:id/stock", updateProductStock);
router.delete("/products/:id", deleteProduct);

// Categories
router.get("/categories", getAdminCategories);

// Orders
router.get("/orders", getAdminOrders);
router.patch("/orders/:orderId/status", updateAdminOrderStatus);

// Customers
router.get("/customers", getAdminCustomers);

export default router;
