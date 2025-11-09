// /utils/notificationHandler.js
const Notification = require("../models/Notification");

/**
 * Creates a new notification document in the database.
 * @param {string} userId - The ID of the user who will receive the notification.
 * @param {string} message - The notification message.
 * @param {string} [jobId] - Optional: The ID of the related job.
 */
exports.createNotification = async (userId, message, jobId) => {
  try {
    if (!userId || !message) return;

    await Notification.create({
      user: userId,
      message,
      job: jobId,
    });
    console.log(`NOTIFICATION CREATED for user ${userId}: "${message}"`);
  } catch (error) {
    // In a real app, you might use a more robust logger here
    console.error("Failed to create notification:", error);
  }
};
