
import dotenv from "dotenv";
import mongoose from "mongoose";
import Product from "../models/Products";

dotenv.config();

const products = [
  {
    name: "Classic Men's T-Shirt",
    description: "Comfortable everyday cotton T-shirt.",
    price: 799,
    images: ["https://res.cloudinary.com/dnkkxdwjt/image/upload/v1791620089/menfit_eersb4.jpg"],
    sizes: ["S", "M", "L", "XL"],
    category: "Men",
    stock: 50,
    rating: 4.5,
    reviews: 128,
    isFeatured: true,
    isActive: true,
  },
  {
    name: "Women's Elegant Dress",
    description: "Elegant dress suitable for casual outings.",
    price: 1899,
    images: ["https://res.cloudinary.com/dnkkxdwjt/image/upload/v1791620089/summerClt_rezgkh.jpg"],
    sizes: ["S", "M", "L"],
    category: "Women",
    stock: 25,
    rating: 4.8,
    reviews: 96,
    isFeatured: true,
    isActive: true,
  },
  {
    name: "Kids Casual Outfit",
    description: "Soft and comfortable outfit for kids.",
    price: 999,
    images: ["https://res.cloudinary.com/dnkkxdwjt/image/upload/v1791620088/frock_btbzdd.jpg"],
    sizes: ["2Y", "4Y", "6Y", "8Y"],
    category: "Kids",
    stock: 30,
    rating: 4.4,
    reviews: 54,
    isFeatured: true,
    isActive: true,
  },
  {
    name: "Classic White Sneakers",
    description: "Versatile sneakers for everyday wear.",
    price: 2499,
    images: ["https://res.cloudinary.com/dnkkxdwjt/image/upload/v1791620090/sneakers_hydry1.jpg"],
    sizes: ["6", "7", "8", "9", "10"],
    category: "Shoes",
    stock: 20,
    rating: 4.7,
    reviews: 182,
    isFeatured: true,
    isActive: true,
  },
  {
    name: "Premium Everyday Handbag",
    description: "Stylish handbag with a spacious interior.",
    price: 1599,
    images: ["https://res.cloudinary.com/dnkkxdwjt/image/upload/v1791620089/red_bag_e115mr.jpg"],
    sizes: ["One Size"],
    category: "Bags",
    stock: 15,
    rating: 4.6,
    reviews: 87,
    isFeatured: true,
    isActive: true,
  },
  {
    name: "Burgundy Printed Tunic",
    description:
      "Stylish burgundy printed women's tunic with a comfortable fit, perfect for casual and everyday wear.",
    price: 1299,
    category: "Women",
    images: ["https://res.cloudinary.com/dnkkxdwjt/image/upload/v1791620089/kurti_auus91.jpg"],
    sizes: ["S", "M", "L", "XL"],
    stock: 25,
    rating: 4.5,
    reviews: 73,
    isFeatured: true,
    isActive: true,
  },
  {
    name: "Black Platform High-Top Sneakers",
    description:
      "Trendy black and white high-top platform sneakers with a bold design for everyday streetwear.",
    price: 2499,
    category: "Shoes",
    images: ["https://res.cloudinary.com/dnkkxdwjt/image/upload/v1791620088/heel_shoe_mf7j7e.jpg"],
    sizes: ["6", "7", "8", "9", "10"],
    stock: 20,
    rating: 4.6,
    reviews: 64,
    isFeatured: true,
    isActive: true,
  },
  {
    name: "Black and White Varsity Jacket",
    description:
      "Classic black and white varsity jacket with a sporty look, ideal for casual outfits.",
    price: 1999,
    category: "Men",
    images: ["https://res.cloudinary.com/dnkkxdwjt/image/upload/v1791620088/jacket_ej5qw9.jpg"],
    sizes: ["S", "M", "L", "XL"],
    stock: 15,
    rating: 4.3,
    reviews: 41,
    isFeatured: false,
    isActive: true,
  },
  {
    name: "Burgundy Gold-Heel Pumps",
    description:
      "Elegant burgundy pumps featuring a sophisticated gold-tone heel for parties and special occasions.",
    price: 2799,
    category: "Shoes",
    images: ["https://res.cloudinary.com/dnkkxdwjt/image/upload/v1791620088/heel_dm59rw.jpg"],
    sizes: ["5", "6", "7", "8", "9"],
    stock: 12,
    rating: 4.8,
    reviews: 112,
    isFeatured: true,
    isActive: true,
  },
  {
    name: "Burgundy Patent Slingback Heels",
    description:
      "Glossy burgundy slingback stilettos with a pointed toe and elegant design for evening wear.",
    price: 3199,
    category: "Shoes",
    images: ["https://res.cloudinary.com/dnkkxdwjt/image/upload/v1791620088/cherry_heels_aowupk.jpg"],
    sizes: ["5", "6", "7", "8", "9"],
    stock: 10,
    rating: 4.7,
    reviews: 89,
    isFeatured: true,
    isActive: true,
  },
];

async function seedProducts() {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error(
        "MONGODB_URI is missing from the server .env file"
      );
    }

    await mongoose.connect(mongoUri);

    for (const product of products) {
      await Product.updateOne(
        { name: product.name },
        { $set: product },
        { upsert: true, runValidators: true }
      );
    }

    console.log(
      `Successfully seeded ${products.length} products with ratings and reviews.`
    );
  } catch (error) {
    console.error("Product seeding failed:", error);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

seedProducts();
