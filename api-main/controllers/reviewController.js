const Review = require("../models/Review");
const User = require("../models/User");
const Job = require("../models/Job");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

exports.getAllReviews = catchAsync(async (req, res, next) => {
    console.log("=== GET ALL REVIEWS START ===");
    let filter = {};
    if (req.params.userId) {
        filter = { targetUser: req.params.userId };
        console.log("Filtering reviews for user:", req.params.userId);
    } else {
        console.log("Fetching all reviews (no filter)");
    }

    const reviews = await Review.find(filter);
    console.log(`Found ${reviews.length} review(s)`);

    res.status(200).json({
        status: "success",
        results: reviews.length,
        data: {
            reviews,
        },
    });
    console.log("=== GET ALL REVIEWS END ===\n");
});

exports.createReview = catchAsync(async (req, res, next) => {
    console.log("=== CREATE REVIEW START ===");
    console.log("User ID:", req.user.id);
    console.log("Job ID:", req.body.job || req.params.jobId);
    console.log("Review data:", { rating: req.body.rating, comment: req.body.comment });

    // Allow nested routes
    if (!req.body.job) req.body.job = req.params.jobId;
    if (!req.body.user) req.body.user = req.user.id;

    // Check if job exists and user is authorized
    console.log("Fetching job details...");
    const job = await Job.findById(req.body.job);
    if (!job) {
        console.log("❌ Job not found");
        return next(new AppError("No job found with that ID", 404));
    }

    console.log("Job details:", {
        id: job._id,
        requester: job.requester,
        provider: job.provider
    });

    // Ensure review is for the other party
    if (req.user.id === job.requester.toString()) {
        req.body.targetUser = job.provider;
        console.log("Requester reviewing provider:", job.provider);
    } else if (req.user.id === job.provider.toString()) {
        req.body.targetUser = job.requester;
        console.log("Provider reviewing requester:", job.requester);
    } else {
        console.log("❌ User is not part of this job");
        return next(new AppError("You are not part of this job.", 403));
    }

    console.log("Creating review...");
    const newReview = await Review.create(req.body);
    console.log("✓ Review created successfully:", newReview._id);

    res.status(201).json({
        status: "success",
        data: {
            review: newReview,
        },
    });
    console.log("=== CREATE REVIEW END ===\n");
});
