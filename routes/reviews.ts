import { Router } from "express";
import { getAuth } from "@clerk/express";
import Review from "../models/Review.js";

const router = Router();
const ALLOWED_TAGS = [
  "Overall Service",
  "Customer Support",
  "Speed and Efficiency",
  "Repair Quality",
  "Pickup and Delivery Service",
  "Transparency",
];

// POST /api/reviews — save feedback for the signed-in Clerk user.
router.post("/", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized. Please sign in." });
    }

    const { rating, selectedTags, comment } = req.body ?? {};
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be an integer from 1 to 5." });
    }
    if (
      selectedTags !== undefined &&
      (!Array.isArray(selectedTags) ||
        !selectedTags.every((tag: unknown) => typeof tag === "string" && ALLOWED_TAGS.includes(tag)))
    ) {
      return res.status(400).json({ message: "One or more selected feedback tags are invalid." });
    }
    if (comment !== undefined && typeof comment !== "string") {
      return res.status(400).json({ message: "Comment must be text." });
    }
    if (typeof comment === "string" && comment.trim().length > 2000) {
      return res.status(400).json({ message: "Comment must be 2000 characters or fewer." });
    }

    const review = new Review({
      clerkId: userId,
      rating,
      selectedTags,
      comment,
    });

    await review.save();

    return res.status(201).json({
      message: "Review submitted successfully.",
      review: {
        id: review._id,
        rating: review.rating,
        selectedTags: review.selectedTags,
        comment: review.comment,
        createdAt: review.createdAt,
      },
    });
  } catch (error: any) {
    console.error("CREATE_REVIEW_ERROR:", { name: error?.name, message: error?.message });
    return res.status(500).json({ message: "Failed to save review. Please try again." });
  }
});

export default router;
