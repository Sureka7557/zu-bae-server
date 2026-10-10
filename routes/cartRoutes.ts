import { Router } from "express";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from "../controllers/cartControllers.js";
import { protect } from "../middleware/auth.js";

const CartRouter = Router();

// Get user's cart
CartRouter.get("/", protect, getCart);

// Add item to cart
CartRouter.post("/add", protect, addToCart);

// Update cart item quantity
CartRouter.put("/item/:itemId", protect, updateCartItem);

// Remove item from cart
CartRouter.delete("/item/:itemId", protect, removeFromCart);

// Clear cart
CartRouter.delete("/", protect, clearCart);

export default CartRouter;