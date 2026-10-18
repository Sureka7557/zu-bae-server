
import mongoose, {
  Schema,
  type Model,
  type InferSchemaType,
} from "mongoose";

const reviewSchema = new Schema(
  {
    clerkId: {
      type: String,
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    selectedTags: {
      type: [String],
      default: [],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export type IReview = InferSchemaType<typeof reviewSchema>;

const Review: Model<IReview> =
  (mongoose.models.Review as Model<IReview> | undefined) ??
  mongoose.model<IReview>("Review", reviewSchema);

export default Review;
