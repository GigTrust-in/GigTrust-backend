const Job = require("../models/Job");
const User = require("../models/User");

const { createNotification } = require("../utils/notificationHandler");

// Requester: Create a new job
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");


exports.createJob = catchAsync(async (req, res, next) => {
  console.log("=== CREATE JOB START ===");
  console.log("Request Body:", JSON.stringify(req.body, null, 2));
  console.log("Requester User ID:", req.user.id);

  // 1. CREATE THE JOB
  console.log("Step 1: Creating new job in database...");
  const newJob = await Job.create({
    ...req.body,
    requester: req.user.id,
  });
  console.log("Job created successfully:");
  console.log("  - Job ID:", newJob._id);
  console.log("  - Job Type:", newJob.jobType);
  console.log("  - Location:", newJob.location);
  console.log("  - Min Reputation:", newJob.minReputation);
  console.log("  - Payment:", newJob.payment);
  console.log("  - Job Status:", newJob.jobStatus);

  // 2. FIND ALL PROVIDERS (NOT JUST MATCHING ONES)
  console.log("Step 2: Fetching ALL providers for notification...");
  const allProviders = await User.find({
    role: "provider",
  });
  console.log(`Found ${allProviders.length} total provider(s) in the system`);

  if (allProviders.length > 0) {
    console.log("Provider details:");
    allProviders.forEach((provider, index) => {
      console.log(`  Provider ${index + 1}:`, {
        id: provider._id,
        email: provider.email,
        name: provider.name,
        location: provider.location,
        availabilityStatus: provider.availabilityStatus,
        reputation: provider.reputation,
        serviceCategories: provider.serviceCategories,
        hasFCMToken: !!provider.fcmToken
      });
    });
  }

  // 3. CREATE NOTIFICATIONS FOR ALL PROVIDERS
  console.log("Step 3: Creating notifications for ALL providers...");
  if (allProviders.length > 0) {
    const message = `A new job "${newJob.jobType}" is available in your area.`;
    console.log("Notification message:", message);

    // Create an array of notification promises
    const notificationPromises = allProviders.map((provider) => {
      console.log(`  - Queuing notification for provider ${provider._id} (${provider.email})`);
      return createNotification(provider._id, message, newJob._id);
    });

    // Execute all notification creation promises
    console.log("Sending all notifications in parallel...");
    await Promise.all(notificationPromises);

    console.log(
      `✓ Successfully sent job notifications to ${allProviders.length} provider(s).`,
    );
  } else {
    console.log("⚠ No providers found in the system. No notifications sent.");
  }

  // 4. SEND RESPONSE TO THE REQUESTER
  console.log("Step 4: Sending success response to requester");
  res.status(201).json({
    status: "success",
    data: { job: newJob },
  });
  console.log("=== CREATE JOB END ===\n");
});

// Provider: Get available jobs matching location and reputation
exports.getAvailableJobs = async (req, res) => {
  console.log("=== GET AVAILABLE JOBS START ===");
  try {
    const provider = req.user;
    console.log("Provider requesting jobs:", {
      id: provider._id,
      email: provider.email,
      location: provider.location,
      reputation: provider.reputation,
      availabilityStatus: provider.availabilityStatus,
      serviceCategories: provider.serviceCategories
    });

    console.log("Querying jobs with filters:", {
      location: provider.location,
      minReputation: { $lte: provider.reputation },
      jobStatus: "open",
      jobType: { $in: provider.serviceCategories }
    });

    const jobs = await Job.find({
      location: provider.location,
      minReputation: { $lte: provider.reputation },
      jobStatus: "open",
      jobType: { $in: provider.serviceCategories },
    }).populate("requester", "email name");

    console.log(`Found ${jobs.length} matching job(s)`);

    if (provider.availabilityStatus !== "available") {
      console.log("⚠ Provider is not available, returning empty list");
      return res.status(200).json({
        status: "success",
        results: 0,
        data: { jobs: [] }, // Return empty list if unavailable
      });
    }

    console.log("✓ Returning jobs to provider");
    res.status(200).json({
      status: "success",
      results: jobs.length,
      data: { jobs },
    });
    console.log("=== GET AVAILABLE JOBS END ===\n");
  } catch (err) {
    console.error("❌ Error in getAvailableJobs:", err.message);
    res.status(500).json({ status: "error", message: err.message });
  }
};

