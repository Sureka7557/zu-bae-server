import type { Request, Response } from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import Product from "../models/Products.js";
import Order from "../models/Order.js";
import cloudinary from "../config/cloudinary.js";
import { updateProduct } from "./productControllers.js";

const DAY = 24 * 60 * 60 * 1000;
const ORDER_STATUSES = ["placed", "processing", "shipped", "delivered", "cancelled"];

const percentChange = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
};

const fail = (res: Response, error: any, fallback: string, status = 500) =>
  res.status(status).json({ success: false, message: error?.message || fallback });

// ------------------------------------------------------------
// GET /api/admin/stats
// ------------------------------------------------------------
export const getDashboardStats = async (_req: Request, res: Response) => {
  try {
    const now = Date.now();
    const d30 = new Date(now - 30 * DAY);
    const d60 = new Date(now - 60 * DAY);
    const soon = new Date(now + 60_000);
    const live = { orderStatus: { $ne: "cancelled" } };
    const customersOnly = { role: { $ne: "admin" } };

    const windowTotals = (from: Date, to: Date) =>
      Order.aggregate([
        { $match: { ...live, createdAt: { $gte: from, $lt: to } } },
        { $group: { _id: null, revenue: { $sum: "$totalAmount" }, orders: { $sum: 1 } } },
      ]);

    const [
      totalCustomers,
      totalProducts,
      totalOrders,
      allTime,
      current,
      previous,
      newCustomers,
      prevCustomers,
      recentOrders,
    ] = await Promise.all([
      User.countDocuments(customersOnly),
      Product.countDocuments(),
      Order.countDocuments(),
      Order.aggregate([{ $match: live }, { $group: { _id: null, revenue: { $sum: "$totalAmount" } } }]),
      windowTotals(d30, soon),
      windowTotals(d60, d30),
      User.countDocuments({ ...customersOnly, createdAt: { $gte: d30 } }),
      User.countDocuments({ ...customersOnly, createdAt: { $gte: d60, $lt: d30 } }),
      Order.find().sort({ createdAt: -1 }).limit(5).populate("user", "name email").lean(),
    ]);

    const revenue30d = current[0]?.revenue ?? 0;
    const orders30d = current[0]?.orders ?? 0;

    res.json({
      success: true,
      data: {
        totalUsers: totalCustomers,
        totalProducts,
        totalOrders,
        totalRevenue: allTime[0]?.revenue ?? 0,
        revenue30d,
        orders30d,
        deltas: {
          revenue: percentChange(revenue30d, previous[0]?.revenue ?? 0),
          orders: percentChange(orders30d, previous[0]?.orders ?? 0),
          customers: percentChange(newCustomers, prevCustomers),
        },
        recentOrders,
      },
    });
  } catch (error: any) {
    fail(res, error, "Failed to load stats");
  }
};

// ------------------------------------------------------------
// GET /api/admin/products  (includes hidden / inactive products)
// ------------------------------------------------------------
export const getAdminProducts = async (_req: Request, res: Response) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 }).limit(1000).lean();
    res.json({ success: true, data: products });
  } catch (error: any) {
    fail(res, error, "Failed to load products");
  }
};

// ------------------------------------------------------------
// PUT /api/admin/products/:id
// Same as the normal update, plus `removeImages` (JSON array of image
// URLs) so the dashboard can delete images. Removed images are also
// deleted from Cloudinary on a best-effort basis.
// ------------------------------------------------------------
const parseList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      /* not JSON */
    }
  }
  return [];
};

const publicIdFromUrl = (url: string) =>
  url.match(/\/upload\/(?:v\d+\/)?(.+?)\.[a-zA-Z0-9]+$/)?.[1];

export const updateAdminProduct = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const remove = parseList(req.body?.removeImages);
    if (remove.length > 0) {
      await Product.updateOne({ _id: id }, { $pull: { images: { $in: remove } } } as any);

      for (const url of remove) {
        const publicId = url.includes("res.cloudinary.com") ? publicIdFromUrl(url) : undefined;
        if (publicId) await cloudinary.uploader.destroy(publicId).catch(() => undefined);
      }
    }

    return updateProduct(req, res);
  } catch (error: any) {
    fail(res, error, "Failed to update product");
  }
};

// ------------------------------------------------------------
// GET /api/admin/categories
// Categories are an enum on the Product model, so we list those values
// with a product count for each.
// ------------------------------------------------------------
export const getAdminCategories = async (_req: Request, res: Response) => {
  try {
    const names: string[] =
      (Product.schema.path("category") as any)?.enumValues ?? ["Men", "Women", "Kids", "Shoes", "Bags", "Other"];

    const counts = await Product.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]);
    const byName = new Map<string, number>(counts.map((c) => [c._id as string, c.count as number]));

    res.json({
      success: true,
      data: names.map((name) => ({ name, productCount: byName.get(name) ?? 0 })),
    });
  } catch (error: any) {
    fail(res, error, "Failed to load categories");
  }
};

// ------------------------------------------------------------
// GET /api/admin/orders
// ------------------------------------------------------------
export const getAdminOrders = async (_req: Request, res: Response) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(1000)
      .populate("user", "name email")
      .lean();

    res.json({ success: true, data: orders });
  } catch (error: any) {
    fail(res, error, "Failed to load orders");
  }
};

// ------------------------------------------------------------
// PATCH /api/admin/orders/:orderId/status   body: { orderStatus }
// Cancelling restocks the items, like the customer-facing cancel does.
// ------------------------------------------------------------
export const updateAdminOrderStatus = async (req: Request, res: Response) => {
  try {
    const orderId = String(req.params.orderId);
    const { orderStatus } = req.body as { orderStatus?: string };

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: "Invalid order ID" });
    }
    if (!orderStatus || !ORDER_STATUSES.includes(orderStatus)) {
      return res.status(400).json({ success: false, message: "Invalid order status" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.orderStatus === "cancelled") {
      return res.status(400).json({ success: false, message: "A cancelled order can't be changed" });
    }
    if (orderStatus === "cancelled" && ["shipped", "delivered"].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `An order that is ${order.orderStatus} can't be cancelled`,
      });
    }

    order.orderStatus = orderStatus as typeof order.orderStatus;
    if (orderStatus === "delivered") order.deliveredAt = new Date();
    await order.save();

    if (orderStatus === "cancelled") {
      await Promise.all(
        order.items.map((item) =>
          Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } })
        )
      );
    }

    await order.populate("user", "name email");
    res.json({ success: true, data: order });
  } catch (error: any) {
    fail(res, error, "Failed to update order");
  }
};

// ------------------------------------------------------------
// GET /api/admin/customers  (non-admin users + order count + total spent)
// ------------------------------------------------------------
export const getAdminCustomers = async (_req: Request, res: Response) => {
  try {
    const customers = await User.aggregate([
      { $match: { role: { $ne: "admin" } } },
      {
        $lookup: {
          from: Order.collection.name,
          localField: "_id",
          foreignField: "user",
          as: "orders",
        },
      },
      {
        $project: {
          name: 1,
          email: 1,
          image: 1,
          createdAt: 1,
          ordersCount: { $size: "$orders" },
          totalSpent: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: "$orders",
                    as: "o",
                    cond: { $ne: ["$$o.orderStatus", "cancelled"] },
                  },
                },
                as: "o",
                in: "$$o.totalAmount",
              },
            },
          },
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    res.json({ success: true, data: customers });
  } catch (error: any) {
    fail(res, error, "Failed to load customers");
  }
};
