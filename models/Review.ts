import mongoose, { Document, Schema } from "mongoose";

export interface IReview extends Document {
  clerkId: string;
  rating: number;
  selectedTags: string[];
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    clerkId: { type: String, required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    selectedTags: { type: [String], default: [] },
    comment: { type: String, trim: true, maxlength: 2000, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.Review || mongoose.model<IReview>("Review", reviewSchema);
