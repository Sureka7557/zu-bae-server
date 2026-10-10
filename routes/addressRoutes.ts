import { Router } from "express";
import {
  getAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "../controllers/addressControllers.js";
import { protect } from "../middleware/auth.js";

const AddressRouter = Router();

// Get all addresses for the logged-in user
AddressRouter.get("/", protect, getAddresses);

// Create a new address
AddressRouter.post("/", protect, createAddress);

// Get a single address by id
AddressRouter.get("/:addressId", protect, getAddressById);

// Update an address
AddressRouter.put("/:addressId", protect, updateAddress);

// Delete an address
AddressRouter.delete("/:addressId", protect, deleteAddress);

// Set an address as the default
AddressRouter.patch("/:addressId/default", protect, setDefaultAddress);

export default AddressRouter;