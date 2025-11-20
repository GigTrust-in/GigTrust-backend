const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    jobType: {
      type: String,
      required: [true, "Job type is required"],
    },
    description: {
      type: String,
      required: [true, "Job description is required"],
    },
    minReputation: {
      type: Number,
      default: 0,
    },
    payment: {
      type: Number,
      required: [true, "Approximate pay is required"],
    },
    deadline: {
      type: Date,
      required: [true, "Completion deadline is required"],
    },
    location: {
      type: String,
      required: [true, "Work location is required"],
    },
    jobStatus: {
      type: String,
      enum: ["open", "assigned", "accepted", "completed", "revision_requested", "cancelled"],
      default: "open",
    },
    feedback: {
      type: String, // For revision requests
    },
    requester: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    provider: {
      // Assigned when a provider accepts the job
      type: mongoose.Schema.ObjectId,
      ref: "User",
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid",
    },
    paymentTransactionId: {
      type: String,
    },
  },
  { timestamps: true },
);

// Automatically assign a unique ID (Mongoose does this by default with the _id field)

const Job = mongoose.model("Job", jobSchema);
module.exports = Job;
