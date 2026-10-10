import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import {
  getProducts,
  getProduct,
  getFeaturedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStock,
} from "../controllers/productControllers.js";

const ProductRouter = express.Router();

// Get all products
ProductRouter.get("/", getProducts);

// Featured products (must be BEFORE "/:id" or "featured" is treated as an id)
ProductRouter.get("/featured", getFeaturedProducts);

// Get single product
ProductRouter.get("/:id", getProduct);

// Create product (Admin only) - check auth BEFORE accepting file uploads
ProductRouter.post("/", protect, authorize("admin"), upload.array("images", 5), createProduct);

// Update product (Admin only)
ProductRouter.put("/:id", protect, authorize("admin"), upload.array("images", 5), updateProduct);

// Adjust stock (Admin only)
ProductRouter.patch("/:id/stock", protect, authorize("admin"), updateProductStock);

// Delete product (Admin only)
ProductRouter.delete("/:id", protect, authorize("admin"), deleteProduct);

export default ProductRouter;