import type { Request, Response } from "express";
import Cart from "../models/Cart.js";
import Product from "../models/Products.js";


export const getCart = async (req: Request, res: Response) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id }).populate(
      "items.product"
    );

    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    res.json({ success: true, data: cart });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const addToCart = async (req: Request, res: Response) => {
  try {
    const { productId, quantity = 1, size } = req.body;

    if (!productId) {
      return res
        .status(400)
        .json({ success: false, message: "productId is required" });
    }

    const product = await Product.findById(productId);

    if (!product || !product.isActive) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    if (product.stock < quantity) {
      return res
        .status(400)
        .json({ success: false, message: "Not enough stock available" });
    }

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    const existingItem = cart.items.find(
      (item) =>
        item.product.toString() === productId && item.size === size
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        product: productId,
        quantity,
        price: product.price,
        size,
      });
    }

    cart.calculateTotal();
    await cart.save();

    const populatedCart = await cart.populate("items.product");

    res.status(201).json({ success: true, data: populatedCart });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const updateCartItem = async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (typeof quantity !== "number" || quantity < 1) {
      return res
        .status(400)
        .json({ success: false, message: "quantity must be at least 1" });
    }

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    const item = cart.items.find((item) => item._id?.toString() === itemId);

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Cart item not found" });
    }

    const product = await Product.findById(item.product);

    if (!product || product.stock < quantity) {
      return res
        .status(400)
        .json({ success: false, message: "Not enough stock available" });
    }

    item.quantity = quantity;
    cart.calculateTotal();
    await cart.save();

    const populatedCart = await cart.populate("items.product");

    res.json({ success: true, data: populatedCart });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const removeFromCart = async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    cart.items = cart.items.filter(
      (item) => item._id?.toString() !== itemId
    );

    cart.calculateTotal();
    await cart.save();

    const populatedCart = await cart.populate("items.product");

    res.json({ success: true, data: populatedCart });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const clearCart = async (req: Request, res: Response) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    cart.items = [];
    cart.totalAmount = 0;
    await cart.save();

    res.json({ success: true, data: cart });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};