import type { Request, Response } from "express";
import mongoose from "mongoose";
import Address from "../models/Address.js";

export const getAddresses = async (req: Request, res: Response) => {
  try {
    const addresses = await Address.find({ user: req.user._id }).sort({
      isDefault: -1,
      createdAt: -1,
    });

    return res.json({ success: true, data: addresses });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAddressById = async (req: Request, res: Response) => {
  try {
    const { addressId } = req.params;

    if (!mongoose.isValidObjectId(addressId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid address ID",
      });
    }

    const address = await Address.findOne({
      _id: addressId,
      user: req.user._id,
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    return res.json({ success: true, data: address });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const createAddress = async (req: Request, res: Response) => {
  try {
    const {
      fullName,
      phone,
      type = "Home",
      street,
      city,
      state,
      zipCode,
      country,
      isDefault = false,
    } = req.body;

    if (
      !fullName?.trim() ||
      !phone?.trim() ||
      !street?.trim() ||
      !city?.trim() ||
      !state?.trim() ||
      !zipCode?.trim() ||
      !country?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "fullName, phone, street, city, state, zipCode and country are required",
      });
    }

    if (!["Home", "Work", "Other"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Address type must be Home, Work, or Other",
      });
    }

    const phoneDigits = String(phone).replace(/\D/g, "");

    if (!/^[6-9]\d{9}$/.test(phoneDigits)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid 10-digit Indian mobile number",
      });
    }

    const address = await Address.create({
      user: req.user._id,
      fullName: fullName.trim(),
      phone: phoneDigits,
      type,
      street: street.trim(),
      city: city.trim(),
      state: state.trim(),
      zipCode: zipCode.trim(),
      country: country.trim(),
      isDefault: Boolean(isDefault),
    });

    if (address.isDefault) {
      await Address.updateMany(
        { user: req.user._id, _id: { $ne: address._id } },
        { $set: { isDefault: false } }
      );
    }

    return res.status(201).json({
      success: true,
      data: address,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateAddress = async (req: Request, res: Response) => {
  try {
    const { addressId } = req.params;

    if (!mongoose.isValidObjectId(addressId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid address ID",
      });
    }

    const address = await Address.findOne({
      _id: addressId,
      user: req.user._id,
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    const {
      fullName,
      phone,
      type,
      street,
      city,
      state,
      zipCode,
      country,
      isDefault,
    } = req.body;

    if (fullName !== undefined) {
      if (typeof fullName !== "string" || !fullName.trim()) {
        return res.status(400).json({
          success: false,
          message: "Full name cannot be empty",
        });
      }
      address.fullName = fullName.trim();
    }

    if (phone !== undefined) {
      const phoneDigits = String(phone).replace(/\D/g, "");

      if (!/^[6-9]\d{9}$/.test(phoneDigits)) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid 10-digit Indian mobile number",
        });
      }
      address.phone = phoneDigits;
    }

    if (type !== undefined) {
      if (!["Home", "Work", "Other"].includes(type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid address type",
        });
      }
      address.type = type;
    }

    if (street !== undefined) address.street = street.trim();
    if (city !== undefined) address.city = city.trim();
    if (state !== undefined) address.state = state.trim();
    if (zipCode !== undefined) address.zipCode = zipCode.trim();
    if (country !== undefined) address.country = country.trim();

    if (isDefault === true) {
      await Address.updateMany(
        { user: req.user._id, _id: { $ne: address._id } },
        { $set: { isDefault: false } }
      );
      address.isDefault = true;
    } else if (isDefault === false) {
      address.isDefault = false;
    }

    await address.save();

    return res.json({ success: true, data: address });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteAddress = async (req: Request, res: Response) => {
  try {
    const { addressId } = req.params;

    if (!mongoose.isValidObjectId(addressId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid address ID",
      });
    }

    const address = await Address.findOneAndDelete({
      _id: addressId,
      user: req.user._id,
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    return res.json({ success: true, data: address });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const setDefaultAddress = async (req: Request, res: Response) => {
  try {
    const { addressId } = req.params;

    if (!mongoose.isValidObjectId(addressId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid address ID",
      });
    }

    const address = await Address.findOne({
      _id: addressId,
      user: req.user._id,
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    await Address.updateMany(
      { user: req.user._id, _id: { $ne: address._id } },
      { $set: { isDefault: false } }
    );

    address.isDefault = true;
    await address.save();

    return res.json({ success: true, data: address });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};