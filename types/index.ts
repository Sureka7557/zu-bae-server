import { Document, Types } from "mongoose";

export interface IUser {
  name?: string;
  email: string;
  clerkId?: string;
  image?: string;
  role: "user" | "admin";
  createdAt?: Date;
  updatedAt?: Date;
}
export interface IProduct {
  name: string;
  description: string;
  price: number;
  images: string[];
  sizes: string[];
  category:
    | "Men"
    | "Women"
    | "Kids"
    | "Shoes"
    | "Bags"
    | "Other";
  stock: number;
  rating: number;
  reviews: number;
  isFeatured: boolean;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
export interface ICartItem {
  _id?: Types.ObjectId;
	product: Types.ObjectId;
	quantity: number;
	price: number;
	size?: string;
}
 
export interface ICart extends Document {
	user: Types.ObjectId;
	items: ICartItem[];
	totalAmount: number;
	createdAt: Date;
	updatedAt: Date;
	calculateTotal(): number;
}

export interface IOrderItem {
	product: Types.ObjectId;
	name?: string;
	quantity: number;
	price: number;
	size?: string;
}

export interface IShippingAddress {
	street: string;
	city: string;
	state: string;
	zipCode: string;
	country: string;
}

export interface IOrder extends Document {
	user: Types.ObjectId;
	orderNumber?: string;
	items: IOrderItem[];
	shippingAddress: IShippingAddress;
	paymentMethod: "cash" | "stripe";
	paymentStatus: "pending" | "paid" | "failed" | "refunded";
	paymentIntentId?: string;
	orderStatus:
		| "placed"
		| "processing"
		| "shipped"
		| "delivered"
		| "cancelled";
	subtotal: number;
	shippingCost: number;
	tax: number;
	totalAmount: number;
	notes?: string;
	deliveredAt?: Date;
	createdAt: Date;
	updatedAt: Date;
}

export interface IAddress extends Document {
  user: Types.ObjectId;
  fullName: string;
  phone: string;
  type: "Home" | "Work" | "Other";
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
  createdAt: Date;
}