// Provider: Accept a job
exports.acceptJob = async (req, res) => {
  console.log("=== ACCEPT JOB START ===");
  console.log("Job ID:", req.params.id);
  console.log("Provider ID:", req.user.id);
  console.log("Provider Email:", req.user.email);

  try {
    console.log("Fetching job from database...");
    const job = await Job.findById(req.params.id);

    if (!job) {
      console.log("❌ Job not found");
      return res.status(404).json({ status: "fail", message: "Job not found" });
    }

    console.log("Job details:", {
      id: job._id,
      jobType: job.jobType,
      jobStatus: job.jobStatus,
      requester: job.requester,
      currentProvider: job.provider
    });

    if (job.jobStatus !== "open") {
      console.log(`❌ Job is not available (status: ${job.jobStatus})`);
      return res
        .status(400)
        .json({ status: "fail", message: "Job is not available" });
    }

    console.log("Updating job with provider and status...");
    job.provider = req.user.id;
    job.jobStatus = "accepted";
    await job.save();
    console.log("✓ Job updated successfully");

    // --- ADD NOTIFICATION ---
    console.log("Sending notification to requester...");
    const message = `Your job "${job.jobType}" has been accepted by a provider.`;
    await createNotification(job.requester, message, job._id);
    console.log("✓ Notification sent");
    // ----------------------

    res.status(200).json({
      status: "success",
      message: "Job accepted successfully",
      data: { job },
    });
    console.log("=== ACCEPT JOB END ===\n");
  } catch (err) {
    console.error("❌ Error in acceptJob:", err.message);
    res.status(400).json({ status: "fail", message: err.message });
  }
};

// Provider: Reject a job
exports.rejectJob = async (req, res) => {
  console.log("=== REJECT JOB ===");
  console.log("Job ID:", req.params.id);
  console.log("Provider ID:", req.user.id);
  res.status(200).json({ status: "success", message: "Job rejection noted." });
  console.log("✓ Job rejection noted\n");
};

// Provider: Mark a job as complete from their end
exports.completeJob = async (req, res) => {
  console.log("=== COMPLETE JOB START ===");
  console.log("Job ID:", req.params.id);
  console.log("Provider ID:", req.user.id);

  try {
    console.log("Fetching job assigned to this provider...");
    const job = await Job.findOne({
      _id: req.params.id,
      provider: req.user.id,
    });

    if (!job) {
      console.log("❌ Job not found or provider not assigned");
      return res.status(404).json({
        status: "fail",
        message: "Job not found or you are not assigned to it.",
      });
    }

    console.log("Job details:", {
      id: job._id,
      jobType: job.jobType,
      jobStatus: job.jobStatus,
      requester: job.requester
    });

    if (job.jobStatus !== "accepted") {
      console.log(`❌ Job is not in accepted state (current: ${job.jobStatus})`);
      return res.status(400).json({
        status: "fail",
        message: 'This job is not in an "accepted" state.',
      });
    }

    console.log("Marking job as completed...");
    job.jobStatus = "completed";
    await job.save();
    console.log("✓ Job status updated to completed");

    console.log("Sending notification to requester...");
    const message = `The job "${job.jobType}" has been marked as complete by the provider. Please review and approve.`;
    await createNotification(job.requester, message, job._id);
    console.log("✓ Notification sent");

    res.status(200).json({
      status: "success",
      message: "Job marked as complete. Awaiting requester approval.",
      data: { job },
    });
    console.log("=== COMPLETE JOB END ===\n");
  } catch (err) {
    console.error("❌ Error in completeJob:", err.message);
    res.status(400).json({ status: "fail", message: err.message });
  }
};


// /controllers/jobController.js
exports.approveJob = catchAsync(async (req, res, next) => {
  console.log("=== APPROVE JOB START ===");
  console.log("Job ID:", req.params.id);
  console.log("Requester ID:", req.user.id);

  try {
    console.log("Fetching job...");
    const job = await Job.findOne({
      _id: req.params.id,
      requester: req.user.id,
    });

    if (!job) {
      console.log("❌ Job not found or user is not the requester");
      return res.status(404).json({
        status: "fail",
        message: "Job not found or you are not the requester.",
      });
    }

    console.log("Job details:", {
      id: job._id,
      jobType: job.jobType,
      jobStatus: job.jobStatus,
      paymentStatus: job.paymentStatus,
      provider: job.provider,
      payment: job.payment
    });

    if (job.jobStatus !== "completed") {
      console.log(`❌ Job is not completed (status: ${job.jobStatus})`);
      return res.status(400).json({
        status: "fail",
        message: "This job has not been marked as complete by the provider.",
      });
    }

    if (job.paymentStatus !== "paid") {
      console.log("❌ Job has not been paid for");
      return next(
        new AppError("Cannot approve a job that has not been paid for.", 400),
      );
    }

    // 1. TODO: This is where the smart contract would release funds.
    console.log(
      `ON-CHAIN SIM: Smart contract releasing funds for job ${job._id}.`,
    );

    // 2. Simulate the Off-Ramp Payout to the Provider
    console.log("Processing payout to provider...");
    await paymentHandler.processPayment({
      amount: job.payment,
      description: `Payout for completed job: ${job.jobType}`,
    });
    console.log("✓ Payout processed");

    // 3. Update Provider's reputation
    console.log("Updating provider reputation...");
    await User.findByIdAndUpdate(job.provider, { $inc: { reputation: 1 } });
    console.log("✓ Provider reputation incremented");

    // --- ADD NOTIFICATION ---
    console.log("Sending notification to provider...");
    const message = `Congratulations! Your work on the "${job.jobType}" job has been approved.`;
    await createNotification(job.provider, message, job._id);
    console.log("✓ Notification sent");

    res.status(200).json({
      status: "success",
      message:
        "Job approved, payout processed, and provider reputation updated.",
    });
    console.log("=== APPROVE JOB END ===\n");
  } catch (err) {
    console.error("❌ Error in approveJob:", err.message);
    res.status(400).json({ status: "fail", message: err.message });
  }
});


