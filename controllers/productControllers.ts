import type { Request, Response } from "express";
import mongoose from "mongoose";
import Product from "../models/Products.js";
import cloudinary from "../config/cloudinary.js";

// ============================================================
// CLOUDINARY UPLOAD HELPER
// ============================================================

const uploadToCloudinary = (
  buffer: Buffer,
  folder = "ecommerce/products"
): Promise<{
  secure_url: string;
  public_id: string;
}> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result) {
          reject(new Error("Cloudinary upload failed"));
          return;
        }

        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );

    uploadStream.end(buffer);
  });
};

// ============================================================
// DELETE IMAGE FROM CLOUDINARY
// ============================================================

const deleteFromCloudinary = async (
  publicId: string
) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error(
      "Cloudinary delete error:",
      error
    );
  }
};

// ============================================================
// GET ALL PRODUCTS
// GET /api/products
// ============================================================

export const getProducts = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      page = "1",
      limit = "12",
      search,
      category,
      minPrice,
      maxPrice,
      sort,
      isActive,
    } = req.query as Record<
      string,
      string | undefined
    >;

    const pageNum = Math.max(
      parseInt(page || "1", 10) || 1,
      1
    );

    const requestedLimit =
      parseInt(limit || "12", 10) || 12;

    const limitNum = Math.min(
      Math.max(requestedLimit, 1),
      100
    );

    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, any> = {};

    // Default: active products
    if (isActive === "all") {
      // Don't filter by isActive
    } else if (isActive === "false") {
      filter.isActive = false;
    } else {
      filter.isActive = true;
    }

    // Category
    if (category) {
      filter.category = category;
    }

    // Price
    if (minPrice || maxPrice) {
      filter.price = {};

      if (minPrice) {
        const min = Number(minPrice);

        if (!Number.isNaN(min)) {
          filter.price.$gte = min;
        }
      }

      if (maxPrice) {
        const max = Number(maxPrice);

        if (!Number.isNaN(max)) {
          filter.price.$lte = max;
        }
      }
    }

    // Search
    if (search?.trim()) {
      filter.$text = {
        $search: search.trim(),
      };
    }

    // Sort
    let sortOption: Record<string, 1 | -1> = {
      createdAt: -1,
    };

    switch (sort) {
      case "price_asc":
        sortOption = { price: 1 };
        break;

      case "price_desc":
        sortOption = { price: -1 };
        break;

      case "oldest":
        sortOption = { createdAt: 1 };
        break;

      case "newest":
        sortOption = { createdAt: -1 };
        break;

      case "name_asc":
        sortOption = { name: 1 };
        break;

      case "name_desc":
        sortOption = { name: -1 };
        break;
    }

    const [products, total] =
      await Promise.all([
        Product.find(filter)
          .sort(sortOption)
          .skip(skip)
          .limit(limitNum),

        Product.countDocuments(filter),
      ]);

    res.status(200).json({
      success: true,
      data: products,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(
          total / limitNum
        ),
      },
    });
  } catch (error: any) {
    console.error(
      "Get products error:",
      error?.message || error
    );

    res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Failed to fetch products",
    });
  }
};

// ============================================================
// GET SINGLE PRODUCT
// GET /api/products/:id
// ============================================================

export const getProduct = async (
  req: Request,
  res: Response
) => {
  try {
    const id = req.params.id;

    if (typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product =
      await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Failed to fetch product",
    });
  }
};

// ============================================================
// GET FEATURED PRODUCTS
// GET /api/products/featured
// ============================================================

export const getFeaturedProducts = async (
  req: Request,
  res: Response
) => {
  try {
    const requestedLimit =
      parseInt(
        req.query.limit as string,
        10
      ) || 8;

    const limit = Math.min(
      Math.max(requestedLimit, 1),
      50
    );

    const products =
      await Product.find({
        isFeatured: true,
        isActive: true,
      })
        .sort({ createdAt: -1 })
        .limit(limit);

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Failed to fetch featured products",
    });
  }
};

// ============================================================
// CREATE PRODUCT
// POST /api/products
// Content-Type: multipart/form-data
//
// Images field:
// files[] → "images"
// ============================================================

