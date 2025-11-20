const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
    {
        review: {
            type: String,
            required: [true, "Review cannot be empty!"],
        },
        rating: {
            type: Number,
            min: 1,
            max: 5,
            required: [true, "Rating is required"],
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
        job: {
            type: mongoose.Schema.ObjectId,
            ref: "Job",
            required: [true, "Review must belong to a job."],
        },
        user: {
            type: mongoose.Schema.ObjectId,
            ref: "User",
            required: [true, "Review must belong to a user (author)."],
        },
        targetUser: {
            type: mongoose.Schema.ObjectId,
            ref: "User",
            required: [true, "Review must be for a user."],
        },
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Populate user info
reviewSchema.pre(/^find/, function (next) {
    this.populate({
        path: "user",
        select: "name photo",
    });
    next();
});

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