exports.getMyJobs = catchAsync(async (req, res, next) => {
  console.log("=== GET MY JOBS START ===");
  console.log("User ID:", req.user.id);
  console.log("Query params:", req.query);

  // 1. BUILD THE BASE FILTER OBJECT
  const filter = {
    $or: [{ requester: req.user.id }, { provider: req.user.id }],
  };

  // 2. ADD DYNAMIC FILTERING
  if (req.query.status) {
    filter.jobStatus = req.query.status;
    console.log("Filtering by status:", req.query.status);
  }

  // 3. PAGINATION LOGIC
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 10;
  const skip = (page - 1) * limit;
  console.log("Pagination:", { page, limit, skip });

  // 4. EXECUTE THE QUERY WITH FILTERS AND PAGINATION
  console.log("Querying jobs with filter:", JSON.stringify(filter));
  const jobs = await Job.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("requester", "email name")
    .populate("provider", "email name");

  console.log(`Found ${jobs.length} job(s)`);

  // 5. SEND THE RESPONSE
  res.status(200).json({
    status: "success",
    results: jobs.length,
    data: { jobs },
  });
  console.log("=== GET MY JOBS END ===\n");
});

// /controllers/jobController.js
const paymentHandler = require("../utils/paymentHandler"); // Import our dummy handler

// Requester: "Pays" for the job to fund the escrow
exports.fundJobEscrow = catchAsync(async (req, res, next) => {
  console.log("=== FUND JOB ESCROW START ===");
  console.log("Job ID:", req.params.id);
  console.log("Requester ID:", req.user.id);

  const job = await Job.findOne({ _id: req.params.id, requester: req.user.id });

  if (!job) {
    console.log("❌ Job not found or user is not the requester");
    return next(
      new AppError("Job not found or you are not the requester.", 404),
    );
  }

  console.log("Job details:", {
    id: job._id,
    jobType: job.jobType,
    jobStatus: job.jobStatus,
    paymentStatus: job.paymentStatus,
    payment: job.payment
  });

  if (job.jobStatus !== "accepted") {
    console.log(`❌ Job not accepted yet (status: ${job.jobStatus})`);
    return next(
      new AppError("This job has not been accepted by a provider yet.", 400),
    );
  }
  if (job.paymentStatus === "paid") {
    console.log("❌ Job already paid for");
    return next(new AppError("This job has already been paid for.", 400));
  }

  // 1. Call our dummy payment handler
  console.log(`Processing payment of ${job.payment} INR...`);
  const paymentResult = await paymentHandler.processPayment({
    amount: job.payment,
    description: `Payment for job: ${job.jobType}`,
  });

  if (paymentResult.success) {
    console.log("✓ Payment successful, transaction ID:", paymentResult.transactionId);

    // 2. Update the job status in our database
    job.paymentStatus = "paid";
    job.paymentTransactionId = paymentResult.transactionId;
    await job.save();
    console.log("✓ Job payment status updated");

    // 3. TODO: This is where the on-chain service would be called
    console.log(
      `ON-CHAIN SIM: Funding escrow for job ${job._id} with ${job.payment} INR.`,
    );

    res.status(200).json({
      status: "success",
      message: "Payment successful and escrow has been funded.",
      data: { job },
    });
    console.log("=== FUND JOB ESCROW END ===\n");
  } else {
    console.log("❌ Payment failed");
    return next(new AppError("Payment failed. Please try again.", 400));
  }
});