export const createProduct = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      name,
      description,
      price,
      sizes,
      category,
      stock,
      isFeatured,
      isActive,
    } = req.body;

    // --------------------------------------------------------
    // Required fields
    // --------------------------------------------------------

    if (
      !name ||
      !description ||
      price === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "name, description, and price are required",
      });
    }

    // --------------------------------------------------------
    // Price
    // --------------------------------------------------------

    const productPrice = Number(price);

    if (
      Number.isNaN(productPrice) ||
      productPrice < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Price must be a valid number",
      });
    }

    // --------------------------------------------------------
    // Stock
    // --------------------------------------------------------

    const productStock =
      stock === undefined
        ? 0
        : Number(stock);

    if (
      Number.isNaN(productStock) ||
      productStock < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Stock must be 0 or greater",
      });
    }

    // --------------------------------------------------------
    // Upload images to Cloudinary
    // --------------------------------------------------------

    const files =
      req.files as Express.Multer.File[] | undefined;

    const imageUrls: string[] = [];
    const uploadedPublicIds: string[] = [];

    if (files && files.length > 0) {
      for (const file of files) {
        const uploaded =
          await uploadToCloudinary(
            file.buffer
          );

        imageUrls.push(
          uploaded.secure_url
        );

        uploadedPublicIds.push(
          uploaded.public_id
        );
      }
    }

    // --------------------------------------------------------
    // Parse sizes
    // --------------------------------------------------------

    let productSizes: string[] = [];

    if (Array.isArray(sizes)) {
      productSizes = sizes;
    } else if (typeof sizes === "string") {
      try {
        const parsed = JSON.parse(sizes);

        if (Array.isArray(parsed)) {
          productSizes = parsed;
        } else {
          productSizes = sizes
            .split(",")
            .map((size: string) =>
              size.trim()
            )
            .filter(Boolean);
        }
      } catch {
        productSizes = sizes
          .split(",")
          .map((size: string) =>
            size.trim()
          )
          .filter(Boolean);
      }
    }

    // --------------------------------------------------------
    // Create product
    // --------------------------------------------------------

    try {
      const product =
        await Product.create({
          name: String(name).trim(),

          description:
            String(description).trim(),

          price: productPrice,

          images: imageUrls,

          sizes: productSizes,

          category:
            category || "Other",

          stock: productStock,

          isFeatured:
            isFeatured === true ||
            isFeatured === "true",

          isActive:
            isActive === undefined
              ? true
              : isActive === true ||
                isActive === "true",
        });

      res.status(201).json({
        success: true,
        message:
          "Product created successfully",
        data: product,
      });
    } catch (dbError) {
      // If MongoDB creation fails after Cloudinary
      // upload, remove uploaded images.
      for (const publicId of uploadedPublicIds) {
        await deleteFromCloudinary(
          publicId
        );
      }

      throw dbError;
    }
  } catch (error: any) {
    console.error(
      "Create product error:",
      error?.message || error
    );

    res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Failed to create product",
    });
  }
};

// ============================================================
// UPDATE PRODUCT
// PUT /api/products/:id
// ============================================================

export const updateProduct = async (
  req: Request,
  res: Response
) => {
  try {
    const id = req.params.id;

    if (typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product =
      await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const allowedFields = [
      "name",
      "description",
      "price",
      "sizes",
      "category",
      "stock",
      "isFeatured",
      "isActive",
    ];

    const updates: Record<string, any> =
      {};

    for (const field of allowedFields) {
      if (
        req.body[field] !== undefined
      ) {
        updates[field] =
          req.body[field];
      }
    }

    // --------------------------------------------------------
    // Price
    // --------------------------------------------------------

    if (updates.price !== undefined) {
      const price = Number(
        updates.price
      );

      if (
        Number.isNaN(price) ||
        price < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Price must be a valid number",
        });
      }

      updates.price = price;
    }

    // --------------------------------------------------------
    // Stock
    // --------------------------------------------------------

    if (updates.stock !== undefined) {
      const stock = Number(
        updates.stock
      );

      if (
        Number.isNaN(stock) ||
        stock < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Stock must be 0 or greater",
        });
      }

      updates.stock = stock;
    }

    // --------------------------------------------------------
    // Sizes
    // --------------------------------------------------------

    if (
      typeof updates.sizes === "string"
    ) {
      try {
        const parsed = JSON.parse(
          updates.sizes
        );

        if (Array.isArray(parsed)) {
          updates.sizes = parsed;
        }
      } catch {
        updates.sizes = updates.sizes
          .split(",")
          .map((size: string) =>
            size.trim()
          )
          .filter(Boolean);
      }
    }

    // --------------------------------------------------------
    // Upload new images
    // --------------------------------------------------------

    const files =
      req.files as Express.Multer.File[] | undefined;

    if (files && files.length > 0) {
      const newImageUrls: string[] =
        [];

      for (const file of files) {
        const uploaded =
          await uploadToCloudinary(
            file.buffer
          );

        newImageUrls.push(
          uploaded.secure_url
        );
      }

      // Add new images to existing images
      updates.images = [
        ...(product.images || []),
        ...newImageUrls,
      ];
    }

    // --------------------------------------------------------
    // Update
    // --------------------------------------------------------

    if (
      Object.keys(updates).length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "No valid fields provided for update",
      });
    }

    const updatedProduct =
      await Product.findByIdAndUpdate(
        id,
        {
          $set: updates,
        },
        {
          new: true,
          runValidators: true,
        }
      );

    res.status(200).json({
      success: true,
      message:
        "Product updated successfully",
      data: updatedProduct,
    });
  } catch (error: any) {
    console.error(
      "Update product error:",
      error?.message || error
    );

    res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Failed to update product",
    });
  }
};

// ============================================================
// DELETE PRODUCT
// DELETE /api/products/:id
// ============================================================

export const deleteProduct = async (
  req: Request,
  res: Response
) => {
  try {
    const id = req.params.id;

    if (typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product =
      await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      message:
        "Product deleted successfully",
    });
  } catch (error: any) {
    console.error(
      "Delete product error:",
      error?.message || error
    );

    res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Failed to delete product",
    });
  }
};

// ============================================================
// UPDATE STOCK
// PATCH /api/products/:id/stock
//
// Body:
// {
//   quantity: 5
// }
//
// +5 = add
// -5 = remove
// ============================================================

export const updateProductStock = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (
  typeof id !== "string" ||
  !mongoose.Types.ObjectId.isValid(id)
  ) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    if (
      typeof quantity !== "number" ||
      !Number.isFinite(quantity)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "quantity must be a valid number",
      });
    }

    const product =
      await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const newStock =
      product.stock + quantity;

    if (newStock < 0) {
      return res.status(400).json({
        success: false,
        message: "Insufficient stock",
      });
    }

    product.stock = newStock;

    await product.save();

    res.status(200).json({
      success: true,
      message:
        "Stock updated successfully",
      data: product,
    });
  } catch (error: any) {
    console.error(
      "Update stock error:",
      error?.message || error
    );

    res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Failed to update stock",
    });
  }
};