import { Router } from "express";
import upload from "../middleware/upload.js";
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

// Mounted in index.ts as: app.use("/api/admin", requireAdminAuth, AdminRouter)
// so every route below is already admin-only.
const router = Router();

router.get("/stats", getDashboardStats);

router.get("/products", getAdminProducts);
router.post("/products", upload.array("images", 5), createProduct);
router.put("/products/:id", upload.array("images", 5), updateAdminProduct);
router.patch("/products/:id/stock", updateProductStock);
router.delete("/products/:id", deleteProduct);

router.get("/categories", getAdminCategories);

router.get("/orders", getAdminOrders);
router.patch("/orders/:orderId/status", updateAdminOrderStatus);

router.get("/customers", getAdminCustomers);

export default router;
