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
  console.log("--- createNotification START ---");
  console.log("Target user ID:", userId);
  console.log("Message:", message);
  console.log("Job ID:", jobId || "(none)");

  try {
    if (!userId || !message) {
      console.log("⚠ Missing userId or message, skipping notification");
      return;
    }

    // Create database notification
    console.log("Creating notification in database...");
    await Notification.create({
      user: userId,
      message,
      job: jobId,
    });
    console.log(`NOTIFICATION CREATED for user ${userId}: "${message}"`);

    // Send FCM push notification
    console.log("Fetching user FCM token...");
    const user = await User.findById(userId).select("fcmToken");
    if (user && user.fcmToken) {
      console.log("✓ FCM token found, sending push notification...");
      await fcmService.sendPushNotification(
        user.fcmToken,
        "GigTrust Notification",
        message,
        { jobId: jobId || "" }
      );
      console.log("✓ Push notification sent");
    } else {
      console.log("⚠ No FCM token found for user, skipping push notification");
    }
    console.log("--- createNotification END ---\n");
  } catch (error) {
    console.error("❌ Failed to create notification:", error.message);
    console.error("Stack trace:", error.stack);
  }
};