// Requester: Assign a worker to a job
exports.assignWorker = catchAsync(async (req, res, next) => {
  console.log("=== ASSIGN WORKER START ===");
  console.log("Job ID:", req.params.id);
  console.log("Requester ID:", req.user.id);
  console.log("Worker ID from body:", req.body.workerId);

  const job = await Job.findOne({ _id: req.params.id, requester: req.user.id });

  if (!job) {
    console.log("❌ Job not found or user is not the requester");
    return next(new AppError("Job not found or you are not the requester.", 404));
  }

  console.log("Job details:", {
    id: job._id,
    jobType: job.jobType,
    jobStatus: job.jobStatus
  });

  if (job.jobStatus !== "open") {
    console.log(`❌ Job is not open (status: ${job.jobStatus})`);
    return next(new AppError("Job is not open for assignment.", 400));
  }

  const workerId = req.body.workerId;
  if (!workerId) {
    console.log("❌ No workerId provided");
    return next(new AppError("Please provide a workerId.", 400));
  }

  console.log("Assigning worker to job...");
  job.provider = workerId;
  job.jobStatus = "assigned";
  await job.save();
  console.log("✓ Worker assigned successfully");

  // Notify worker
  console.log("Sending notification to worker...");
  await createNotification(workerId, `You have been assigned to job "${job.jobType}"`, job._id);
  console.log("✓ Notification sent");

  res.status(200).json({
    status: "success",
    data: { job },
  });
  console.log("=== ASSIGN WORKER END ===\n");
});

// Requester: Request revision
exports.requestRevision = catchAsync(async (req, res, next) => {
  console.log("=== REQUEST REVISION START ===");
  console.log("Job ID:", req.params.id);
  console.log("Requester ID:", req.user.id);
  console.log("Feedback:", req.body.feedback);

  const job = await Job.findOne({ _id: req.params.id, requester: req.user.id });

  if (!job) {
    console.log("❌ Job not found or user is not the requester");
    return next(new AppError("Job not found or you are not the requester.", 404));
  }

  console.log("Job details:", {
    id: job._id,
    jobType: job.jobType,
    jobStatus: job.jobStatus,
    provider: job.provider
  });

  if (job.jobStatus !== "completed" && job.jobStatus !== "revision_requested") {
    console.log(`⚠ Job status is ${job.jobStatus}, but allowing revision request`);
  }

  console.log("Updating job status to revision_requested...");
  job.jobStatus = "revision_requested";
  job.feedback = req.body.feedback;
  await job.save();
  console.log("✓ Job status updated");

  // Notify worker
  console.log("Sending notification to provider...");
  await createNotification(job.provider, `Revision requested for job "${job.jobType}": ${req.body.feedback}`, job._id);
  console.log("✓ Notification sent");

  res.status(200).json({
    status: "success",
    data: { job },
  });
  console.log("=== REQUEST REVISION END ===\n");
});

// Worker: Unassign/Cancel
exports.unassignJob = catchAsync(async (req, res, next) => {
  console.log("=== UNASSIGN JOB START ===");
  console.log("Job ID:", req.params.id);
  console.log("Provider ID:", req.user.id);

  const job = await Job.findOne({ _id: req.params.id, provider: req.user.id });

  if (!job) {
    console.log("❌ Job not found or user is not the provider");
    return next(new AppError("Job not found or you are not the provider.", 404));
  }

  console.log("Job details:", {
    id: job._id,
    jobType: job.jobType,
    jobStatus: job.jobStatus,
    requester: job.requester
  });

  console.log("Unassigning provider from job...");
  job.provider = null;
  job.jobStatus = "open";
  await job.save();
  console.log("✓ Provider unassigned, job status set to open");

  // Notify requester
  console.log("Sending notification to requester...");
  await createNotification(job.requester, `Worker cancelled assignment for job "${job.jobType}"`, job._id);
  console.log("✓ Notification sent");

  res.status(200).json({
    status: "success",
    message: "You have unassigned yourself from the job.",
    data: { job },
  });
  console.log("=== UNASSIGN JOB END ===\n");
});

// Requester: Cancel Job
exports.cancelJob = catchAsync(async (req, res, next) => {
  console.log("=== CANCEL JOB START ===");
  console.log("Job ID:", req.params.id);
  console.log("Requester ID:", req.user.id);

  const job = await Job.findOne({ _id: req.params.id, requester: req.user.id });

  if (!job) {
    console.log("❌ Job not found or user is not the requester");
    return next(new AppError("Job not found or you are not the requester.", 404));
  }

  console.log("Job details:", {
    id: job._id,
    jobType: job.jobType,
    jobStatus: job.jobStatus,
    provider: job.provider
  });

  console.log("Cancelling job...");
  job.jobStatus = "cancelled";
  await job.save();
  console.log("✓ Job status set to cancelled");

  if (job.provider) {
    console.log("Sending notification to provider...");
    await createNotification(job.provider, `Job "${job.jobType}" has been cancelled by the requester.`, job._id);
    console.log("✓ Notification sent");
  } else {
    console.log("⚠ No provider assigned, skipping notification");
  }

  res.status(200).json({
    status: "success",
    message: "Job cancelled.",
    data: { job },
  });
  console.log("=== CANCEL JOB END ===\n");
});
