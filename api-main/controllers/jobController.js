const Job = require("../models/Job");
const User = require("../models/User");

const { createNotification } = require("../utils/notificationHandler");

// Requester: Create a new job
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");


exports.createJob = catchAsync(async (req, res, next) => {
  // 1. CREATE THE JOB
  const newJob = await Job.create({
    ...req.body,
    requester: req.user.id,
  });

  // 2. FIND ALL RELEVANT PROVIDERS
  // We build a query to find providers who match the job's criteria.
  const matchingProviders = await User.find({
    role: "provider",
    availabilityStatus: "available",
    location: newJob.location,
    reputation: { $gte: newJob.minReputation },
    serviceCategories: { $in: [newJob.jobType] }, // Find if jobType is in their list of services
  });

  // 3. CREATE NOTIFICATIONS FOR EACH MATCHING PROVIDER
  if (matchingProviders.length > 0) {
    const message = `A new job "${newJob.jobType}" is available in your area.`;

    // Create an array of notification promises
    const notificationPromises = matchingProviders.map((provider) => {
      return createNotification(provider._id, message, newJob._id);
    });

    // Execute all notification creation promises
    await Promise.all(notificationPromises);

    console.log(
      `Sent job notifications to ${matchingProviders.length} provider(s).`,
    );
  }

  // 4. SEND RESPONSE TO THE REQUESTER
  res.status(201).json({
    status: "success",
    data: { job: newJob },
  });
});

// Provider: Get available jobs matching location and reputation
exports.getAvailableJobs = async (req, res) => {
  try {
    const provider = req.user;
    const jobs = await Job.find({
      location: provider.location,
      minReputation: { $lte: provider.reputation },
      jobStatus: "open",
      jobType: { $in: provider.serviceCategories },
    }).populate("requester", "email name");

    if (provider.availabilityStatus !== "available") {
      return res.status(200).json({
        status: "success",
        results: 0,
        data: { jobs: [] }, // Return empty list if unavailable
      });
    }

    res.status(200).json({
      status: "success",
      results: jobs.length,
      data: { jobs },
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

// Provider: Accept a job
exports.acceptJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ status: "fail", message: "Job not found" });
    }
    if (job.jobStatus !== "open") {
      return res
        .status(400)
        .json({ status: "fail", message: "Job is not available" });
    }

    job.provider = req.user.id;
    job.jobStatus = "accepted";
    await job.save();

    // --- ADD NOTIFICATION ---
    const message = `Your job "${job.jobType}" has been accepted by a provider.`;
    await createNotification(job.requester, message, job._id);
    // ----------------------

    res.status(200).json({
      status: "success",
      message: "Job accepted successfully",
      data: { job },
    });
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
};

// Provider: Reject a job
exports.rejectJob = async (req, res) => {
  res.status(200).json({ status: "success", message: "Job rejection noted." });
};

