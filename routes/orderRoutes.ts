import { Router } from "express";
import {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
} from "../controllers/orderControllers.js";
import { protect, authorize } from "../middleware/auth.js";

const OrderRouter = Router();

// Create a new order from the user's cart
OrderRouter.post("/", protect, createOrder);

// Get the logged-in user's orders
OrderRouter.get("/my-orders", protect, getMyOrders);

// Get all orders (admin only)
OrderRouter.get("/", protect, authorize("admin"), getAllOrders);

// Get a single order by id
OrderRouter.get("/:orderId", protect, getOrderById);

// Update order status (admin only)
OrderRouter.patch("/:orderId/status", protect, authorize("admin"), updateOrderStatus);

// Cancel an order
OrderRouter.patch("/:orderId/cancel", protect, cancelOrder);

export default OrderRouter;