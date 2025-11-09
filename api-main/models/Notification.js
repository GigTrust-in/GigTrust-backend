// /models/Notification.js

const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    // The user who will receive the notification
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    // The message to be displayed
    message: {
      type: String,
      required: true,
    },
    // A flag to check if the user has seen the notification
    isRead: {
      type: Boolean,
      default: false,
    },
    // Optional: A link to the relevant job to make the notification actionable
    job: {
      type: mongoose.Schema.ObjectId,
      ref: "Job",
    },
  },
  { timestamps: true },
);

const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;
