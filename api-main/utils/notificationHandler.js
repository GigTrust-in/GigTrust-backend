// /utils/notificationHandler.js
const Notification = require("../models/Notification");
const User = require("../models/User");
const fcmService = require("./fcmService");

/**
 * Creates a new notification document in the database and sends a push notification.
 * @param {string} userId - The ID of the user who will receive the notification.
 * @param {string} message - The notification message.
 * @param {string} [jobId] - Optional: The ID of the related job.
 */
exports.createNotification = async (userId, message, jobId) => {
  try {
    if (!userId || !message) return;

    // Create database notification
    await Notification.create({
      user: userId,
      message,
      job: jobId,
    });
    console.log(`NOTIFICATION CREATED for user ${userId}: "${message}"`);

    // Send FCM push notification
    const user = await User.findById(userId).select("fcmToken");
    if (user && user.fcmToken) {
      await fcmService.sendPushNotification(
        user.fcmToken,
        "GigTrust Notification",
        message,
        { jobId: jobId || "" }
      );
    }
  } catch (error) {
    // In a real app, you might use a more robust logger here
    console.error("Failed to create notification:", error);
  }
};

