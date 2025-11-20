const Review = require("../models/Review");
const User = require("../models/User");
const Job = require("../models/Job");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

exports.getAllReviews = catchAsync(async (req, res, next) => {
    let filter = {};
    if (req.params.userId) filter = { targetUser: req.params.userId };

    const reviews = await Review.find(filter);

    res.status(200).json({
        status: "success",
        results: reviews.length,
        data: {
            reviews,
        },
    });
});

exports.createReview = catchAsync(async (req, res, next) => {
    // Allow nested routes
    if (!req.body.job) req.body.job = req.params.jobId;
    if (!req.body.user) req.body.user = req.user.id;

    // Check if job exists and user is authorized
    const job = await Job.findById(req.body.job);
    if (!job) return next(new AppError("No job found with that ID", 404));

    // Ensure review is for the other party
    if (req.user.id === job.requester.toString()) {
        req.body.targetUser = job.provider;
    } else if (req.user.id === job.provider.toString()) {
        req.body.targetUser = job.requester;
    } else {
        return next(new AppError("You are not part of this job.", 403));
    }

    const newReview = await Review.create(req.body);

    // Update user reputation/rating logic here if needed (simple average)
    // For now just saving the review

    res.status(201).json({
        status: "success",
        data: {
            review: newReview,
        },
    });
});