// Provider: Mark a job as complete from their end
exports.completeJob = async (req, res) => {
  try {
    const job = await Job.findOne({
      _id: req.params.id,
      provider: req.user.id,
    });

    if (!job) {
      return res.status(404).json({
        status: "fail",
        message: "Job not found or you are not assigned to it.",
      });
    }
    if (job.jobStatus !== "accepted") {
      return res.status(400).json({
        status: "fail",
        message: 'This job is not in an "accepted" state.',
      });
    }

    job.jobStatus = "completed";
    await job.save();

    const message = `The job "${job.jobType}" has been marked as complete by the provider. Please review and approve.`;
    await createNotification(job.requester, message, job._id);

    res.status(200).json({
      status: "success",
      message: "Job marked as complete. Awaiting requester approval.",
      data: { job },
    });
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
};


// /controllers/jobController.js
exports.approveJob = catchAsync(async (req, res, next) => {
  // ... (find the job, check its status as before)
  try {
    const job = await Job.findOne({
      _id: req.params.id,
      requester: req.user.id,
    });

    if (!job) {
      return res.status(404).json({
        status: "fail",
        message: "Job not found or you are not the requester.",
      });
    }
    if (job.jobStatus !== "completed") {
      return res.status(400).json({
        status: "fail",
        message: "This job has not been marked as complete by the provider.",
      });
    }

    if (job.paymentStatus !== "paid") {
      return next(
        new AppError("Cannot approve a job that has not been paid for.", 400),
      );
    }

    // 1. TODO: This is where the smart contract would release funds.
    console.log(
      `ON-CHAIN SIM: Smart contract releasing funds for job ${job._id}.`,
    );

    // 2. Simulate the Off-Ramp Payout to the Provider
    // We can reuse our dummy handler for this simulation.
    await paymentHandler.processPayment({
      amount: job.payment,
      description: `Payout for completed job: ${job.jobType}`,
    });

    // 3. Update Provider's reputation
    await User.findByIdAndUpdate(job.provider, { $inc: { reputation: 1 } });

    // --- ADD NOTIFICATION ---
    const message = `Congratulations! Your work on the "${job.jobType}" job has been approved.`;
    await createNotification(job.provider, message, job._id);

    res.status(200).json({
      status: "success",
      message:
        "Job approved, payout processed, and provider reputation updated.",
    });
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
});


exports.getMyJobs = catchAsync(async (req, res, next) => {
  // 1. BUILD THE BASE FILTER OBJECT
  // This ensures users can only ever see their own jobs
  const filter = {
    $or: [{ requester: req.user.id }, { provider: req.user.id }],
  };

  // 2. ADD DYNAMIC FILTERING
  // If a 'status' query parameter is provided, add it to the filter
  if (req.query.status) {
    filter.jobStatus = req.query.status;
  }

  // 3. PAGINATION LOGIC
  const page = req.query.page * 1 || 1; // Convert to number, default to page 1
  const limit = req.query.limit * 1 || 10; // Convert to number, default to 10 results per page
  const skip = (page - 1) * limit;

  // 4. EXECUTE THE QUERY WITH FILTERS AND PAGINATION
  const jobs = await Job.find(filter)
    .sort({ createdAt: -1 }) // Sort by creation date, newest first
    .skip(skip)
    .limit(limit)
    .populate("requester", "email name")
    .populate("provider", "email name");

  // 5. SEND THE RESPONSE
  res.status(200).json({
    status: "success",
    results: jobs.length,
    data: { jobs },
  });
});

// /controllers/jobController.js
const paymentHandler = require("../utils/paymentHandler"); // Import our dummy handler

// Requester: "Pays" for the job to fund the escrow
exports.fundJobEscrow = catchAsync(async (req, res, next) => {
  const job = await Job.findOne({ _id: req.params.id, requester: req.user.id });

  if (!job) {
    return next(
      new AppError("Job not found or you are not the requester.", 404),
    );
  }
  if (job.jobStatus !== "accepted") {
    return next(
      new AppError("This job has not been accepted by a provider yet.", 400),
    );
  }
  if (job.paymentStatus === "paid") {
    return next(new AppError("This job has already been paid for.", 400));
  }

  // 1. Call our dummy payment handler
  const paymentResult = await paymentHandler.processPayment({
    amount: job.payment,
    description: `Payment for job: ${job.jobType}`,
  });

  if (paymentResult.success) {
    // 2. Update the job status in our database
    job.paymentStatus = "paid";
    job.paymentTransactionId = paymentResult.transactionId;
    await job.save();

    // 3. TODO: This is where the on-chain service would be called
    // to actually move funds into the smart contract escrow.
    // For now, we'll just log it.
    console.log(
      `ON-CHAIN SIM: Funding escrow for job ${job._id} with ${job.payment} INR.`,
    );
    res.status(200).json({
      status: "success",
      message: "Payment successful and escrow has been funded.",
      data: { job },
    });
  } else {
    return next(new AppError("Payment failed. Please try again.", 400));
  }
});

// Requester: Assign a worker to a job
exports.assignWorker = catchAsync(async (req, res, next) => {
  const job = await Job.findOne({ _id: req.params.id, requester: req.user.id });

  if (!job) {
    return next(new AppError("Job not found or you are not the requester.", 404));
  }

  if (job.jobStatus !== "open") {
    return next(new AppError("Job is not open for assignment.", 400));
  }

  const workerId = req.body.workerId;
  if (!workerId) {
    return next(new AppError("Please provide a workerId.", 400));
  }

  job.provider = workerId;
  job.jobStatus = "assigned"; // Or "accepted" if auto-accept? Requirement says "Assigned"
  await job.save();

  // Notify worker
  await createNotification(workerId, `You have been assigned to job "${job.jobType}"`, job._id);

  res.status(200).json({
    status: "success",
    data: { job },
  });
});

// Requester: Request revision
exports.requestRevision = catchAsync(async (req, res, next) => {
  const job = await Job.findOne({ _id: req.params.id, requester: req.user.id });

  if (!job) {
    return next(new AppError("Job not found or you are not the requester.", 404));
  }

  if (job.jobStatus !== "completed" && job.jobStatus !== "revision_requested") {
    // Allow requesting revision if it was completed.
    // Also allow updating feedback if already requested?
    // Requirement says "Updates job status back to Assigned or a specific RevisionRequested state"
    // Let's use revision_requested
  }

  // Ideally should be in "completed" state to request revision? 
  // Or maybe "assigned" if they want to give early feedback?
  // Let's assume it's after completion for now, or if the user wants to push it back.

  job.jobStatus = "revision_requested";
  job.feedback = req.body.feedback;
  await job.save();

  // Notify worker
  await createNotification(job.provider, `Revision requested for job "${job.jobType}": ${req.body.feedback}`, job._id);

  res.status(200).json({
    status: "success",
    data: { job },
  });
});

// Worker: Unassign/Cancel
exports.unassignJob = catchAsync(async (req, res, next) => {
  // Worker cancelling assignment
  const job = await Job.findOne({ _id: req.params.id, provider: req.user.id });

  if (!job) {
    return next(new AppError("Job not found or you are not the provider.", 404));
  }

  job.provider = null;
  job.jobStatus = "open";
  await job.save();

  // Notify requester
  await createNotification(job.requester, `Worker cancelled assignment for job "${job.jobType}"`, job._id);

  res.status(200).json({
    status: "success",
    message: "You have unassigned yourself from the job.",
    data: { job },
  });
});

// Requester: Cancel Job
exports.cancelJob = catchAsync(async (req, res, next) => {
  const job = await Job.findOne({ _id: req.params.id, requester: req.user.id });

  if (!job) {
    return next(new AppError("Job not found or you are not the requester.", 404));
  }

  job.jobStatus = "cancelled";
  await job.save();

  if (job.provider) {
    await createNotification(job.provider, `Job "${job.jobType}" has been cancelled by the requester.`, job._id);
  }

  res.status(200).json({
    status: "success",
    message: "Job cancelled.",
    data: { job },
  });
});
